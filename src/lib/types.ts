/**
 * Shared types for the Tom matcher.
 *
 * Privacy note: these values are temporary expression *and gesture* signals,
 * not identity. We never store faces, names, or biometric templates.
 */

/** 0–1 scores we use to describe a face *right now*. */
export type ExpressionVector = {
  smile: number;
  mouthOpen: number;
  eyeSquint: number;
  eyeWide: number;
  browRaise: number;
  jawOpen: number;
  tongueOut: number;
  /** Head roll mapped to 0–1 (0 = upright, 1 = strongly tilted). */
  headTilt: number;
};

/** Poses we detect from hands + face (not MediaPipe’s generic wave list). */
export type TomGesture =
  | "prayer"
  | "middle_finger"
  | "shush"
  | "push"
  | "hands_up"
  | "run"
  | "mouth_open"
  | "pointing_up"
  | "wave"
  | "gasp"
  | "eat_belly";

export type TomMeme = {
  id: string;
  image: string;
  label: string;
  /** Funny caption under the match % — easy to edit. */
  vibe: string;
  expression: ExpressionVector;
  /** Optional hand pose. When set, matching that gesture boosts this Tom. */
  gesture?: TomGesture;
};

export type FaceStatus = "none" | "one" | "multiple";

export type AnalysisFrame = {
  status: FaceStatus;
  /** Bounding box in normalized 0–1 video coordinates. */
  box: { x: number; y: number; width: number; height: number } | null;
  expression: ExpressionVector | null;
  /** Signed roll in degrees, for the debug panel. */
  headTiltDegrees: number | null;
  /** Best current hand gesture, or null if none. */
  gesture: TomGesture | null;
};

export type TomMatch = {
  meme: TomMeme;
  /** 0–1 similarity after converting distance. */
  similarity: number;
  /** Fun display number, e.g. 87. */
  percent: number;
};
