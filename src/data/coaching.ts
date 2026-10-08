import type { GroupScore } from "@/lib/featureGroups";
import type { ExpressionVector } from "@/lib/types";

/**
 * Coaching copy for Become Tom.
 * Edit freely — the game picks by *least similar* feature group.
 */
const LINES: Record<string, string[]> = {
  eyesOpen: ["OPEN YOUR EYES MORE", "WAKE UP.", "Tom has seen things. Show us."],
  eyesShut: ["SQUINT. COMMIT.", "LESS PEEP. MORE JUDGEMENT.", "Those are human eyes. Fix that."],
  tiltMore: ["TILT.", "THE NECK IS PART OF THE BIT.", "Commit to the angle."],
  tiltLess: ["HEAD ON STRAIGHT. THEN MAKE IT WEIRD.", "LESS TILT. MORE DEADPAN."],
  mouthOpen: ["OPEN UP.", "MORE MOUTH.", "Scream with your whole lizard."],
  mouthShut: ["CLOSE IT.", "Too much going on in the mouth department."],
  tooHappy: ["YOU'RE TOO HAPPY.", "MORE DISAPPOINTED.", "Smile detected. Illegal."],
  tooSad: ["A LITTLE LIFE, PLEASE.", "Tom is unwell, not asleep."],
  browsUp: ["EYEBROWS. NOW.", "RAISE THEM LIKE YOU KNOW THE LORE."],
  browsDown: ["UNFURROW. YOU'RE TRYING TOO HARD."],
  generic: [
    "LESS HUMAN. MORE TOM.",
    "LOCK IN.",
    "Tom would be disappointed.",
    "That's a person. Be a lizard.",
    "Almost. Don't get cocky.",
  ],
};

function pick(list: string[]) {
  return list[Math.floor(Math.random() * list.length)] ?? list[0];
}

export function coachingLine(
  worst: GroupScore,
  user: ExpressionVector,
  target: ExpressionVector,
) {
  if (worst.id === "eyes") {
    const wideDelta = user.eyeWide - target.eyeWide;
    const squintDelta = user.eyeSquint - target.eyeSquint;
    if (wideDelta < -0.12) return pick(LINES.eyesOpen);
    if (squintDelta < -0.12) return pick(LINES.eyesShut);
    if (wideDelta > 0.12) return pick(LINES.eyesShut);
    return pick(LINES.eyesOpen);
  }

  if (worst.id === "headTilt") {
    return worst.signedDelta < 0 ? pick(LINES.tiltMore) : pick(LINES.tiltLess);
  }

  if (worst.id === "mouth") {
    const smileDelta = user.smile - target.smile;
    if (smileDelta > 0.18) return pick(LINES.tooHappy);
    if (smileDelta < -0.18) return pick(LINES.tooSad);
    const openDelta =
      (user.mouthOpen + user.jawOpen) / 2 - (target.mouthOpen + target.jawOpen) / 2;
    return openDelta < 0 ? pick(LINES.mouthOpen) : pick(LINES.mouthShut);
  }

  if (worst.id === "eyebrows") {
    return worst.signedDelta < 0 ? pick(LINES.browsUp) : pick(LINES.browsDown);
  }

  return pick(LINES.generic);
}

const POSE_LINES: Record<string, string[]> = {
  eat_belly: [
    "SHOW YOUR BELLY. AND EAT.",
    "STEP BACK. SNACK IN FRAME.",
    "BELLY OUT. HAND TO MOUTH.",
  ],
  pointing_up: ["POINT UP. COMMIT.", "ONE FINGER. TO THE CEILING."],
  wave: ["WAVE LIKE YOU KNOW THEM.", "ONE HAND. HI."],
  gasp: [
    "FINGERS IN YOUR MOUTH. PULL THE CORNERS.",
    "HOOK BOTH CORNERS. INSIDE THE MOUTH.",
  ],
  prayer: ["PALMS TOGETHER. FINGERS UP.", "PRAY. HANDS FLAT AGAINST EACH OTHER."],
  mouth_open: ["OPEN YOUR MOUTH. SCREAM.", "BIGGER. LIKE A YELL."],
};

export function poseCoachLine(gesture: string) {
  return pick(POSE_LINES[gesture] ?? ["DO THE POSE.", "HANDS. NOW."]);
}

export function nearWinLine(percent: number) {
  if (percent >= 70) return "HOLD IT. DON'T BLINK.";
  if (percent >= 60) return pick(["LOCK IN.", "Almost lizard.", "Don't think. Tom doesn't."]);
  return pick(LINES.generic);
}
