import { renderToStaticMarkup } from "react-dom/server";
import { Duck } from "../components/Duck";
import type { DuckLook } from "./duckLook";

export type ShareEntry = {
  name: string;
  rank: number;
  value: number;
  caption?: string;
  look: DuckLook;
};

export type ShareImageOptions = {
  mode: "round" | "final";
  title: string;
  subtitle: string;
  entries: ShareEntry[];
  /** What `value` means, e.g. "pts" or "guess". */
  valueLabel: string;
};

const W = 1200;
const H = 675;
const INK = "#2b2b2b";
const FONT = '"Lilita One", "Bricolage Grotesque", system-ui, sans-serif';
const BODY = '"Inter", system-ui, sans-serif';

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function pill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  lineWidth = 4,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function outlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  stroke = 8,
) {
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

/** Draws the results as a shareable cartoon "photo" and returns it as a PNG. */
export async function renderShareImage(
  options: ShareImageOptions,
): Promise<Blob> {
  const { mode, title, subtitle, entries, valueLabel } = options;
  await Promise.all([
    document.fonts.load(`40px "Lilita One"`),
    document.fonts.load(`700 20px "Inter"`),
  ]).catch(() => undefined);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // --- scenery
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (mode === "final") {
    sky.addColorStop(0, "#5b3fa6");
    sky.addColorStop(0.4, "#d9467e");
    sky.addColorStop(0.75, "#ff8a4c");
    sky.addColorStop(1, "#ffd36e");
  } else {
    sky.addColorStop(0, "#5cc8ff");
    sky.addColorStop(1, "#dff7ff");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.beginPath();
  ctx.arc(mode === "final" ? 420 : 1080, mode === "final" ? 400 : 90, 90, 0, 7);
  ctx.fillStyle = mode === "final" ? "#ffb02e" : "#ffe53b";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // river
  const water = ctx.createLinearGradient(0, 470, 0, H);
  if (mode === "final") {
    water.addColorStop(0, "#ff9d6c");
    water.addColorStop(1, "#8a3fa0");
  } else {
    water.addColorStop(0, "#2fa4f2");
    water.addColorStop(1, "#1478d4");
  }
  ctx.fillStyle = water;
  ctx.fillRect(0, 470, W, H - 470);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (let row = 0; row < 5; row++) {
    for (let x = -40 + (row % 2) * 40; x < W; x += 80) {
      const y = 500 + row * 34;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 10, y - 10, x + 20, y);
      ctx.quadraticCurveTo(x + 30, y + 10, x + 40, y);
      ctx.stroke();
    }
  }
  // bank
  ctx.fillStyle = mode === "final" ? "#3b8f4a" : "#54c23a";
  ctx.fillRect(0, 440, W, 34);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(-5, 440, W + 10, 34);

  // --- heading
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `64px ${FONT}`;
  outlinedText(ctx, fit(ctx, title, 680), 48, 92, "#ffe53b", 12);
  ctx.font = `600 24px ${BODY}`;
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 6;
  ctx.fillText(fit(ctx, subtitle, 700), 50, 132);
  ctx.shadowBlur = 0;

  // --- podium (left)
  const places = entries.filter((e) => e.rank <= 3).slice(0, 6);
  const ordered = [
    ...places.filter((e) => e.rank === 2),
    ...places.filter((e) => e.rank === 1),
    ...places.filter((e) => e.rank === 3),
  ];
  const blockH = { 1: 170, 2: 125, 3: 90 } as const;
  const colors = {
    1: ["#ffe27a", "#ffbf00"],
    2: ["#eef2f7", "#b4bfce"],
    3: ["#f3be93", "#cd8450"],
  } as const;
  const colW = Math.min(170, 640 / Math.max(ordered.length, 1));
  const startX = 40 + (640 - colW * ordered.length) / 2;
  const baseY = 620;

  const duckSize = 130;
  const duckImages = new Map<string, HTMLImageElement>();
  for (const e of entries) {
    const key = JSON.stringify(e.look);
    if (!duckImages.has(key)) {
      duckImages.set(
        key,
        await loadSvg(
          renderToStaticMarkup(<Duck look={e.look} width={duckSize} />),
        ),
      );
    }
  }

  ordered.forEach((e, i) => {
    const rank = Math.min(e.rank, 3) as 1 | 2 | 3;
    const x = startX + i * colW + 6;
    const w = colW - 12;
    const top = baseY - blockH[rank];
    const g = ctx.createLinearGradient(0, top, 0, baseY);
    g.addColorStop(0, colors[rank][0]);
    g.addColorStop(1, colors[rank][1]);
    ctx.beginPath();
    ctx.roundRect(x, top, w, blockH[rank], [14, 14, 0, 0]);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = `58px ${FONT}`;
    outlinedText(ctx, String(e.rank), x + w / 2, top + 62, "#fff", 10);
    ctx.font = `800 22px ${BODY}`;
    ctx.fillStyle = INK;
    ctx.fillText(
      `${fmt(e.value)} ${valueLabel}`.trim(),
      x + w / 2,
      top + blockH[rank] - 14,
    );

    const duck = duckImages.get(JSON.stringify(e.look))!;
    const dw = rank === 1 ? duckSize : duckSize * 0.82;
    const dh = (dw * 114) / 126;
    ctx.drawImage(duck, x + w / 2 - dw / 2, top - dh + 14, dw, dh);
    if (rank === 1) {
      ctx.font = "44px serif";
      ctx.fillText("👑", x + w / 2 + dw * 0.18, top - dh + 8);
    }

    ctx.font = `24px ${FONT}`;
    const label = fit(ctx, e.name, w + 10);
    const lw = ctx.measureText(label).width + 28;
    pill(ctx, x + w / 2 - lw / 2, top - dh - 30, lw, 36, 18, "#fff", 4);
    ctx.fillStyle = INK;
    ctx.fillText(label, x + w / 2, top - dh - 4);
  });

  // --- leaderboard (right)
  const rows = entries.slice(0, 8);
  const cardX = 740;
  const cardY = 170;
  const cardW = 420;
  const rowH = 46;
  const cardH = 70 + rows.length * rowH + (entries.length > 8 ? 34 : 14);
  pill(ctx, cardX, cardY, cardW, cardH, 24, "rgba(255,255,255,0.96)", 5);
  ctx.textAlign = "left";
  ctx.font = `30px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.fillText("Full results", cardX + 24, cardY + 48);
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  rows.forEach((e, i) => {
    const y = cardY + 70 + i * rowH + 30;
    ctx.font = `26px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.fillText(medals[e.rank] ?? String(e.rank), cardX + 24, y);
    ctx.font = `700 22px ${BODY}`;
    ctx.fillText(fit(ctx, e.name, 230), cardX + 72, y);
    ctx.textAlign = "right";
    ctx.fillText(fmt(e.value), cardX + cardW - 24, y);
  });
  if (entries.length > 8) {
    ctx.textAlign = "left";
    ctx.font = `600 18px ${BODY}`;
    ctx.fillStyle = "#666";
    ctx.fillText(
      `+ ${entries.length - 8} more`,
      cardX + 24,
      cardY + cardH - 14,
    );
  }

  // --- footer
  ctx.textAlign = "right";
  ctx.font = `28px ${FONT}`;
  outlinedText(ctx, "Frumbers", W - 36, H - 26, "#fff", 8);

  return await new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No image"))),
      "image/png",
    ),
  );
}
