import type { ExpressionVector, TomGesture, TomMatch } from "@/lib/types";
import { findClosestTom, TOM_MATCH_PERCENT } from "@/lib/similarity";

const FEATURES: (keyof ExpressionVector)[] = [
  "smile",
  "mouthOpen",
  "eyeSquint",
  "eyeWide",
  "browRaise",
  "jawOpen",
  "tongueOut",
  "headTilt",
];

/** Blend current frame into the running average. Higher = snappier. */
const EMA_ALPHA = 0.42;

/** Face-only swaps wait this long so blinks don’t flicker Toms. */
const STABLE_MS = 220;

/** Ignore a 1-frame gesture dropout so wave → thumbs-up still feels instant. */
const GESTURE_HOLD_MS = 140;

export type SmootherState = {
  smoothed: ExpressionVector | null;
  current: TomMatch | null;
  candidateId: string | null;
  candidateSince: number | null;
  lastGesture: TomGesture | null;
  gestureLostAt: number | null;
};

export function createSmootherState(): SmootherState {
  return {
    smoothed: null,
    current: null,
    candidateId: null,
    candidateSince: null,
    lastGesture: null,
    gestureLostAt: null,
  };
}

export function ema(previous: ExpressionVector | null, next: ExpressionVector) {
  if (!previous) return next;

  const mixed = { ...next };
  for (const key of FEATURES) {
    mixed[key] = EMA_ALPHA * next[key] + (1 - EMA_ALPHA) * previous[key];
  }
  return mixed;
}

function heldGesture(
  state: SmootherState,
  incoming: TomGesture | null,
  now: number,
): { gesture: TomGesture | null; gestureLostAt: number | null } {
  if (incoming) {
    return { gesture: incoming, gestureLostAt: null };
  }
  if (!state.lastGesture) {
    return { gesture: null, gestureLostAt: null };
  }
  const lostAt = state.gestureLostAt ?? now;
  if (now - lostAt >= GESTURE_HOLD_MS) {
    return { gesture: null, gestureLostAt: null };
  }
  return { gesture: state.lastGesture, gestureLostAt: lostAt };
}

/**
 * Smooth noisy blendshapes, blank the result below the match threshold,
 * and swap Toms immediately when the hand gesture changes.
 */
export function updateSmoothedMatch(
  state: SmootherState,
  nextExpression: ExpressionVector,
  now: number,
  rawGesture: TomGesture | null = null,
): { state: SmootherState; match: TomMatch | null } {
  const smoothed = ema(state.smoothed, nextExpression);
  const { gesture, gestureLostAt } = heldGesture(state, rawGesture, now);
  const incoming = findClosestTom(smoothed, gesture);
  const strongEnough = incoming.percent >= TOM_MATCH_PERCENT;
  const display = strongEnough ? incoming : null;

  const gestureChanged = Boolean(gesture) && gesture !== state.lastGesture;
  const currentNeedsOldGesture =
    Boolean(state.current?.meme.gesture) &&
    state.current?.meme.gesture !== gesture;

  if (!strongEnough) {
    return {
      match: null,
      state: {
        smoothed,
        current: null,
        candidateId: null,
        candidateSince: null,
        lastGesture: gesture,
        gestureLostAt,
      },
    };
  }

  if (!state.current) {
    return {
      match: display,
      state: {
        smoothed,
        current: incoming,
        candidateId: incoming.meme.id,
        candidateSince: now,
        lastGesture: gesture,
        gestureLostAt,
      },
    };
  }

  const sameAsCurrent = incoming.meme.id === state.current.meme.id;
  if (sameAsCurrent) {
    return {
      match: incoming,
      state: {
        smoothed,
        current: incoming,
        candidateId: incoming.meme.id,
        candidateSince: now,
        lastGesture: gesture,
        gestureLostAt,
      },
    };
  }

  const candidateId = incoming.meme.id;
  const candidateSince =
    state.candidateId === candidateId ? state.candidateSince ?? now : now;
  const heldLongEnough = now - candidateSince >= STABLE_MS;
  const switchNow = gestureChanged || currentNeedsOldGesture || heldLongEnough;

  if (switchNow) {
    return {
      match: incoming,
      state: {
        smoothed,
        current: incoming,
        candidateId,
        candidateSince: now,
        lastGesture: gesture,
        gestureLostAt,
      },
    };
  }

  return {
    match: state.current,
    state: {
      smoothed,
      current: state.current,
      candidateId,
      candidateSince,
      lastGesture: gesture,
      gestureLostAt,
    },
  };
}
