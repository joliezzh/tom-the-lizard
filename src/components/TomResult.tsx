import { FeatureChecklist } from "@/components/FeatureChecklist";
import { scoreFeatureGroups } from "@/lib/featureGroups";
import { POSE_LABEL } from "@/lib/poses";
import type { ExpressionVector, TomGesture, TomMatch } from "@/lib/types";

type TomResultProps = {
  match: TomMatch | null;
  expression: ExpressionVector | null;
  gesture: TomGesture | null;
};

export function TomResult({ match, expression, gesture }: TomResultProps) {
  const groups =
    expression && match
      ? scoreFeatureGroups(expression, match.meme.expression)
      : [];

  return (
    <section className="flex flex-col">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">
        Your Tom
      </p>

      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-[#111] sm:aspect-[3/4]">
        {match ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.meme.image}
            alt={match.meme.label}
            className="h-full w-full object-contain"
          />
        ) : null}
      </div>

      <div className="mt-5 min-h-[4.5rem] space-y-1">
        {match ? (
          <>
            <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {match.percent}% TOM
            </p>
            <p className="text-lg text-neutral-600">{match.meme.vibe}</p>
            <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">
              {match.meme.label}
            </p>
          </>
        ) : null}
      </div>

      {match ? (
        <FeatureChecklist
          groups={groups}
          gestureRow={
            match.meme.gesture
              ? {
                  label: POSE_LABEL[match.meme.gesture],
                  passed: gesture === match.meme.gesture,
                }
              : null
          }
        />
      ) : null}
    </section>
  );
}
