import type { ExpressionVector } from "@/lib/types";

export type FeatureGroupId = "eyes" | "headTilt" | "mouth" | "eyebrows";

export type FeatureGroup = {
  id: FeatureGroupId;
  label: string;
  keys: (keyof ExpressionVector)[];
};

/** Checklist groups shown in Become Tom. Easy to retune. */
export const FEATURE_GROUPS: FeatureGroup[] = [
  { id: "eyes", label: "Eyes", keys: ["eyeSquint", "eyeWide"] },
  { id: "headTilt", label: "Head tilt", keys: ["headTilt"] },
  { id: "mouth", label: "Mouth", keys: ["smile", "mouthOpen", "jawOpen", "tongueOut"] },
  { id: "eyebrows", label: "Eyebrows", keys: ["browRaise"] },
];

/** Average absolute error of 0.18 or less counts as “close enough.” */
const PASS_ERROR = 0.18;

export type GroupScore = {
  id: FeatureGroupId;
  label: string;
  error: number;
  passed: boolean;
  /** Negative = user is lower than Tom on the group’s main signal. */
  signedDelta: number;
};

function meanAbsError(user: ExpressionVector, target: ExpressionVector, keys: (keyof ExpressionVector)[]) {
  const total = keys.reduce((sum, key) => sum + Math.abs(user[key] - target[key]), 0);
  return total / keys.length;
}

function meanSigned(user: ExpressionVector, target: ExpressionVector, keys: (keyof ExpressionVector)[]) {
  const total = keys.reduce((sum, key) => sum + (user[key] - target[key]), 0);
  return total / keys.length;
}

export function scoreFeatureGroups(
  user: ExpressionVector,
  target: ExpressionVector,
): GroupScore[] {
  return FEATURE_GROUPS.map((group) => {
    const error = meanAbsError(user, target, group.keys);
    return {
      id: group.id,
      label: group.label,
      error,
      passed: error <= PASS_ERROR,
      signedDelta: meanSigned(user, target, group.keys),
    };
  });
}
