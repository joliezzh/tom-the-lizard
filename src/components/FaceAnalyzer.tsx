"use client";

import { useEffect, useRef } from "react";
import {
  boundingBoxFromLandmarks,
  toExpressionVector,
} from "@/lib/expressions";
import { drawTrackers, type LandmarkLink } from "@/lib/drawTrackers";
import { classifyPose } from "@/lib/poses";
import type { AnalysisFrame } from "@/lib/types";
import type {
  FaceLandmarker,
  HandLandmarker,
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";

type FaceAnalyzerProps = {
  video: HTMLVideoElement | null;
  onFrame: (frame: AnalysisFrame) => void;
};

const WASM_PATH = "/mediapipe/wasm";
const FACE_MODEL = "/mediapipe/face_landmarker.task";
const HAND_MODEL = "/mediapipe/hand_landmarker.task";

const FACE_TRACK = {
  runningMode: "VIDEO" as const,
  numFaces: 2,
  outputFaceBlendshapes: true,
  minFaceDetectionConfidence: 0.35,
  minFacePresenceConfidence: 0.35,
  minTrackingConfidence: 0.35,
};

const HAND_TRACK = {
  runningMode: "VIDEO" as const,
  numHands: 2,
  minHandDetectionConfidence: 0.35,
  minHandPresenceConfidence: 0.35,
  minTrackingConfidence: 0.35,
};

/**
 * Face Landmarker + Hand Landmarker run every frame (face stays off-canvas).
 * Overlay shows hand skeletons used for matching — not identity.
 */
export function FaceAnalyzer({ video, onFrame }: FaceAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!video) return;
    const media = video;

    let cancelled = false;
    let faces: FaceLandmarker | null = null;
    let hands: HandLandmarker | null = null;
    let raf = 0;
    let lastFaceTs = -1;
    let lastHandTs = -1;
    let handConnections: LandmarkLink[] = [];

    async function setup() {
      const { FaceLandmarker, FilesetResolver, HandLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      handConnections = HandLandmarker.HAND_CONNECTIONS;
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

      try {
        faces = await FaceLandmarker.createFromOptions(fileset, {
          ...FACE_TRACK,
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
        });
      } catch {
        faces = await FaceLandmarker.createFromOptions(fileset, {
          ...FACE_TRACK,
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: "CPU" },
        });
      }

      try {
        hands = await HandLandmarker.createFromOptions(fileset, {
          ...HAND_TRACK,
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
        });
      } catch {
        try {
          hands = await HandLandmarker.createFromOptions(fileset, {
            ...HAND_TRACK,
            baseOptions: { modelAssetPath: HAND_MODEL, delegate: "CPU" },
          });
        } catch {
          hands = null;
        }
      }
    }

    function paint(handLandmarks: NormalizedLandmark[][]) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { videoWidth, videoHeight } = media;
      if (!videoWidth || !videoHeight) return;
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      drawTrackers(ctx, videoWidth, videoHeight, handLandmarks, handConnections);
    }

    function loop() {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      if (!faces || media.readyState < 2) return;

      const timestamp = performance.now();
      if (timestamp <= lastFaceTs) return;

      let handLandmarks: NormalizedLandmark[][] = [];
      if (hands && timestamp > lastHandTs) {
        try {
          handLandmarks = hands.detectForVideo(media, timestamp).landmarks ?? [];
          lastHandTs = timestamp;
        } catch {
          handLandmarks = [];
        }
      }

      let result;
      try {
        result = faces.detectForVideo(media, timestamp);
        lastFaceTs = timestamp;
      } catch {
        return;
      }

      const faceCount = result.faceLandmarks.length;
      if (faceCount === 0) {
        paint(handLandmarks);
        onFrameRef.current({
          status: "none",
          box: null,
          expression: null,
          headTiltDegrees: null,
          gesture: classifyPose(handLandmarks),
        });
        return;
      }

      const landmarks = result.faceLandmarks[0];
      const { expression, headTiltDegrees } = toExpressionVector(
        result.faceBlendshapes[0],
        landmarks,
      );
      paint(handLandmarks);

      onFrameRef.current({
        status: faceCount > 1 ? "multiple" : "one",
        box: boundingBoxFromLandmarks(landmarks),
        expression,
        headTiltDegrees,
        gesture: classifyPose(handLandmarks, landmarks, expression),
      });
    }

    void setup().then(() => {
      if (!cancelled) raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      faces?.close();
      hands?.close();
    };
  }, [video]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ transform: "scaleX(-1)" }}
      aria-hidden
    />
  );
}
