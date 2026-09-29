// Subtitles drawn into the picture, styled like the caption over the player:
// white bold text on a dark rounded box, centred near the bottom.

export const CAPTION_FONT = "Nunito";

export class CaptionPainter {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d")!;
  }

  /** Paints a frame (via `drawFrame`) and the caption lines over it; returns the canvas. */
  paint(drawFrame: (ctx: CanvasRenderingContext2D) => void, lines: readonly string[] | null): HTMLCanvasElement {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);
    drawFrame(ctx);
    if (lines?.length) drawCaption(ctx, lines, width, height);
    return this.canvas;
  }
}

function drawCaption(ctx: CanvasRenderingContext2D, lines: readonly string[], width: number, height: number) {
  // About 5.5% of the short side: readable on a phone, not shouting on a TV.
  let size = Math.max(12, Math.round(Math.min(width, height) * 0.055));
  const font = (px: number) => `800 ${px}px ${CAPTION_FONT}, system-ui, sans-serif`;
  ctx.font = font(size);
  let widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  // Like the CSS max-width: 88%, shrinking the text instead of wrapping it again.
  const room = width * 0.88 - 2 * 0.6 * size;
  if (widest > room) {
    size = Math.max(10, Math.floor((size * room) / widest));
    ctx.font = font(size);
    widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  }

  const lineHeight = size * 1.3;
  const padX = size * 0.6;
  const padY = size * 0.25;
  const boxWidth = widest + 2 * padX;
  const boxHeight = lines.length * lineHeight + 2 * padY;
  const x = (width - boxWidth) / 2;
  const y = height * 0.93 - boxHeight;

  ctx.save();
  ctx.fillStyle = "rgb(0 0 0 / 0.62)";
  ctx.beginPath();
  ctx.roundRect(x, y, boxWidth, boxHeight, size * 0.45);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgb(0 0 0 / 0.6)";
  ctx.shadowOffsetY = Math.max(1, size / 24);
  ctx.shadowBlur = Math.max(2, size / 12);
  lines.forEach((line, i) => ctx.fillText(line, width / 2, y + padY + lineHeight * (i + 0.5)));
  ctx.restore();
}

/** The caption font is a web font: make sure it's loaded before painting frames. */
export async function loadCaptionFont() {
  try {
    await document.fonts.load(`800 32px ${CAPTION_FONT}`);
  } catch {
    // The fallback font will do.
  }
}
