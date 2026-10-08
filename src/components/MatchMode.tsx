"use client";

import { useCallback, useRef, useState } from "react";
import { CameraStage } from "@/components/CameraStage";
import { DebugPanel } from "@/components/DebugPanel";
import { TomOptions } from "@/components/TomOptions";
import { TomResult } from "@/components/TomResult";
import { createSmootherState, updateSmoothedMatch } from "@/lib/smoothing";
import { cameraStatusMessage } from "@/lib/cameraStatus";
import type { AnalysisFrame, TomMatch } from "@/lib/types";

type MatchModeProps = {
  onExit: () => void;
};

export function MatchMode({ onExit }: MatchModeProps) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [frame, setFrame] = useState<AnalysisFrame | null>(null);
  const [match, setMatch] = useState<TomMatch | null>(null);
  const smootherRef = useRef(createSmootherState());

  const handleReady = useCallback((element: HTMLVideoElement) => {
    setVideo(element);
  }, []);

  const handleError = useCallback((message: string) => {
    setCameraError(message);
  }, []);

  const handleFrame = useCallback((next: AnalysisFrame) => {
    setFrame(next);

    if (!next.expression) {
      smootherRef.current = createSmootherState();
      setMatch(null);
      return;
    }

    const { state, match: nextMatch } = updateSmoothedMatch(
      smootherRef.current,
      next.expression,
      performance.now(),
      next.gesture,
    );
    smootherRef.current = state;
    setMatch(nextMatch);
  }, []);

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
            live
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Which Tom Are You?
          </h1>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="text-xs uppercase tracking-[0.2em] text-neutral-400 transition hover:text-neutral-900"
        >
          Start over
        </button>
      </header>

      <div className="grid flex-1 items-start gap-8 md:grid-cols-2 md:gap-10 lg:gap-16">
        <CameraStage
          video={video}
          onReady={handleReady}
          onError={handleError}
          onFrame={handleFrame}
          statusMessage={statusMessage}
        />
        <TomResult
          match={match}
          expression={frame?.expression ?? null}
          gesture={frame?.gesture ?? null}
        />
      </div>

      <TomOptions activeId={match?.meme.id} />

      <DebugPanel frame={frame} match={match} />
    </main>
  );
}
