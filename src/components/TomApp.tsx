"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const MatchMode = dynamic(
  () => import("@/components/MatchMode").then((mod) => mod.MatchMode),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-dvh items-center justify-center text-sm text-neutral-400">
        Warming up Tom…
      </main>
    ),
  },
);

const BecomeTomMode = dynamic(
  () => import("@/components/BecomeTomMode").then((mod) => mod.BecomeTomMode),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-dvh items-center justify-center text-sm text-neutral-400">
        Warming up Tom…
      </main>
    ),
  },
);

type Mode = "landing" | "match" | "become";

export function TomApp() {
  const [mode, setMode] = useState<Mode>("landing");

  if (mode === "match") {
    return <MatchMode onExit={() => setMode("landing")} />;
  }

  if (mode === "become") {
    return <BecomeTomMode onExit={() => setMode("landing")} />;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <p className="mb-6 text-[11px] uppercase tracking-[0.35em] text-neutral-400">
        a lizard, but make it you
      </p>
      <h1 className="max-w-xl text-center text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
        Which Tom Are You?
      </h1>
      <p className="mt-6 text-center text-lg text-neutral-600">
        Make a face. We&apos;ll find your Tom.
      </p>

      <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setMode("match")}
          className="bg-black px-8 py-3 text-sm font-medium tracking-wide text-[#d8ff4a] transition hover:bg-neutral-800"
        >
          Find My Tom
        </button>
        <button
          type="button"
          onClick={() => setMode("become")}
          className="border border-black px-8 py-3 text-sm font-medium tracking-wide transition hover:bg-black hover:text-[#d8ff4a]"
        >
          Become Tom
        </button>
      </div>

      <p className="mt-8 max-w-sm text-center text-xs leading-relaxed text-neutral-400">
        Two games, same rule: live expression only. No face ID, no saving
        frames, no “who is this.”
      </p>
    </main>
  );
}
