import { TOM_MEMES } from "@/data/tomMemes";
import type { ExpressionVector, TomGesture, TomMatch, TomMeme } from "@/lib/types";

/**
 * How much each signal matters when ranking Toms.
 *
 * Eyes and mouth carry most of the meme energy; head tilt is a light seasoning
 * so a small lean doesn’t steal the match.
 */
const WEIGHTS: Record<keyof ExpressionVector, number> = {
  smile: 1.2,
  mouthOpen: 1.15,
  eyeSquint: 1.2,
  eyeWide: 1.3,
  browRaise: 1.0,
  jawOpen: 1.05,
  tongueOut: 1.4,
  headTilt: 0.5,
};

const FEATURES = Object.keys(WEIGHTS) as (keyof ExpressionVector)[];
const GESTURE_WEIGHT = 2.1;

/** Face is “a Tom” once the closest meme is this similar. */
export const TOM_MATCH_PERCENT = 70;

/** Largest possible weighted distance (every feature off by 1, plus gesture). */
const MAX_DISTANCE = Math.sqrt(
  FEATURES.reduce((sum, key) => sum + WEIGHTS[key], 0) + GESTURE_WEIGHT,
);

export function weightedDistance(
  a: ExpressionVector,
  b: ExpressionVector,
  userGesture: TomGesture | null = null,
  requiredGesture?: TomGesture,
) {
  let sum = 0;
  for (const key of FEATURES) {
    const delta = a[key] - b[key];
    sum += WEIGHTS[key] * delta * delta;
  }
  if (requiredGesture) {
    const miss = userGesture === requiredGesture ? 0 : 1;
    sum += GESTURE_WEIGHT * miss * miss;
  }
  return Math.sqrt(sum);
}

/**
 * Distance → 0–1 similarity.
 *
 * Why not raw distance in the UI? “0.41 away from Tom” is opaque.
 * A percent feels like a personality quiz, which is the joke.
 */
export function distanceToSimilarity(distance: number) {
  return Math.max(0, 1 - distance / MAX_DISTANCE);
}

function easedSimilarity(distance: number) {
  const raw = distanceToSimilarity(distance);
  return Math.min(1, raw ** 0.72);
}

/** Live mimic score for Become Tom. */
export function becomeTomScore(
  expression: ExpressionVector,
  meme: TomMeme,
  gesture: TomGesture | null = null,
) {
  const similarity = easedSimilarity(
    weightedDistance(expression, meme.expression, gesture, meme.gesture),
  );
  return {
    similarity,
    percent: Math.round(similarity * 100),
  };
}

export function findClosestTom(
  expression: ExpressionVector,
  gesture: TomGesture | null = null,
): TomMatch {
  let best = TOM_MEMES[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const meme of TOM_MEMES) {
    const distance = (() => {
      const base = weightedDistance(
        expression,
        meme.expression,
        gesture,
        meme.gesture,
      );
      // Matching the Tom's hand pose should win immediately over a "close enough" face.
      if (gesture && meme.gesture === gesture) return base * 0.6;
      return base;
    })();
    if (distance < bestDistance) {
      bestDistance = distance;
      best = meme;
    }
  }

  const similarity = easedSimilarity(bestDistance);
  return {
    meme: best,
    similarity,
    percent: Math.round(similarity * 100),
  };
}
