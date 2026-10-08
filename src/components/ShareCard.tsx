"use client";

import { useState } from "react";
import { renderShareCard } from "@/lib/shareCard";
import type { TomMeme } from "@/lib/types";

type ShareCardProps = {
  target: TomMeme;
  percent: number;
  selfie: string;
  onReplay: () => void;
  onHome: () => void;
};

export function ShareCard({
  target,
  percent,
  selfie,
  onReplay,
  onHome,
}: ShareCardProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function withCard(action: (blob: Blob) => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      const blob = await renderShareCard({
        tomSrc: target.image,
        selfieSrc: selfie || target.image,
        percent,
        vibe: target.vibe,
        label: target.label,
      });
      await action(blob);
    } catch {
      setMessage("Could not build the card. Try download again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#111]/70 px-4 py-8">
      <div className="w-full max-w-3xl bg-[#f6f3ec] p-6 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500">
          Become Tom
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
          TOM ACHIEVED.
        </h2>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5">
          <div className="aspect-[4/5] overflow-hidden bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={target.image} alt={target.label} className="h-full w-full object-cover" />
          </div>
          <div className="aspect-[4/5] overflow-hidden bg-black">
            {selfie ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selfie} alt="Your Tom face" className="h-full w-full object-cover" />
            ) : (
              <p className="flex h-full items-center justify-center px-4 text-center text-sm text-neutral-400">
                Camera frame wasn’t captured — the card will still use Tom.
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-4xl font-semibold tracking-tight">{percent}% TOM</p>
        <p className="mt-1 text-neutral-600">{target.vibe}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void withCard(async (blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "tom-achieved.png";
                link.click();
                URL.revokeObjectURL(url);
              })
            }
            className="bg-black px-5 py-3 text-sm font-medium text-[#d8ff4a] disabled:opacity-50"
          >
            {busy ? "Cooking card…" : "Download card"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void withCard(async (blob) => {
                const file = new File([blob], "tom-achieved.png", {
                  type: "image/png",
                });
                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                  await navigator.share({
                    title: "TOM ACHIEVED.",
                    text: `${percent}% Tom`,
                    files: [file],
                  });
                  return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "tom-achieved.png";
                link.click();
                URL.revokeObjectURL(url);
                setMessage("Share isn’t available here, so we downloaded it instead.");
              })
            }
            className="border border-black px-5 py-3 text-sm font-medium disabled:opacity-50"
          >
            Share
          </button>
          <button
            type="button"
            onClick={onReplay}
            className="px-5 py-3 text-sm uppercase tracking-[0.16em] text-neutral-500"
          >
            Another Tom
          </button>
          <button
            type="button"
            onClick={onHome}
            className="px-5 py-3 text-sm uppercase tracking-[0.16em] text-neutral-500"
          >
            Home
          </button>
        </div>
        {message ? <p className="mt-4 text-sm text-neutral-500">{message}</p> : null}
      </div>
    </div>
  );
}
