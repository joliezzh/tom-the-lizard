"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { coachingLine, nearWinLine, poseCoachLine } from "@/data/coaching";
import { CameraStage } from "@/components/CameraStage";
import { DebugPanel } from "@/components/DebugPanel";
import { FeatureChecklist } from "@/components/FeatureChecklist";
import { ShareCard } from "@/components/ShareCard";
import { TomOptions } from "@/components/TomOptions";
import { cameraStatusMessage } from "@/lib/cameraStatus";
import { POSE_LABEL } from "@/lib/poses";
import { scoreFeatureGroups, type GroupScore } from "@/lib/featureGroups";
import { captureSelfie, pickRandomTom } from "@/lib/shareCard";
import { becomeTomScore, TOM_MATCH_PERCENT } from "@/lib/similarity";
import { ema } from "@/lib/smoothing";
import type { AnalysisFrame, ExpressionVector, TomMeme } from "@/lib/types";

const WIN_PERCENT = TOM_MATCH_PERCENT;
const HOLD_MS = 1000;

type BecomeTomModeProps = {
  onExit: () => void;
};

export function BecomeTomMode({ onExit }: BecomeTomModeProps) {
  const [target, setTarget] = useState<TomMeme>(() => pickRandomTom());
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [frame, setFrame] = useState<AnalysisFrame | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [groups, setGroups] = useState<GroupScore[]>([]);
  const [coach, setCoach] = useState("Make the face. Become the lizard.");
  const [win, setWin] = useState<{
    percent: number;
    selfie: string;
  } | null>(null);

  const smoothedRef = useRef<ExpressionVector | null>(null);
  const holdStartedRef = useRef<number | null>(null);
  const coachKeyRef = useRef("");
  const targetRef = useRef(target);
  const videoRef = useRef(video);
  const wonRef = useRef(false);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    videoRef.current = video;
  }, [video]);

  const resetLiveState = () => {
    smoothedRef.current = null;
    holdStartedRef.current = null;
    coachKeyRef.current = "";
    setPercent(null);
    setSimilarity(null);
    setGroups([]);
    setCoach("Make the face. Become the lizard.");
  };

  const handleReady = useCallback((element: HTMLVideoElement) => {
    setVideo(element);
  }, []);

  const handleError = useCallback((message: string) => {
    setCameraError(message);
  }, []);

  const handleFrame = useCallback((next: AnalysisFrame) => {
    if (wonRef.current) return;
    setFrame(next);

    const currentTarget = targetRef.current;
    if (!next.expression) {
      smoothedRef.current = null;
      holdStartedRef.current = null;
      setPercent(null);
      setSimilarity(null);
      setGroups([]);
      return;
    }

    const smoothed = ema(smoothedRef.current, next.expression);
    smoothedRef.current = smoothed;

    const scored = becomeTomScore(smoothed, currentTarget, next.gesture);
    const nextGroups = scoreFeatureGroups(smoothed, currentTarget.expression);
    setPercent(scored.percent);
    setSimilarity(scored.similarity);
    setGroups(nextGroups);

    const poseMiss =
      Boolean(currentTarget.gesture) && next.gesture !== currentTarget.gesture;
    const worst = [...nextGroups].sort((a, b) => b.error - a.error)[0];
    const coachKey = poseMiss
      ? `pose:${currentTarget.gesture}`
      : scored.percent >= 60
        ? `near-${Math.floor(scored.percent / 5)}`
        : `${worst?.id}:${worst && worst.signedDelta >= 0 ? "+" : "-"}`;

    if (coachKey !== coachKeyRef.current) {
      coachKeyRef.current = coachKey;
      if (poseMiss && currentTarget.gesture) {
        setCoach(poseCoachLine(currentTarget.gesture));
      } else if (scored.percent >= 60) {
        setCoach(nearWinLine(scored.percent));
      } else if (worst) {
        setCoach(coachingLine(worst, smoothed, currentTarget.expression));
      }
    }

    const now = performance.now();
    if (scored.percent >= WIN_PERCENT) {
      if (holdStartedRef.current == null) holdStartedRef.current = now;
      if (now - (holdStartedRef.current ?? now) >= HOLD_MS) {
        wonRef.current = true;
        const media = videoRef.current;
        const selfie = media ? captureSelfie(media) : "";
        setWin({ percent: scored.percent, selfie });
      }
    } else {
      holdStartedRef.current = null;
    }
  }, []);

  const newTom = () => {
    wonRef.current = false;
    setWin(null);
    setTarget((current) => pickRandomTom(current.id));
    resetLiveState();
  };

  useEffect(() => {
    wonRef.current = false;
  }, [target.id]);

  const statusMessage = cameraStatusMessage({
    cameraError,
    hasVideo: Boolean(video),
    status: frame?.status,
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400">
            challenge
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Become Tom
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={newTom}
            className="text-xs uppercase tracking-[0.2em] text-neutral-400 transition hover:text-neutral-900"
          >
            New Tom
          </button>
          <button
            type="button"
            onClick={onExit}
            className="text-xs uppercase tracking-[0.2em] text-neutral-400 transition hover:text-neutral-900"
          >
            Start over
          </button>
        </div>
      </header>

      <p className="mb-8 max-w-lg text-neutral-600">
        Copy his face. Hit {WIN_PERCENT}% and hold it. No identity scan — just
        the bit.
      </p>

      <div className="grid flex-1 items-start gap-8 md:grid-cols-2 md:gap-10 lg:gap-16">
        <section className="flex flex-col">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">
            Tom
          </p>
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-[#111] sm:aspect-[3/4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={target.image}
              alt={target.label}
              className="h-full w-full object-contain bg-white"
            />
          </div>
          <p className="mt-4 text-sm uppercase tracking-[0.2em] text-neutral-400">
            {target.label}
          </p>
        </section>

        <CameraStage
          video={video}
          onReady={handleReady}
          onError={handleError}
          onFrame={handleFrame}
          statusMessage={statusMessage}
        />
      </div>

      <section className="mt-10 max-w-xl">
        <p className="text-5xl font-semibold tracking-tight sm:text-6xl">
          {percent == null ? "—% TOM" : `${percent}% TOM`}
        </p>
        <p className="mt-3 min-h-[1.5em] text-lg text-neutral-700">{coach}</p>

        <FeatureChecklist
          groups={groups}
          gestureRow={
            target.gesture
              ? {
                  label: POSE_LABEL[target.gesture],
                  passed: frame?.gesture === target.gesture,
                }
              : null
          }
        />
      </section>

      <TomOptions activeId={target.id} />

      {win ? (
        <ShareCard
          target={target}
          percent={win.percent}
          selfie={win.selfie}
          onReplay={newTom}
          onHome={onExit}
        />
      ) : null}

      <DebugPanel
        frame={frame}
        match={null}
        extras={[
          { label: "Target Tom", value: target.id },
          {
            label: "Vs target",
            value: similarity == null ? "—" : similarity.toFixed(2),
          },
        ]}
      />
    </main>
  );
}
