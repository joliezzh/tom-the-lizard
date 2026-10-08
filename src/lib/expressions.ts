import type { Classifications, NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { ExpressionVector } from "@/lib/types";

/**
 * MediaPipe Face Mesh indices for the outer eye corners.
 * We only use these to estimate head *roll* (tilt), never identity.
 */
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const UPPER_LIP = 13;
const LOWER_LIP = 14;
const MOUTH_LEFT = 61;
const MOUTH_RIGHT = 291;

/**
 * How open the mouth is from lip landmarks.
 *
 * MediaPipe's 52 blendshapes are ARKit-style and do not include `mouthOpen`,
 * so scream matching cannot rely on that score alone. Inner-lip gap vs mouth
 * width is a live pose signal, not identity.
 */
export function geometricMouthOpen(landmarks: NormalizedLandmark[]) {
  const upper = landmarks[UPPER_LIP];
  const lower = landmarks[LOWER_LIP];
  const left = landmarks[MOUTH_LEFT];
  const right = landmarks[MOUTH_RIGHT];
  if (!upper || !lower || !left || !right) return 0;

  const gap = Math.hypot(upper.x - lower.x, upper.y - lower.y);
  const width = Math.hypot(left.x - right.x, left.y - right.y);
  if (width < 1e-4) return 0;

  const ratio = gap / width;
  // Closed ~0.08–0.18, talking ~0.25–0.35, a real scream ~0.45+.
  return clamp01((ratio - 0.14) / 0.42);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Turn blendshape name/score pairs into a lookup table. */
export function blendshapeScores(classifications?: Classifications) {
  const scores: Record<string, number> = {};
  if (!classifications) return scores;
  for (const category of classifications.categories) {
    scores[category.categoryName] = category.score;
  }
  return scores;
}

/**
 * Head roll in degrees from the two outer eye corners.
 *
 * Why landmarks instead of “is this person X?”:
 * identity matching compares a whole face template.
 * Tilt is just geometry: if one eye is higher, the head is leaning.
 */
export function headTiltDegrees(landmarks: NormalizedLandmark[]) {
  const left = landmarks[LEFT_EYE_OUTER];
  const right = landmarks[RIGHT_EYE_OUTER];
  if (!left || !right) return 0;

  const dy = left.y - right.y;
  const dx = left.x - right.x;
  let degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Upright faces can land near ±180° depending on left/right order.
  // Fold into a small roll so 0° means “head basically straight.”
  if (degrees > 90) degrees -= 180;
  if (degrees < -90) degrees += 180;
  return degrees;
}

/**
 * Convert raw MediaPipe blendshapes into our small, editable 0–1 vector.
 *
 * Blendshapes are ARKit-style muscle sliders (smile, blink, jaw, …).
 * Averaging left/right keeps the MVP simple and more stable.
 */
export function toExpressionVector(
  classifications: Classifications | undefined,
  landmarks: NormalizedLandmark[],
): { expression: ExpressionVector; headTiltDegrees: number } {
  const s = blendshapeScores(classifications);
  const tilt = headTiltDegrees(landmarks);

  const smile = mean([s.mouthSmileLeft ?? 0, s.mouthSmileRight ?? 0]);
  const eyeSquint = mean([s.eyeSquintLeft ?? 0, s.eyeSquintRight ?? 0]);
  const eyeWide = mean([s.eyeWideLeft ?? 0, s.eyeWideRight ?? 0]);
  const browRaise = mean([
    s.browInnerUp ?? 0,
    s.browOuterUpLeft ?? 0,
    s.browOuterUpRight ?? 0,
  ]);

  return {
    headTiltDegrees: tilt,
    expression: {
      smile: clamp01(smile),
      mouthOpen: clamp01(
        Math.max(s.mouthOpen ?? 0, geometricMouthOpen(landmarks)),
      ),
      eyeSquint: clamp01(eyeSquint),
      eyeWide: clamp01(eyeWide),
      browRaise: clamp01(browRaise),
      jawOpen: clamp01(s.jawOpen ?? 0),
      tongueOut: clamp01(s.tongueOut ?? 0),
      // 45° of tilt ≈ “fully tilted” for matching against Tom profiles.
      headTilt: clamp01(Math.abs(tilt) / 45),
    },
  };
}

/** Axis-aligned box around all face landmarks (normalized 0–1). */
export function boundingBoxFromLandmarks(landmarks: NormalizedLandmark[]) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const point of landmarks) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const pad = 0.04;
  const x = clamp01(minX - pad);
  const y = clamp01(minY - pad);
  const width = clamp01(maxX + pad) - x;
  const height = clamp01(maxY + pad) - y;

  return { x, y, width, height };
}
