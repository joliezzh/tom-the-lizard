"use client";

import { useEffect, useRef } from "react";

type CameraFeedProps = {
  onReady: (video: HTMLVideoElement) => void;
  onError: (message: string) => void;
};

/**
 * Asks the browser for the webcam and plays it into a <video>.
 *
 * We only keep the live stream in memory. Nothing is recorded or uploaded.
 */
export function CameraFeed({ onReady, onError }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled || !video) return;
        video.srcObject = stream;
        await video.play();
        onReady(video);
      } catch (error) {
        const denied =
          error instanceof DOMException &&
          (error.name === "NotAllowedError" || error.name === "PermissionDeniedError");
        onError(
          denied
            ? "Camera permission denied. Tom is waiting on the other side of the lock screen."
            : "Could not start the camera. Check that nothing else is using it.",
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onReady, onError]);

  return (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      playsInline
      muted
      autoPlay
      // Mirror like a selfie so moving right feels like moving right.
      style={{ transform: "scaleX(-1)" }}
    />
  );
}
