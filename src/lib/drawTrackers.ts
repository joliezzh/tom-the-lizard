import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type LandmarkLink = { start: number; end: number };

function toXY(
  point: NormalizedLandmark,
  width: number,
  height: number,
) {
  return { x: point.x * width, y: point.y * height };
}

function drawLinks(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  connections: LandmarkLink[],
  width: number,
  height: number,
  color: string,
  lineWidth: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const { start, end } of connections) {
    const a = landmarks[start];
    const b = landmarks[end];
    if (!a || !b) continue;
    const from = toXY(a, width, height);
    const to = toXY(b, width, height);
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  ctx.stroke();
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  color: string,
  radius: number,
) {
  ctx.fillStyle = color;
  for (const point of landmarks) {
    const { x, y } = toXY(point, width, height);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw 21-point hand skeletons only. Face tracking still runs off-canvas. */
export function drawTrackers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hands: NormalizedLandmark[][],
  handConnections: LandmarkLink[],
) {
  ctx.clearRect(0, 0, width, height);
  const stroke = Math.max(1.4, width * 0.0022);
  const joint = Math.max(2.2, width * 0.0034);
  const handColors = ["rgba(90, 220, 255, 0.95)", "rgba(160, 120, 255, 0.95)"];

  hands.forEach((hand, index) => {
    const color = handColors[index] ?? handColors[0];
    drawLinks(ctx, hand, handConnections, width, height, color, stroke * 1.2);
    drawDots(ctx, hand, width, height, color, joint);
  });
}
