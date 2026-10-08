import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { TomGesture } from "@/lib/types";

type Pt = { x: number; y: number };

const WRIST = 0;
const INDEX_TIP = 8;
const INDEX_PIP = 6;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const MIDDLE_MCP = 9;
const RING_TIP = 16;
const RING_PIP = 14;
const RING_MCP = 13;
const PINKY_TIP = 20;
const PINKY_PIP = 18;
const PINKY_MCP = 17;
const THUMB_TIP = 4;

const MOUTH_UPPER = 13;
const MOUTH_LOWER = 14;
const MOUTH_LEFT = 61;
const MOUTH_RIGHT = 291;

const GRASP_TIPS = [INDEX_TIP, MIDDLE_TIP, THUMB_TIP];

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function palm(hand: NormalizedLandmark[]): Pt {
  return {
    x: (hand[WRIST].x + hand[INDEX_MCP].x + hand[PINKY_MCP].x) / 3,
    y: (hand[WRIST].y + hand[INDEX_MCP].y + hand[PINKY_MCP].y) / 3,
  };
}

/** Finger is stretched out if the tip is clearly farther from the knuckle than the mid-joint. */
function extended(
  hand: NormalizedLandmark[],
  tip: number,
  pip: number,
  mcp: number,
) {
  return dist(hand[tip], hand[mcp]) > dist(hand[pip], hand[mcp]) * 1.45;
}

function openPalm(hand: NormalizedLandmark[]) {
  const fingers = [
    extended(hand, INDEX_TIP, INDEX_PIP, INDEX_MCP),
    extended(hand, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP),
    extended(hand, RING_TIP, RING_PIP, RING_MCP),
    extended(hand, PINKY_TIP, PINKY_PIP, PINKY_MCP),
  ];
  return fingers.filter(Boolean).length >= 3;
}

function middleFingerOnly(hand: NormalizedLandmark[]) {
  const middle = extended(hand, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
  const index = extended(hand, INDEX_TIP, INDEX_PIP, INDEX_MCP);
  const ring = extended(hand, RING_TIP, RING_PIP, RING_MCP);
  const pinky = extended(hand, PINKY_TIP, PINKY_PIP, PINKY_MCP);
  return middle && !index && !ring && !pinky;
}

function pointingUp(hand: NormalizedLandmark[]) {
  const index = extended(hand, INDEX_TIP, INDEX_PIP, INDEX_MCP);
  const middle = extended(hand, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
  const ring = extended(hand, RING_TIP, RING_PIP, RING_MCP);
  const tipAboveWrist = hand[INDEX_TIP].y < hand[WRIST].y - 0.02;
  return index && !middle && !ring && tipAboveWrist;
}

function handNearMouth(
  hands: NormalizedLandmark[][],
  mouth: Pt,
  maxDist: number,
) {
  const tips = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP, THUMB_TIP];
  return hands.some((hand) =>
    tips.some((tip) => dist(hand[tip], mouth) < maxDist),
  );
}

function showingBelly(box: ReturnType<typeof faceBox>) {
  // Chin stays in the top half and the face isn't a full-frame close-up,
  // so the camera can actually see chest/belly below.
  return box.maxY < 0.6 && box.h < 0.5 && box.minY < 0.28;
}

function isEating(
  hands: NormalizedLandmark[][],
  mouth: Pt,
  box: ReturnType<typeof faceBox>,
  expression?: { mouthOpen: number; jawOpen: number } | null,
) {
  const chewing =
    (expression?.mouthOpen ?? 0) > 0.22 || (expression?.jawOpen ?? 0) > 0.18;
  if (!chewing) return false;
  return handNearMouth(hands, mouth, Math.max(0.09, box.h * 0.42));
}

function nearestTip(hand: NormalizedLandmark[], target: Pt) {
  return Math.min(...GRASP_TIPS.map((tip) => dist(hand[tip], target)));
}

function tipInsideMouthOpening(
  hand: NormalizedLandmark[],
  left: Pt,
  right: Pt,
  upper: Pt,
  lower: Pt,
) {
  const padX = dist(left, right) * 0.18;
  const gapY = Math.max(dist(upper, lower), 0.012);
  const minX = Math.min(left.x, right.x) - padX;
  const maxX = Math.max(left.x, right.x) + padX;
  const minY = Math.min(upper.y, lower.y) - gapY;
  const maxY = Math.max(upper.y, lower.y) + gapY;
  return GRASP_TIPS.some((tip) => {
    const p = hand[tip];
    return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
  });
}

/**
 * Palms pressed together, fingers pointing up — the prayer photo, not a mouth grab.
 */
function prayerHands(
  hands: NormalizedLandmark[][],
  face: NormalizedLandmark[],
  box: ReturnType<typeof faceBox>,
) {
  if (hands.length < 2) return false;
  const p0 = palm(hands[0]);
  const p1 = palm(hands[1]);
  if (dist(p0, p1) > 0.09) return false;
  if (dist(hands[0][WRIST], hands[1][WRIST]) > 0.13) return false;

  const gluedTips = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP].filter(
    (tip) => dist(hands[0][tip], hands[1][tip]) < 0.08,
  ).length;
  if (gluedTips < 3) return false;

  const pointingUp = hands.every(
    (hand) =>
      hand[INDEX_TIP].y < hand[WRIST].y - 0.025 &&
      hand[MIDDLE_TIP].y < hand[WRIST].y - 0.02,
  );
  if (!pointingUp) return false;

  const left = face[MOUTH_LEFT];
  const right = face[MOUTH_RIGHT];
  const splitToCorners =
    nearestTip(hands[0], left) < 0.045 && nearestTip(hands[1], right) < 0.045;
  const splitToCornersFlip =
    nearestTip(hands[0], right) < 0.045 && nearestTip(hands[1], left) < 0.045;
  if (splitToCorners || splitToCornersFlip) return false;

  const midY = (p0.y + p1.y) / 2;
  const atFace =
    midY > box.minY - box.h * 0.05 && midY < box.maxY + box.h * 1.15;
  return atFace;
}

function isScreaming(mouthOpen: number, jawOpen: number) {
  // Geometric mouthOpen already fills in for the missing ARKit mouthOpen slider.
  return mouthOpen > 0.38 || jawOpen > 0.48;
}

/**
 * Fingers hooked *inside* the mouth, one hand on each corner — not palms on the lips.
 */
function fingersInMouthCorners(hands: NormalizedLandmark[][], face: NormalizedLandmark[]) {
  if (hands.length < 2) return false;
  const left = face[MOUTH_LEFT];
  const right = face[MOUTH_RIGHT];
  const upper = face[MOUTH_UPPER];
  const lower = face[MOUTH_LOWER];
  if (!left || !right || !upper || !lower) return false;

  if (!hands.every((hand) => tipInsideMouthOpening(hand, left, right, upper, lower))) {
    return false;
  }

  const cornerReach = Math.max(0.04, dist(left, right) * 0.5);
  const leftHits = hands.map((hand) => nearestTip(hand, left));
  const rightHits = hands.map((hand) => nearestTip(hand, right));
  const oppositeCorners =
    (leftHits[0] < cornerReach && rightHits[1] < cornerReach) ||
    (rightHits[0] < cornerReach && leftHits[1] < cornerReach);
  if (!oppositeCorners) return false;

  // Palms stay apart so this does not look like prayer hands at the chin.
  return dist(palm(hands[0]), palm(hands[1])) > 0.055;
}

function faceBox(face: NormalizedLandmark[]) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const p of face) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, h: maxY - minY, cx: (minX + maxX) / 2 };
}

/**
 * Turn 21 hand points + the face into one of our Tom poses.
 *
 * Order is specific → general so prayer (clasped hands) is not eaten by shush,
 * and a pure scream is not eaten by gasp / two-hand poses.
 * This is pose matching, not identity.
 */
export function classifyPose(
  hands: NormalizedLandmark[][],
  face?: NormalizedLandmark[],
  expression?: { mouthOpen: number; jawOpen: number } | null,
): TomGesture | null {
  if (!face || face.length === 0) return null;
  const box = faceBox(face);
  const mouth = {
    x: (face[MOUTH_UPPER].x + face[MOUTH_LOWER].x) / 2,
    y: (face[MOUTH_UPPER].y + face[MOUTH_LOWER].y) / 2,
  };

  const mouthOpen = expression?.mouthOpen ?? 0;
  const jawOpen = expression?.jawOpen ?? 0;
  const screaming = isScreaming(mouthOpen, jawOpen);

  // 1. Shush — exactly one index on closed lips. Two hands are never a whisper.
  if (
    hands.length === 1 &&
    !screaming &&
    mouthOpen < 0.2 &&
    jawOpen < 0.18
  ) {
    const hand = hands[0];
    const toMouth = dist(hand[INDEX_TIP], mouth);
    const indexOut = extended(hand, INDEX_TIP, INDEX_PIP, INDEX_MCP);
    const ringOut = extended(hand, RING_TIP, RING_PIP, RING_MCP);
    const pinkyOut = extended(hand, PINKY_TIP, PINKY_PIP, PINKY_MCP);
    const fingerOnLips = toMouth < Math.max(0.05, box.h * 0.26);
    if (fingerOnLips && indexOut && !ringOut && !pinkyOut) return "shush";
  }

  // 2. Gasp Tom — fingertips inside the mouth, pulling the two corners.
  if (fingersInMouthCorners(hands, face)) {
    return "gasp";
  }

  // 3. Prayer — palms pressed together, fingers up. Not a mouth grab.
  if (prayerHands(hands, face, box)) return "prayer";

  // 4. Snack Tom — MUST be eating AND showing belly (lean back / step back).
  if (isEating(hands, mouth, box, expression) && showingBelly(box)) {
    return "eat_belly";
  }

  // 5. Wide-open mouth / scream — no hand pose required. Beats pointing / push.
  if (screaming) {
    return "mouth_open";
  }

  // 6. Middle finger — only the middle digit is stretched.
  if (hands.some(middleFingerOnly)) return "middle_finger";

  // 7. Pointing up — index only, tip above the wrist.
  if (hands.some(pointingUp)) return "pointing_up";

  if (hands.length >= 2) {
    const wrists = hands.map((h) => h[WRIST]);
    const avgY = (wrists[0].y + wrists[1].y) / 2;
    const span = dist(wrists[0], wrists[1]);
    const bothOpen = openPalm(hands[0]) && openPalm(hands[1]);
    const bothHigh = wrists.every((w) => w.y < box.minY + box.h * 0.35);
    const atChest =
      avgY > box.maxY - box.h * 0.15 && avgY < box.maxY + box.h * 1.5;
    const inFront = wrists.every((w) => Math.abs(w.x - box.cx) < 0.48);

    if (bothHigh && bothOpen) return "hands_up";
    if (bothHigh) return "hands_up";

    if (bothOpen && atChest && inFront && span < 0.62) {
      return "push";
    }

    const heightGap = Math.abs(wrists[0].y - wrists[1].y);
    if (heightGap > 0.12) return "run";
  }

  // 8. Wave — one open palm beside the face, not both hands overhead.
  if (hands.length === 1 && openPalm(hands[0])) {
    const wrist = hands[0][WRIST];
    const besideHead = Math.abs(wrist.y - box.minY) < box.h * 1.2;
    if (besideHead) return "wave";
  }

  if (hands.length === 1) {
    const wrist = hands[0][WRIST];
    if (wrist.y < box.minY + box.h * 0.2) return "hands_up";
  }

  return null;
}

export const POSE_LABEL: Record<TomGesture, string> = {
  prayer: "Prayer",
  middle_finger: "Hands",
  shush: "Shush",
  push: "Push",
  hands_up: "Hands up",
  run: "Run",
  mouth_open: "Mouth",
  pointing_up: "Point up",
  wave: "Wave",
  gasp: "Fingers in mouth",
  eat_belly: "Eat + belly",
};
