import { TOM_MEMES } from "@/data/tomMemes";
import type { TomMeme } from "@/lib/types";

export function pickRandomTom(exceptId?: string): TomMeme {
  const pool = TOM_MEMES.filter((meme) => meme.id !== exceptId);
  const source = pool.length > 0 ? pool : TOM_MEMES;
  return source[Math.floor(Math.random() * source.length)] ?? TOM_MEMES[0];
}

/** Freeze one mirrored selfie frame. Only called when the player wins. */
export function captureSelfie(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 720;
  canvas.height = video.videoHeight || 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function coverDraw(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = "width" in image ? Number(image.width) : w;
  const ih = "height" in image ? Number(image.height) : h;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
}

/**
 * Build a downloadable share card. Nothing is uploaded —
 * the PNG lives in the browser until the player saves or shares it.
 */
export async function renderShareCard(options: {
  tomSrc: string;
  selfieSrc: string;
  percent: number;
  vibe: string;
  label: string;
}) {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");

  const [tom, selfie] = await Promise.all([
    loadImage(options.tomSrc),
    loadImage(options.selfieSrc),
  ]);

  ctx.fillStyle = "#f6f3ec";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#111";
  ctx.font = "700 72px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("TOM ACHIEVED.", 64, 140);

  ctx.fillStyle = "#888";
  ctx.font = "500 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("BECOME TOM", 64, 186);

  const gap = 28;
  const panelY = 230;
  const panelH = 620;
  const panelW = (width - 64 * 2 - gap) / 2;

  ctx.fillStyle = "#111";
  ctx.fillRect(64, panelY, panelW, panelH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(64, panelY, panelW, panelH);
  ctx.clip();
  coverDraw(ctx, tom, 64, panelY, panelW, panelH);
  ctx.restore();

  ctx.fillRect(64 + panelW + gap, panelY, panelW, panelH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(64 + panelW + gap, panelY, panelW, panelH);
  ctx.clip();
  coverDraw(ctx, selfie, 64 + panelW + gap, panelY, panelW, panelH);
  ctx.restore();

  ctx.fillStyle = "#111";
  ctx.font = "700 96px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(`${options.percent}% TOM`, 64, 1000);

  ctx.fillStyle = "#444";
  ctx.font = "400 36px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(options.vibe, 64, 1060);

  ctx.fillStyle = "#999";
  ctx.font = "500 20px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(options.label.toUpperCase(), 64, 1110);

  ctx.fillStyle = "#111";
  ctx.font = "500 22px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("which tom are you?", 64, 1280);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export card"));
    }, "image/png");
  });
}
