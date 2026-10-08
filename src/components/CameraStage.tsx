"use client";

import { CameraFeed } from "@/components/CameraFeed";
import { FaceAnalyzer } from "@/components/FaceAnalyzer";
import type { AnalysisFrame } from "@/lib/types";

type CameraStageProps = {
  video: HTMLVideoElement | null;
  onReady: (video: HTMLVideoElement) => void;
  onError: (message: string) => void;
  onFrame: (frame: AnalysisFrame) => void;
  statusMessage: string | null;
  label?: string;
};

export function CameraStage({
  video,
  onReady,
  onError,
  onFrame,
  statusMessage,
  label = "You",
}: CameraStageProps) {
  return (
    <section className="flex flex-col">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">
        {label}
      </p>
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-black sm:aspect-[3/4]">
        <CameraFeed onReady={onReady} onError={onError} />
        <FaceAnalyzer video={video} onFrame={onFrame} />
        {statusMessage ? (
          <p className="absolute bottom-4 left-4 right-4 text-center text-xs text-[#d8ff4a]">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
