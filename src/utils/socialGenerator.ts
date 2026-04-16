import { getBadgeImagePath, getPreferredBadgeImageVariant } from './badgeImages';
import { toSiblingImageUrl } from './imageSources';
import { pluralizeRu } from './textFormatting';

export type SocialCardFormat = 'story' | 'wide';
export type SocialCardKind =
  | 'progress_summary'
  | 'start_route'
  | 'achieved_level'
  | 'favorite'
  | 'inspector_mission'
  | 'creator_proposal'
  | 'creator_highlight';

export type SocialCardProfile = {
  nickname?: string;
  avatar?: string;
  rank?: string;
  totalLevelsAchieved?: number;
  totalBadgesStarted?: number;
};

export type SocialCardBadge = {
  id?: string;
  baseId?: string;
  title?: string;
  emoji?: string;
  categoryId?: string;
  levelLabel?: string;
};

export type SocialCardInput = {
  format: SocialCardFormat;
  kind: SocialCardKind;
  hideNickname?: boolean;
  profile?: SocialCardProfile;
  badge?: SocialCardBadge;
  reflection?: string;
  createdAt?: string;
  customCaption?: string; // AI slogan for card
  customCallout?: string; // AI-generated 4K pedagogy line for progress card
  customStoriesLine?: string; // AI meme line for stories/reels
  vibeCheck?: { memeHeader: string; memeText: string; statBuff: string }; // Vibe Check block (meme header, punchline, RPG stat)
  badgeTitlesInPath?: string[];
  favoriteBadgeTitles?: string[];
  /** Progress card: badges to show as a carousel row above avatar (baseId, title, categoryId for image load) */
  badgeCarouselItems?: Array<{ baseId: string; title: string; categoryId: string; emoji?: string }>;
  /** Progress card only: optional PNG URLs (or ImageBitmap) for NanoBanana assets; drawn before procedural by skin */
  assets?: {
    framePng?: string;
    texturePng?: string;
    pillPng?: string;
    slotPng?: string;
    dividerPng?: string;
  };
  /** Progress card only: visual skin A (HUD) | B (Gacha) | D (fabric/patches). Default 'A'. */
  skin?: 'A' | 'B' | 'D';
  /** start_route only: 4K skill label for manifest line "Я выбираю путь X, чтобы прокачать Y." */
  manifestSkill?: string;
};

/** Input shape for progress_summary (extends SocialCardInput with assets/skin). */
export type ProgressSummaryInput = SocialCardInput & {
  kind: 'progress_summary';
  assets?: {
    framePng?: string;
    texturePng?: string;
    pillPng?: string;
    slotPng?: string;
    dividerPng?: string;
  };
  skin?: 'A' | 'B' | 'D';
};

export type SocialCardResult = {
  blob: Blob;
  mimeType: string;
  filename: string;
  title: string;
  text: string;
  width: number;
  height: number;
};

export type SocialShareOutcome = 'shared' | 'downloaded' | 'canceled';

const getDims = (format: SocialCardFormat) => {
  if (format === 'wide') return { width: 1920, height: 1080 };
  return { width: 1080, height: 1920 };
};

const hashToSeed = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const getRankColor = (rank: string): string => {
  if (rank.includes('Легенда')) return '#b088c8'; /* dark purple & maroon accent */
  if (rank.includes('Мастер')) return '#E0FFFF';
  if (rank.includes('Организатор')) return '#FF69B4';
  return '#4DA6FF';
};

const getCategoryAccent = (categoryId?: string): string => {
  const n = Number(String(categoryId || '').replace(/\D+/g, ''));
  if (!Number.isFinite(n) || n <= 0) return 'hsl(250, 80%, 65%)';
  const hue = (n * 37) % 360;
  return `hsl(${hue}, 85%, 65%)`;
};

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

// --- AAA progress_summary: anchors, helpers, scale ---
type Rect = { x: number; y: number; w: number; h: number; r?: number };
type Circle = { cx: number; cy: number; r: number };
type ProgressAnchors = {
  card: Rect;
  safe: Rect;
  frame: Rect;
  topHud?: Rect;
  pill: Rect;
  avatar: Circle;
  avatarRing: Circle;
  rankTitle: { x: number; y: number; maxW: number; baseline: 'alphabetic' | 'middle' };
  rankRibbon?: Rect;
  statsLine: { x: number; y: number; maxW: number };
  statsChips?: { left: Rect; right: Rect };
  slotsRow: { y: number; r: number; slots: { cx: number; locked: boolean }[] };
  buff: Rect;
  footerDivider: Rect;
  footer: Rect;
};

export const insetRect = (r: Rect, d: number, rr?: number): Rect => ({
  x: r.x + d,
  y: r.y + d,
  w: r.w - 2 * d,
  h: r.h - 2 * d,
  r: rr ?? r.r,
});

const withSaved = (ctx: CanvasRenderingContext2D, fn: () => void) => {
  ctx.save();
  try {
    fn();
  } finally {
    ctx.restore();
  }
};

const snap = (v: number) => Math.round(v) + 0.5;

const strokeRoundRect = (ctx: CanvasRenderingContext2D, rect: Rect) => {
  const r = rect.r ?? 0;
  roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
  ctx.stroke();
};

export const DEBUG_ANCHORS = false;

export const drawAnchorsDebug = (ctx: CanvasRenderingContext2D, A: ProgressAnchors, S: number) => {
  withSaved(ctx, () => {
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2 * S;
    ctx.strokeStyle = 'rgba(0,255,255,0.6)';
    strokeRoundRect(ctx, A.frame);
    ctx.strokeStyle = 'rgba(255,0,255,0.6)';
    strokeRoundRect(ctx, A.safe);
  });
};

const glowStroke = (
  ctx: CanvasRenderingContext2D,
  pathFn: () => void,
  color: string,
  baseWidth: number,
  steps: number,
  alpha0: number,
  composite?: GlobalCompositeOperation
) => {
  withSaved(ctx, () => {
    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let i = 0; i < steps; i++) {
      const t = i / Math.max(1, steps - 1);
      ctx.globalAlpha = alpha0 * (1 - t) * (1 - t);
      ctx.lineWidth = baseWidth + baseWidth * 2.2 * t;
      if (composite && i === 0) ctx.globalCompositeOperation = composite;
      ctx.beginPath();
      pathFn();
      ctx.stroke();
    }
  });
};

/** Fit font size so text fits in maxW (step down from base to min). Spec §5. */
const fitFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  base: number,
  min: number,
  fontFamily: string
): number => {
  for (let s = base; s >= min; s -= 1) {
    ctx.font = `${s}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxW) return s;
  }
  return min;
};

const FONT_FAMILY = '"Montserrat", system-ui, -apple-system, sans-serif';

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  const paragraphs = String(text || '')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
        return;
      }
      if (line) lines.push(line);
      line = word;
    });
    if (line) lines.push(line);
    if (paragraphIndex < paragraphs.length - 1) lines.push('');
  });
  return lines.length ? lines : [''];
};

const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create PNG blob'));
      },
      'image/png',
      0.92
    );
  });
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

const tryLoadBadgeImage = async (badge?: SocialCardBadge): Promise<HTMLImageElement | null> => {
  if (!badge?.title || !badge.categoryId) return null;
  const baseId = String(badge.baseId || badge.id || '')
    .split('.')
    .slice(0, 2)
    .join('.');
  if (!baseId) return null;
  const variant = getPreferredBadgeImageVariant(String(badge.categoryId));
  const jpgPath = getBadgeImagePath(
    baseId,
    badge.title,
    String(badge.categoryId),
    badge.id && String(badge.id).split('.').length === 3 ? badge.id : undefined,
    badge.levelLabel || undefined,
    variant
  );
  if (!jpgPath) return null;
  const webpPath = toSiblingImageUrl(jpgPath, 'webp');
  try {
    if (webpPath) return await loadImage(webpPath);
  } catch {
    // ignore
  }
  try {
    return await loadImage(jpgPath);
  } catch {
    return null;
  }
};

const tryLoadAvatarImage = async (avatar?: string): Promise<HTMLImageElement | null> => {
  const v = String(avatar || '').trim();
  if (!v) return null;
  if (
    v.startsWith('data:image/') ||
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('/')
  ) {
    try {
      return await loadImage(v);
    } catch {
      return null;
    }
  }
  return null;
};

const drawStars = (ctx: CanvasRenderingContext2D, width: number, height: number, seed: number) => {
  const rand = mulberry32(seed);
  const count = Math.round((width * height) / 90_000);
  for (let i = 0; i < count; i += 1) {
    const x = rand() * width;
    const y = rand() * height;
    const r = 0.6 + rand() * 1.8;
    const alpha = 0.12 + rand() * 0.35;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** Soft radial vignette over rect (progress card background). */
export const drawVignetteSoft = (ctx: CanvasRenderingContext2D, rect: Rect) => {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const r = Math.max(rect.w, rect.h) * 0.72;
  const vig = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.5, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.58)');
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
};

/** Darker corners with violet/blue tint (progress card). */
export const drawVignetteCorners = (ctx: CanvasRenderingContext2D, rect: Rect) => {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const r = Math.max(rect.w, rect.h) * 0.85;
  const vig = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.7, 'rgba(40,20,80,0.18)');
  vig.addColorStop(1, 'rgba(20,10,60,0.48)');
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
};

/** Rank accent glow; alpha 0.06–0.14. If useCenter true, gradient centered in rect (e.g. A.avatar); else lower third (card). */
export const drawRankAura = (
  ctx: CanvasRenderingContext2D,
  accent: string,
  rect: Rect,
  useCenter?: boolean
) => {
  const cx = rect.x + rect.w / 2;
  const cy = useCenter ? rect.y + rect.h / 2 : rect.y + rect.h * 0.65;
  const r = rect.w * 0.7;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, accent);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
};

let noisePatternCanvas: HTMLCanvasElement | null = null;

const getNoisePattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  if (!noisePatternCanvas) {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const cctx = c.getContext('2d');
    if (!cctx) return null;
    const id = cctx.getImageData(0, 0, size, size);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.floor(256 * Math.random());
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 200 + Math.floor(56 * Math.random());
    }
    cctx.putImageData(id, 0, 0);
    noisePatternCanvas = c;
  }
  return ctx.createPattern(noisePatternCanvas, 'repeat');
};

/** Fill rect with cached noise at low alpha (progress card texture). */
const drawNoisePattern = (ctx: CanvasRenderingContext2D, rect: Rect) => {
  const pattern = getNoisePattern(ctx);
  if (!pattern) return;
  withSaved(ctx, () => {
    ctx.fillStyle = pattern;
    ctx.globalAlpha = 0.058;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  });
};

/** Frame skin A: double stroke + inner bevel + HUD corner brackets. */
const drawFrameA = (ctx: CanvasRenderingContext2D, frame: Rect, accent: string, S: number) => {
  const { x, y, w, h, r } = frame;
  const rad = r ?? 0;
  withSaved(ctx, () => {
    // Outer stroke (1px, crisp)
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    roundRectPath(ctx, snap(x), snap(y), w, h, rad);
    ctx.stroke();
    // Inner stroke (accent)
    const frameGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    frameGrad.addColorStop(0, accent);
    frameGrad.addColorStop(0.5, accent);
    frameGrad.addColorStop(1, accent);
    ctx.strokeStyle = frameGrad;
    ctx.lineWidth = Math.max(1, snap(2.5 * S));
    roundRectPath(ctx, x, y, w, h, rad);
    ctx.stroke();
    // Inner bevel: slight inset highlight
    const bevInset = 2;
    withSaved(ctx, () => {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      roundRectPath(
        ctx,
        x + bevInset,
        y + bevInset,
        w - bevInset * 2,
        h - bevInset * 2,
        Math.max(0, rad - bevInset)
      );
      ctx.stroke();
    });
    // HUD corner brackets (L-shapes)
    const bracketLen = Math.round(27 * S);
    ctx.strokeStyle = 'rgba(255,255,255,0.68)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'square';
    const drawBracket = (bx: number, by: number, dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(snap(bx), snap(by));
      ctx.lineTo(snap(bx + dx * bracketLen), snap(by));
      ctx.moveTo(snap(bx), snap(by));
      ctx.lineTo(snap(bx), snap(by + dy * bracketLen));
      ctx.stroke();
    };
    drawBracket(x, y, 1, 1); // top-left
    drawBracket(x + w, y, -1, 1); // top-right
    drawBracket(x + w, y + h, -1, -1); // bottom-right
    drawBracket(x, y + h, 1, -1); // bottom-left
  });
};

/** Frame skin B: card edge — outer warm (gold/accent), inner cold (violet); corner arcs. */
export const drawFrameB = (ctx: CanvasRenderingContext2D, frame: Rect, _accent: string, S: number) => {
  const { x, y, w, h, r: rad } = frame;
  const r = rad ?? 0;
  withSaved(ctx, () => {
    const gold = '#e8c547';
    ctx.strokeStyle = gold;
    ctx.lineWidth = Math.max(1, 3 * S);
    roundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,80,180,0.85)';
    ctx.lineWidth = Math.max(1, 2 * S);
    roundRectPath(ctx, x + 4 * S, y + 4 * S, w - 8 * S, h - 8 * S, Math.max(0, r - 4 * S));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    const arcR = 12 * S;
    [x + r, x + w - r, x + w - r, x + r].forEach((cx, i) => {
      const cy = i < 2 ? y + r : y + h - r;
      const start = i === 0 ? Math.PI * 0.5 : i === 1 ? 0 : i === 2 ? Math.PI * 1.5 : Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, start, start + Math.PI * 0.5);
      ctx.stroke();
    });
  });
};

/** Frame skin D: stitching — dashed stroke along path; light wear at corners. */
export const drawFrameD = (ctx: CanvasRenderingContext2D, frame: Rect, _accent: string, S: number) => {
  const { x, y, w, h, r: rad } = frame;
  const r = rad ?? 0;
  withSaved(ctx, () => {
    ctx.strokeStyle = 'rgba(200,180,160,0.6)';
    ctx.lineWidth = Math.max(1, 2 * S);
    const step = 8 * S;
    const segLen = 4 * S;
    const drawStitchSide = (sx: number, sy: number, ex: number, ey: number) => {
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.hypot(dx, dy);
      const n = Math.max(1, Math.floor(len / step));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = sx + dx * t;
        const py = sy + dy * t;
        const tx = px + (dy / len) * segLen;
        const ty = py - (dx / len) * segLen;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    };
    const inset = 3 * S;
    const x0 = x + inset;
    const y0 = y + inset;
    const x1 = x + w - inset;
    const y1 = y + h - inset;
    drawStitchSide(x0 + r, y0, x1 - r, y0);
    drawStitchSide(x1, y0 + r, x1, y1 - r);
    drawStitchSide(x1 - r, y1, x0 + r, y1);
    drawStitchSide(x0, y1 - r, x0, y0 + r);
    ctx.fillStyle = 'rgba(80,60,50,0.12)';
    ctx.beginPath();
    ctx.arc(x + 20 * S, y + 20 * S, 25 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w - 20 * S, y + h - 20 * S, 25 * S, 0, Math.PI * 2);
    ctx.fill();
  });
};

/** Pill skin A: glass + accent stroke + micro-blick + 3 HUD ticks each side. */
export const drawPillA = (
  ctx: CanvasRenderingContext2D,
  pill: Rect,
  pillText: string,
  pillPaddingX: number,
  accent: string,
  S: number
) => {
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.r!);
  const pillGrad = ctx.createLinearGradient(pill.x, pill.y, pill.x, pill.y + pill.h);
  pillGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
  pillGrad.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = pillGrad;
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = Math.max(1, 2 * S);
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.r!);
  ctx.stroke();
  ctx.globalAlpha = 1;
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.r!);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(pill.x, pill.y, pill.w, Math.max(2, pill.h * 0.2));
  ctx.restore();
  const tickLen = 6 * S;
  const tickY = pill.y + pill.h / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const lx = pill.x + pill.w * 0.18 - i * (8 * S);
    ctx.beginPath();
    ctx.moveTo(snap(lx), tickY);
    ctx.lineTo(snap(lx + tickLen), tickY);
    ctx.stroke();
    const rx = pill.x + pill.w * 0.82 + i * (8 * S);
    ctx.beginPath();
    ctx.moveTo(snap(rx - tickLen), tickY);
    ctx.lineTo(snap(rx), tickY);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pill.x + pillPaddingX, pill.y + pill.h / 2);
};

/** Pill skin B: gacha card strip — gold edge, violet inner. */
export const drawPillB = (
  ctx: CanvasRenderingContext2D,
  pill: Rect,
  pillText: string,
  pillPaddingX: number,
  _accent: string,
  S: number
) => {
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.r!);
  const pillGrad = ctx.createLinearGradient(pill.x, pill.y, pill.x + pill.w, pill.y);
  pillGrad.addColorStop(0, 'rgba(180,120,255,0.2)');
  pillGrad.addColorStop(1, 'rgba(120,80,180,0.15)');
  ctx.fillStyle = pillGrad;
  ctx.fill();
  ctx.strokeStyle = '#e8c547';
  ctx.lineWidth = Math.max(1, 2 * S);
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.r!);
  ctx.stroke();
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.r!);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(pill.x, pill.y, pill.w, Math.max(2, pill.h * 0.2));
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pill.x + pillPaddingX, pill.y + pill.h / 2);
};

/** Pill skin D: fabric label — subtle stitch outline. */
export const drawPillD = (
  ctx: CanvasRenderingContext2D,
  pill: Rect,
  pillText: string,
  pillPaddingX: number,
  _accent: string,
  S: number
) => {
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.r!);
  const pillGrad = ctx.createLinearGradient(pill.x, pill.y, pill.x, pill.y + pill.h);
  pillGrad.addColorStop(0, 'rgba(220,200,180,0.14)');
  pillGrad.addColorStop(1, 'rgba(180,160,140,0.08)');
  ctx.fillStyle = pillGrad;
  ctx.fill();
  drawNoisePattern(ctx, pill);
  ctx.strokeStyle = 'rgba(160,140,120,0.5)';
  ctx.lineWidth = Math.max(1, 1.5 * S);
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.r!);
  ctx.stroke();
  roundRectPath(ctx, pill.x, pill.y, pill.w, pill.h, pill.r!);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(pill.x, pill.y, pill.w, Math.max(2, pill.h * 0.2));
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pill.x + pillPaddingX, pill.y + pill.h / 2);
};

const buildTitle = (input: SocialCardInput): string => {
  switch (input.kind) {
    case 'start_route':
      return 'Старт маршрута';
    case 'achieved_level':
      return 'Достижение';
    case 'favorite':
      return 'Избранное';
    case 'inspector_mission':
      return 'Рапорт Инспектора';
    case 'creator_proposal':
      return 'Карточка Созидателя';
    case 'creator_highlight':
      return 'Созидатель';
    default:
      return 'Мой прогресс';
  }
};

const CAPTION_CTA = 'Присоединяйся к Путеводителю';

const isCalloutValid = (raw: string): boolean => {
  const s = String(raw || '').trim();
  if (!s) return false;
  if (s.length > 40 || s.toLowerCase().includes('идей для')) return false;
  return true;
};

const buildCaption = (input: SocialCardInput): string => {
  const parts: string[] = [];
  if (input.customCaption) parts.push(input.customCaption);
  if (input.customCallout && isCalloutValid(input.customCallout)) parts.push(input.customCallout);
  if (input.customStoriesLine && String(input.customStoriesLine).trim())
    parts.push(String(input.customStoriesLine).trim());
  if (input.vibeCheck) {
    if (input.vibeCheck.memeHeader) parts.push(input.vibeCheck.memeHeader);
    if (input.vibeCheck.memeText) parts.push(input.vibeCheck.memeText);
    if (input.vibeCheck.statBuff) parts.push(input.vibeCheck.statBuff);
  }
  if (parts.length > 0) {
    return `${parts.join('\n\n')}\n\n${CAPTION_CTA} ${HASHTAGS}`;
  }

  const nickname = String(input.profile?.nickname || '').trim();
  const hideNickname = Boolean(input.hideNickname);
  const who = !hideNickname && nickname ? nickname : 'Я';

  const badgeTitle = String(input.badge?.title || '').trim();
  const levelLabel = String(input.badge?.levelLabel || '').trim();
  const rank = String(input.profile?.rank || '').trim();
  const achieved = Number(input.profile?.totalLevelsAchieved || 0);
  const started = Number(input.profile?.totalBadgesStarted || 0);

  if (input.kind === 'inspector_mission') {
    return `${who} выполнил(а) миссию дня «${badgeTitle}» и получил(а) звание «${levelLabel}»! Делаем лагерь лучше вместе.`;
  }

  if (input.kind === 'progress_summary') {
    const levelsWord = pluralizeRu(achieved, ['уровень', 'уровня', 'уровней']);
    return `${who} в Путеводителе Реального Лагеря: ${rank || 'мой путь'}. Закрыто ${achieved} ${levelsWord}. В пути: ${started}.`;
  }

  if (input.kind === 'start_route') {
    return `${who} начал(а) маршрут «${badgeTitle || 'новый значок'}» в Путеводителе Реального Лагеря.`;
  }

  if (input.kind === 'favorite') {
    return `${who} добавил(а) «${badgeTitle || 'значок'}» в избранное. Мой путь — мой выбор.`;
  }

  if (input.kind === 'creator_proposal') {
    const line = `Я предлагаю новый смысл: Значок ${badgeTitle || 'новый'}. Кто за?`;
    return `${line}\n\n${CAPTION_CTA} ${HASHTAGS}`;
  }

  if (input.kind === 'creator_highlight') {
    const creatorNick = !hideNickname && nickname ? nickname : 'Я';
    return `${creatorNick} — Созидатель в Путеводителе Реального Лагеря. Создаю значки и вдохновляю!\n\n${CAPTION_CTA} ${HASHTAGS}`;
  }

  const reflection = String(input.reflection || '').trim();
  const reflectionLine = reflection ? `\n\n«${reflection.slice(0, 140)}»` : '';
  return `${who} выполнил(а) уровень «${badgeTitle || 'значок'}${levelLabel ? ` — ${levelLabel}` : ''}».${reflectionLine}`;
};

const formatDate = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU');
};

const CTA_FOOTER = 'Присоединяйся к Путеводителю';
const HASHTAGS = '#Путеводитель #РеальныйЛагерь';
const FOOTER_TAGLINE = 'Реальные Значки — маршруты развития';
const PROGRESS_WIDE_BG_URL = '/фон_генерации_пост.jpg';
const PROGRESS_STORY_BG_URL = '/фон_шеринг_прогресс_сторис.jpg';

/**
 * AAA pipeline for progress_summary only (spec §9).
 * Order: 1) BG 2) FRAME 3) BRAND+PILL 4) AVATAR 5) RANK 6) STATS (two chips) 7) SLOTS 8) BUFF 9) FOOTER, then frame on top.
 */
/** Try load image from URL for progress card assets. Returns null on failure. */
export const tryLoadAsset = async (url: string): Promise<HTMLImageElement | null> => {
  const v = String(url || '').trim();
  if (!v) return null;
  try {
    return await loadImage(v);
  } catch {
    return null;
  }
};

async function drawProgressSummaryAAA(
  ctx: CanvasRenderingContext2D,
  input: SocialCardInput,
  width: number,
  height: number,
  seed: number,
  accent: string,
  dateLabel: string
): Promise<void> {
  const S = width / 1080;
  const isPortrait = height > width;
  const margin = Math.round(width * 0.05);

  const applyShadow = (blur = 12, alpha = 0.8) => {
    ctx.shadowBlur = blur;
    ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  };
  const clearShadow = () => { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; };

  const drawGlassCard = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.save();
    try {
      roundRectPath(ctx, x, y, w, h, r);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2 * S;
      ctx.stroke();
    } finally {
      ctx.restore();
    }
  };
  
  // 1) BACKGROUND (Deep mesh gradient + stars)
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#0a0a16');
  bg.addColorStop(0.5, '#0e0c24');
  bg.addColorStop(1, '#080512');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(width/2, height*0.3, 0, width/2, height*0.3, width*0.8);
  glow.addColorStop(0, accent);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  
  drawStars(ctx, width, height, seed);
  drawNoisePattern(ctx, {x:0, y:0, w:width, h:height});

  // 2) HEADER
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `900 ${Math.round(48 * S)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  applyShadow(10);
  ctx.fillText('ПУТЕВОДИТЕЛЬ', margin, margin);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `700 ${Math.round(24 * S)}px ${FONT_FAMILY}`;
  ctx.fillText('РЕАЛЬНЫЙ ЛАГЕРЬ', margin, margin + 50 * S);
  clearShadow();

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRectPath(ctx, width - margin - 240*S, margin, 240*S, 65*S, 32*S);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `800 ${Math.round(24 * S)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('МОЙ ПРОГРЕСС', width - margin - 120*S, margin + 32*S);

  // 3) PROFILE BENTO CARD
  const cardPad = 40 * S;
  
  let pX = margin;
  let pY = margin + 140 * S;
  let pW = width - margin * 2;
  let pH = 340 * S;
  
  let cX = margin;
  let cY = pY + pH + 40 * S;
  let cW = width - margin * 2;
  let cH = 280 * S;
  
  if (!isPortrait) {
     pY = margin + 110 * S;
     pW = (width - margin * 2) * 0.55 - 20 * S;
     pH = 290 * S;
     cX = pX + pW + 40 * S;
     cY = pY;
     cW = (width - margin * 2) - pW - 40 * S;
     cH = pH; // match profile height
  }

  drawGlassCard(pX, pY, pW, pH, 40 * S);
  
  // Avatar
  const avatarSize = isPortrait ? 220 * S : 160 * S;
  const avatarX = pX + cardPad;
  const avatarY = pY + (pH - avatarSize)/2;
  const avatarCx = avatarX + avatarSize/2;
  const avatarCy = avatarY + avatarSize/2;

  glowStroke(ctx, () => ctx.arc(avatarCx, avatarCy, avatarSize/2, 0, Math.PI*2), accent, 4, 5, 0.4);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6 * S;
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarSize/2, 0, Math.PI*2);
  ctx.stroke();

  const avatarImage = await tryLoadAvatarImage(input.profile?.avatar);
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarSize/2 - 4*S, 0, Math.PI*2);
  ctx.clip();
  if (avatarImage) {
    ctx.drawImage(avatarImage, avatarX + 4*S, avatarY + 4*S, avatarSize - 8*S, avatarSize - 8*S);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.font = `900 ${100*S}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧑‍🚀', avatarCx, avatarCy + 8*S);
  }
  ctx.restore();

  // Profile Text
  const textX = avatarX + avatarSize + cardPad + 10*S;
  let nameY = pY + cardPad + 10*S;
  
  const rankText = String(input.profile?.rank || 'Мой путь').trim();
  const nickname = String(input.profile?.nickname || 'Игрок').trim();

  applyShadow(12);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `700 ${36*S}px ${FONT_FAMILY}`;
  ctx.fillText(nickname, textX, nameY);
  
  ctx.fillStyle = 'rgba(255,255,255,1)';
  let rankFontSize = fitFontSize(ctx, rankText.toUpperCase(), pW - (textX - pX) - cardPad, 68*S, 32*S, FONT_FAMILY);
  ctx.font = `900 ${rankFontSize}px ${FONT_FAMILY}`;
  ctx.fillText(rankText.toUpperCase(), textX, nameY + 50*S);
  clearShadow();

  // Stats Chips
  const achieved = Number(input.profile?.totalLevelsAchieved ?? 0);
  const inProgress = Number(input.profile?.totalBadgesStarted ?? 0);
  const chipY = nameY + rankFontSize + (isPortrait ? 70*S : 35*S);
  
  const drawChip = (x: number, y: number, label: string) => {
    ctx.font = `800 ${25*S}px ${FONT_FAMILY}`;
    const tw = ctx.measureText(label).width;
    const w = tw + 60*S;
    const h = 55*S;
    
    ctx.save();
    try {
      roundRectPath(ctx, x, y, w, h, h/2);
      let grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, 'rgba(255,255,255,0.15)');
      grad.addColorStop(1, 'rgba(255,255,255,0.04)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5*S;
      ctx.stroke();
      
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x + 22*S, y + h/2, 5*S, 0, Math.PI*2);
      ctx.fill();
      
      applyShadow(8);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 38*S, y + h/2);
    } finally {
      ctx.restore();
    }
    return w;
  };
  
  ctx.font = `800 ${25*S}px ${FONT_FAMILY}`;
  const label1 = `Закрыто ${achieved}`;
  const label2 = `В пути ${inProgress}`;
  const w1 = ctx.measureText(label1).width + 60*S;
  const w2 = ctx.measureText(label2).width + 60*S;
  
  if (textX + w1 + 15*S + w2 > pX + pW - cardPad) {
      drawChip(textX, chipY, label1);
      drawChip(textX, chipY + 55*S + 12*S, label2);
  } else {
      drawChip(textX, chipY, label1);
      drawChip(textX + w1 + 15*S, chipY, label2);
  }

  // 4) BADGES COLLECTION BENTO CARD
  drawGlassCard(cX, cY, cW, cH, 40*S);
  
  applyShadow(12);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `800 ${28*S}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('КОЛЛЕКЦИЯ ЗНАЧКОВ', cX + cardPad, cY + cardPad);
  clearShadow();

  const items = input.badgeCarouselItems?.slice(0, 10) || [];
  const badgeSize = isPortrait ? 130 * S : 120 * S;
  const badgeGap = 20 * S;
  
  // Calculate how many fit in row
  const rowCapacity = Math.floor((cW - cardPad * 2 + badgeGap) / (badgeSize + badgeGap));
  const cols = Math.min(rowCapacity, Math.max(1, items.length));
  
  const slotsW = cols * badgeSize + Math.max(0, cols - 1) * badgeGap;
  // Center horizontally within cX..cX+cW
  const rowStartX = cX + (cW - slotsW)/2;
  
  // If wide format, we might have 2 rows depending on items!
  const startY = cY + cardPad + 60*S;
  
  if (items.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${32*S}px ${FONT_FAMILY}`;
      ctx.fillText('Пока нет значков. Выбери маршрут!', cX + cW/2, startY + badgeSize/2);
  }

  for(let i=0; i<items.length; i++) {
    if (!isPortrait && items.length > cols * 2) break; // safety
    if (isPortrait && i >= cols) break; // only 1 row in portrait
    
    const rowIdx = Math.floor(i / cols);
    const colIdx = i % cols;
    const bx = rowStartX + colIdx * (badgeSize + badgeGap);
    const by = startY + rowIdx * (badgeSize + badgeGap + 20*S);
    
    if (by + badgeSize > cY + cH) break; // don't overflow card vertically
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(bx + badgeSize/2, by + badgeSize/2, badgeSize/2 + 6*S, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const img = await tryLoadBadgeImage({
      baseId: items[i].baseId || '',
      id: items[i].baseId || '',
      title: items[i].title,
      categoryId: items[i].categoryId,
      emoji: items[i].emoji,
    });
    
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx + badgeSize/2, by + badgeSize/2, badgeSize/2, 0, Math.PI*2);
      ctx.clip();
      ctx.drawImage(img, bx, by, badgeSize, badgeSize);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.arc(bx + badgeSize/2, by + badgeSize/2, badgeSize/2, 0, Math.PI*2);
      ctx.fill();
      if (items[i].emoji) {
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.font = `900 ${65*S}px ${FONT_FAMILY}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(items[i].emoji || '', bx + badgeSize/2, by + badgeSize/2 + 6*S);
      } else {
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.font = `900 ${35*S}px ${FONT_FAMILY}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔒', bx + badgeSize/2, by + badgeSize/2);
      }
    }
  }

  // 5) AI TEXT / VIBE CHECK BENTO
  let currentY = Math.max(pY + pH, cY + cH) + 40*S;
  const hasText = input.customCaption || input.customCallout || (input.vibeCheck && input.vibeCheck.memeText);
  if (hasText && currentY < height - 160*S) {
     const bannerH = height - currentY - 140*S; 
     drawGlassCard(margin, currentY, width - margin*2, bannerH, 40*S);
     
     let textCursorY = currentY + cardPad;
     applyShadow(12);

     if (input.vibeCheck?.memeHeader) {
       ctx.fillStyle = accent;
       ctx.font = `900 ${42*S}px ${FONT_FAMILY}`;
       ctx.textAlign = 'left';
       ctx.textBaseline = 'top';
       const headLines = wrapText(ctx, input.vibeCheck.memeHeader.toUpperCase(), width - margin*2 - cardPad*2);
       headLines.forEach((l, idx) => {
         ctx.fillText(l, margin + cardPad, textCursorY + idx*52*S);
       });
       textCursorY += headLines.length * 52*S + 25*S;
     }

     const textStr = input.customCaption || input.customCallout || input.vibeCheck?.memeText || '';
     if (textStr) {
       ctx.fillStyle = 'rgba(255,255,255,0.95)';
       ctx.font = `800 ${36*S}px ${FONT_FAMILY}`;
       ctx.textAlign = 'left';
       ctx.textBaseline = 'top';
       const lines = wrapText(ctx, textStr, width - margin*2 - cardPad*2).slice(0, 5);
       lines.forEach((l, idx) => {
         ctx.fillText(l, margin + cardPad, textCursorY + idx*48*S);
       });
     }
     clearShadow();
  }

  // 6) FOOTER
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(margin, height - 100*S, width - margin*2, 2*S);
  
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `700 ${24*S}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('ПРИСОЕДИНЯЙСЯ К ПУТЕВОДИТЕЛЮ', margin, height - 70*S);
  ctx.textAlign = 'right';
  ctx.fillText(dateLabel, width - margin, height - 70*S);
}

export const generateSocialCard = async (input: SocialCardInput): Promise<SocialCardResult> => {
  if (typeof document === 'undefined') {
    throw new Error('Social card generation is only available in browser');
  }

  const { width, height } = getDims(input.format);
  const seed = hashToSeed(
    [
      input.kind,
      input.format,
      input.badge?.id || input.badge?.baseId || '',
      input.profile?.nickname || '',
      input.profile?.rank || '',
    ].join('|')
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const isPortrait = height > width;
  const margin = Math.round(width * 0.075);
  const createdAt = input.createdAt || new Date().toISOString();
  const dateLabel = formatDate(createdAt);

  const rank = String(input.profile?.rank || '').trim();
  let accent = rank ? getRankColor(rank) : getCategoryAccent(input.badge?.categoryId);
  if (input.kind === 'inspector_mission') {
    accent = '#38ef7d'; // Inspector Green
  }

  // AAA pipeline for progress_summary only; then return
  if (input.kind === 'progress_summary') {
    await drawProgressSummaryAAA(ctx, input, width, height, seed, accent, dateLabel);
    const mimeType = 'image/png';
    const blob = await canvasToPngBlob(canvas);
    const baseName = `rl_${input.kind}_${input.format}_${createdAt.split('T')[0]}`;
    const filename = `${baseName}.png`;
    const title = buildTitle(input);
    const text = buildCaption(input);
    return { blob, mimeType, filename, title, text, width, height };
  }

  // creator_highlight: simple gradient card with nickname + creator stats
  if (input.kind === 'creator_highlight') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0f0c29');
    grad.addColorStop(0.5, '#302b63');
    grad.addColorStop(1, '#24243e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    drawStars(ctx, width, height, seed);
    // Creator emoji
    const ctrY = isPortrait ? height * 0.3 : height * 0.35;
    ctx.fillStyle = 'rgba(245,158,11,0.9)';
    ctx.font = `${Math.round(width * 0.12)}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎨', width / 2, ctrY);
    // Nickname
    const nick = String(input.profile?.nickname || 'Созидатель').trim();
    ctx.fillStyle = '#f59e0b';
    const nickSize = fitFontSize(
      ctx,
      nick,
      width * 0.7,
      Math.round(width * 0.06),
      Math.round(width * 0.03),
      FONT_FAMILY
    );
    ctx.font = `900 ${nickSize}px ${FONT_FAMILY}`;
    ctx.fillText(nick, width / 2, ctrY + width * 0.12);
    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `600 ${Math.round(width * 0.025)}px ${FONT_FAMILY}`;
    ctx.fillText('Созидатель', width / 2, ctrY + width * 0.17);
    // Stats
    const statsY = ctrY + width * 0.26;
    const achieved = Number(input.profile?.totalLevelsAchieved ?? 0);
    const started = Number(input.profile?.totalBadgesStarted ?? 0);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.round(width * 0.03)}px ${FONT_FAMILY}`;
    ctx.fillText(`${achieved} значков · ${started} лайков`, width / 2, statsY);
    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `500 ${Math.round(width * 0.018)}px ${FONT_FAMILY}`;
    ctx.fillText(FOOTER_TAGLINE, width / 2, height - margin);
    const blob = await canvasToPngBlob(canvas);
    const title = buildTitle(input);
    const text = buildCaption(input);
    const filename = `rl_creator_highlight_${createdAt.split('T')[0]}.png`;
    return { blob, mimeType: 'image/png', filename, title, text, width, height };
  }

  // Legacy path: other card kinds
  let usedImageBg = false;
  if (input.format === 'wide') {
    try {
      const bgImg = await loadImage(PROGRESS_WIDE_BG_URL);
      ctx.drawImage(bgImg, 0, 0, width, height);
      usedImageBg = true;
    } catch {
      // fallback to gradient below
    }
  } else if (input.format === 'story') {
    try {
      const bgImg = await loadImage(PROGRESS_STORY_BG_URL);
      ctx.drawImage(bgImg, 0, 0, width, height);
      usedImageBg = true;
    } catch {
      // fallback to gradient below
    }
  }
  if (!usedImageBg) {
    // Background
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, 'rgba(9,6,20,1)');
    bg.addColorStop(0.45, 'rgba(26,15,46,1)');
    bg.addColorStop(1, 'rgba(10,7,22,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Accent glow
    ctx.save();
    ctx.globalAlpha = 0.18;
    const glow = ctx.createRadialGradient(
      width * 0.82,
      height * 0.18,
      0,
      width * 0.82,
      height * 0.18,
      width * 0.62
    );
    glow.addColorStop(0, String(accent));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    drawStars(ctx, width, height, seed);
  }

  // Brand (top-left)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `900 ${Math.round(width * 0.05)}px "Montserrat", system-ui, -apple-system, sans-serif`;
  ctx.fillText('Путеводитель', margin, margin * 0.7);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `700 ${Math.round(width * 0.028)}px "Montserrat", system-ui, -apple-system, sans-serif`;
  ctx.fillText('Реальный Лагерь', margin, margin * 0.7 + Math.round(width * 0.06));

  // Event pill (top-right)
  const pillText = (() => {
    switch (input.kind) {
      case 'start_route':
        return 'СТАРТ МАРШРУТА';
      case 'achieved_level':
        return 'УРОВЕНЬ ВЫПОЛНЕН';
      case 'favorite':
        return 'В ИЗБРАННОЕ';
      case 'inspector_mission':
        return 'МИССИЯ ВЫПОЛНЕНА';
      case 'creator_proposal':
        return 'КАРТОЧКА СОЗИДАТЕЛЯ';
      default:
        return 'МОЙ ПРОГРЕСС';
    }
  })();

  ctx.font = `800 ${Math.round(width * 0.022)}px "Montserrat", system-ui, -apple-system, sans-serif`;
  const pillPaddingX = Math.round(width * 0.018);
  const pillPaddingY = Math.round(width * 0.012);
  const pillW = Math.round(ctx.measureText(pillText).width) + pillPaddingX * 2;
  const pillH = Math.round(width * 0.045) + pillPaddingY * 2;
  const pillX = width - margin - pillW;
  const pillY = margin * 0.72;
  ctx.save();
  roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, pillX + pillPaddingX, pillY + pillH / 2);

  // Main icon (avatar or badge)
  const iconSize = Math.round(Math.min(width, height) * (isPortrait ? 0.28 : 0.26));
  const iconX = isPortrait ? Math.round((width - iconSize) / 2) : margin;
  const iconY = isPortrait ? Math.round(height * 0.26) : Math.round(height * 0.28);
  const iconCenterX = iconX + iconSize / 2;
  const iconCenterY = iconY + iconSize / 2;

  const badgeImage = await tryLoadBadgeImage(input.badge);
  const avatarImage = null;
  const emojiFallback = String(input.badge?.emoji || '🏆').trim() || '🏆';

  // Ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(iconCenterX, iconCenterY, iconSize / 2 + 12, 0, Math.PI * 2);
  ctx.strokeStyle = String(accent);
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.restore();

  // Clip + draw image
  ctx.save();
  ctx.beginPath();
  ctx.arc(iconCenterX, iconCenterY, iconSize / 2, 0, Math.PI * 2);
  ctx.clip();
  if (badgeImage) {
    ctx.drawImage(badgeImage, iconX, iconY, iconSize, iconSize);
  } else if (avatarImage) {
    ctx.drawImage(avatarImage, iconX, iconY, iconSize, iconSize);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(iconX, iconY, iconSize, iconSize);
  }
  ctx.restore();

  if (!badgeImage && !avatarImage) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(iconSize * 0.55)}px "Montserrat", system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(emojiFallback, iconCenterX, iconCenterY + Math.round(iconSize * 0.03));
    ctx.restore();
  }

  // Text block
  const textX = isPortrait ? margin : iconX + iconSize + Math.round(margin * 0.75);
  const textY = isPortrait
    ? iconY + iconSize + Math.round(margin * 0.65)
    : Math.round(height * 0.26);
  const textMaxW = isPortrait ? width - margin * 2 : width - textX - margin;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `900 ${Math.round(width * (isPortrait ? 0.062 : 0.05))}px "Montserrat", system-ui, -apple-system, sans-serif`;

  const badgeTitle = String(input.badge?.title || '').trim();
  const headline =
    input.kind === 'creator_proposal'
      ? `Я предлагаю новый смысл: Значок ${badgeTitle || 'новый'}. Кто за?`
      : badgeTitle || 'Мой маршрут';
  const headlineLines = wrapText(ctx, headline, textMaxW);
  const headlineLineH = Math.round(width * (isPortrait ? 0.07 : 0.058));
  headlineLines.forEach((line, idx) => {
    ctx.fillText(line, textX, textY + idx * headlineLineH);
  });

  let cursorY = textY + headlineLines.length * headlineLineH + Math.round(width * 0.015);

  // Subheadline
  const levelLabel = String(input.badge?.levelLabel || '').trim();
  const manifestSkill = String(input.manifestSkill || '').trim();
  const sub =
    input.kind === 'creator_proposal'
      ? 'Предлагаю новый смысл в Путеводитель'
      : input.kind === 'favorite'
        ? 'Мой wishlist маршрутов'
        : input.kind === 'start_route' && manifestSkill
          ? `Я выбираю путь ${badgeTitle || 'значка'}, чтобы прокачать ${manifestSkill}.`
          : input.kind === 'start_route'
            ? 'Я выбираю направление и делаю первый шаг'
            : levelLabel
              ? `Уровень: ${levelLabel}`
              : 'Реальный опыт зафиксирован';

  ctx.font = `700 ${Math.round(width * (isPortrait ? 0.032 : 0.028))}px "Montserrat", system-ui, -apple-system, sans-serif`;
  const subLines = wrapText(ctx, sub, textMaxW);
  const subLineH = Math.round(width * (isPortrait ? 0.04 : 0.036));
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  subLines.forEach((line, idx) => {
    ctx.fillText(line, textX, cursorY + idx * subLineH);
  });
  cursorY += subLines.length * subLineH + Math.round(width * 0.02);

  // AI slogan (customCaption) — prominent "meme" block between stats and nickname
  const rawCaption = String(input.customCaption || '').trim();
  if (rawCaption) {
    const isManifestCaption = input.kind === 'start_route' && manifestSkill;
    const maxCaptionLen = isManifestCaption ? 120 : 80;
    const maxCaptionLines = isManifestCaption ? 3 : 2;
    const captionText =
      rawCaption.length > maxCaptionLen
        ? rawCaption.slice(0, maxCaptionLen - 1).trim() + '…'
        : rawCaption;
    const captionLines = wrapText(ctx, captionText, textMaxW).slice(0, maxCaptionLines);
    const captionFontSize = Math.round(width * (isPortrait ? 0.038 : 0.032));
    ctx.font = `800 ${captionFontSize}px "Montserrat", system-ui, -apple-system, sans-serif`;
    const captionLineH = Math.round(width * (isPortrait ? 0.048 : 0.042));
    cursorY += Math.round(width * 0.02);
    ctx.fillStyle = accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    captionLines.forEach((line, idx) => {
      ctx.fillText(line, textX, cursorY + idx * captionLineH);
    });
    cursorY += captionLines.length * captionLineH + Math.round(width * 0.025);
  }

  // Individualized callout from AI only (no duplicate stats)
  const rawCalloutWide = String(input.customCallout || '').trim();
  const calloutText = isCalloutValid(rawCalloutWide) ? rawCalloutWide : '';
  if (calloutText) {
    const calloutMaxLen = 50;
    const calloutDisplay =
      calloutText.length > calloutMaxLen
        ? calloutText.slice(0, calloutMaxLen - 1).trim() + '…'
        : calloutText;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `700 ${Math.round(width * (isPortrait ? 0.028 : 0.024))}px "Montserrat", system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(calloutDisplay, textX, cursorY);
    cursorY += Math.round(width * 0.04);
  }

  // Stories/reels meme line (AI)
  const rawStoriesLineLegacy = String(input.customStoriesLine || '').trim();
  if (rawStoriesLineLegacy) {
    const storiesMaxLen = 50;
    const storiesDisplay =
      rawStoriesLineLegacy.length > storiesMaxLen
        ? rawStoriesLineLegacy.slice(0, storiesMaxLen - 1).trim() + '…'
        : rawStoriesLineLegacy;
    const storiesLines = wrapText(ctx, storiesDisplay, textMaxW).slice(0, 2);
    const storiesFontSize = Math.round(width * (isPortrait ? 0.024 : 0.02));
    const storiesLineH = Math.round(width * (isPortrait ? 0.032 : 0.028));
    ctx.font = `600 italic ${storiesFontSize}px "Montserrat", system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    storiesLines.forEach((line, idx) => ctx.fillText(line, textX, cursorY + idx * storiesLineH));
    cursorY += storiesLines.length * storiesLineH + Math.round(width * 0.02);
  }

  // Vibe Check block (meme header, punchline, stat buff)
  const vc = input.vibeCheck;
  if (vc && (vc.memeHeader || vc.memeText || vc.statBuff)) {
    cursorY += Math.round(width * 0.02);
    const vcHeaderFontSize = Math.round(width * (isPortrait ? 0.024 : 0.02));
    const vcTextFontSize = Math.round(width * (isPortrait ? 0.032 : 0.028));
    const vcStatFontSize = Math.round(width * (isPortrait ? 0.022 : 0.02));
    const vcLineH = Math.round(width * (isPortrait ? 0.038 : 0.032));

    if (vc.memeHeader) {
      const headerDisplay = String(vc.memeHeader).trim().slice(0, 50).toUpperCase();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = `700 ${vcHeaderFontSize}px "Montserrat", system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(headerDisplay, textX, cursorY);
      cursorY += vcLineH;
    }
    if (vc.memeText) {
      const memeMaxLen = 120;
      const memeDisplay = String(vc.memeText).trim().slice(0, memeMaxLen);
      const memeLines = wrapText(ctx, memeDisplay, textMaxW).slice(0, 2);
      ctx.font = `800 ${vcTextFontSize}px "Montserrat", system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = accent;
      memeLines.forEach((line, idx) => {
        ctx.fillText(line, textX, cursorY + idx * vcLineH);
      });
      cursorY += memeLines.length * vcLineH + Math.round(width * 0.015);
    }
    if (vc.statBuff) {
      const statDisplay = String(vc.statBuff).trim().slice(0, 50);
      const statPlaqueH = Math.round(width * (isPortrait ? 0.055 : 0.048));
      const statPlaqueY = cursorY;
      const statPlaquePadding = Math.round(width * 0.02);
      ctx.save();
      roundRectPath(ctx, textX, statPlaqueY, textMaxW, statPlaqueH, statPlaqueH / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      const iconSize = Math.round(statPlaqueH * 0.55);
      ctx.font = `700 ${iconSize}px "Montserrat", system-ui, sans-serif`;
      ctx.fillStyle = accent;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', textX + statPlaquePadding, statPlaqueY + statPlaqueH / 2);
      ctx.font = `700 ${vcStatFontSize}px "Montserrat", system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(
        statDisplay,
        textX + statPlaquePadding + iconSize + Math.round(width * 0.015),
        statPlaqueY + statPlaqueH / 2
      );
      cursorY += statPlaqueH + Math.round(width * 0.025);
    }
  }

  // Optional nickname line
  const nickname = String(input.profile?.nickname || '').trim();
  if (!input.hideNickname && nickname) {
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = `700 ${Math.round(width * (isPortrait ? 0.027 : 0.024))}px "Montserrat", system-ui, -apple-system, sans-serif`;
    ctx.fillText(`Игрок: ${nickname}`, textX, cursorY);
    cursorY += Math.round(width * 0.042);
  }

  // Footer: two lines — CTA + hashtags above, then tagline + date
  const footerFontSize = Math.round(width * 0.022);
  const footerLineH = Math.round(width * 0.032);
  ctx.font = `700 ${footerFontSize}px "Montserrat", system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillText(CTA_FOOTER, margin, height - margin - footerLineH);
  ctx.textAlign = 'right';
  ctx.fillText(HASHTAGS, width - margin, height - margin - footerLineH);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(FOOTER_TAGLINE, margin, height - margin);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(dateLabel, width - margin, height - margin);

  const mimeType = 'image/png';
  const blob = await canvasToPngBlob(canvas);
  const baseName = `rl_${input.kind}_${input.format}_${createdAt.split('T')[0]}`;
  const filename = `${baseName}.png`;
  const title = buildTitle(input);
  const text = buildCaption(input);

  return { blob, mimeType, filename, title, text, width, height };
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  const value = String(text || '').trim();
  if (!value) return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
};

/**
 * Builds a shareable URL that opens the app to the given badge.
 * Uses query param view=badge&badgeId=... (see useAppController URL deep-links).
 */
export function getBadgeShareUrl(badgeId: string): string {
  if (typeof window === 'undefined') return '';
  const base =
    String(badgeId || '')
      .split('.')
      .slice(0, 2)
      .join('.') || badgeId;
  const origin = window.location.origin || '';
  const pathname = window.location.pathname || '/';
  const path = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const params = new URLSearchParams({ view: 'badge', badgeId: base });
  return `${origin}${path}?${params.toString()}`;
}

export const shareOrDownloadSocialCard = async (
  result: SocialCardResult
): Promise<SocialShareOutcome> => {
  const navAny = navigator as any;
  const canShare = typeof navAny?.share === 'function' && typeof navAny?.canShare === 'function';

  try {
    if (canShare) {
      const file = new File([result.blob], result.filename, { type: result.mimeType });
      const can = navAny.canShare({ files: [file] });
      if (can) {
        try {
          await navAny.share({ files: [file], title: result.title, text: result.text });
          return 'shared';
        } catch (e) {
          if ((e as any)?.name === 'AbortError') return 'canceled';
          throw e;
        }
      }
    }
  } catch {
    // ignore and fallback to download
  }

  downloadBlob(result.blob, result.filename);
  return 'downloaded';
};
