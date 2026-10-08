"use client";

import { useState } from "react";
import type { AnalysisFrame, TomMatch } from "@/lib/types";

type DebugPanelProps = {
  frame: AnalysisFrame | null;
  match: TomMatch | null;
  extras?: { label: string; value: string }[];
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 font-mono text-[11px] leading-5">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-900">{value}</span>
    </div>
  );
}

/**
 * Dev-only-feeling readout so you can see *why* a Tom won.
 * Toggle it closed when you’re showing friends.
 */
export function DebugPanel({ frame, match, extras = [] }: DebugPanelProps) {
  const [open, setOpen] = useState(true);
  const expression = frame?.expression;

  return (
    <aside className="fixed right-4 bottom-4 z-20 w-[min(100%-2rem,17rem)] border border-neutral-200 bg-white/90 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500"
      >
        Dev: expression
        <span>{open ? "–" : "+"}</span>
      </button>

      {open ? (
        <div className="space-y-1 border-t border-neutral-200 px-3 py-3">
          <Row
            label="Face detected"
            value={
              frame?.status === "one"
                ? "YES"
                : frame?.status === "multiple"
                  ? "YES (multiple)"
                  : "NO"
            }
          />
          <Row label="Smile" value={fmt(expression?.smile)} />
          <Row label="Mouth Open" value={fmt(expression?.mouthOpen)} />
          <Row label="Eye Squint" value={fmt(expression?.eyeSquint)} />
          <Row label="Eye Wide" value={fmt(expression?.eyeWide)} />
          <Row label="Brow Raise" value={fmt(expression?.browRaise)} />
          <Row label="Jaw Open" value={fmt(expression?.jawOpen)} />
          <Row label="Tongue Out" value={fmt(expression?.tongueOut)} />
          <Row
            label="Gesture"
            value={frame?.gesture ?? "—"}
          />
          <Row
            label="Head Tilt"
            value={
              frame?.headTiltDegrees == null
                ? "—"
                : `${frame.headTiltDegrees.toFixed(0)}°`
            }
          />
          <div className="pt-2">
            {match ? (
              <>
                <Row label="Closest Tom" value={match.meme.id} />
                <Row label="Similarity" value={match.similarity.toFixed(2)} />
              </>
            ) : null}
            {extras.map((row) => (
              <Row key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function fmt(value: number | undefined) {
  return value == null ? "—" : value.toFixed(2);
}
