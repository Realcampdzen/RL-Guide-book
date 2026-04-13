/**
 * Цилиндрическая проекция «вогнутого монитора» для панели Инспектор Пользы.
 * Ось цилиндра вдоль v; края закреплены на Z0, центр уходит дальше.
 *
 * u ∈ [-W/2, W/2], v ∈ [-H/2, H/2]
 * A = W/(2R), α(u) = u/R
 * X(u) = R·sin(α), Z(u) = Z0 + R·(cos(α) − cos(A)), Y(v) = v
 * x(u,v) = cx + f·X(u)/Z(u), y(u,v) = cy + f·Y(v)/Z(u)
 */

import { cssMatrix3dFromH, homographyFromRectToQuad, type Quad } from './cabinPlaneProjection';

export interface CylinderParams {
  /** Ширина панели (px) */
  W: number;
  /** Высота панели (px) */
  H: number;
  /** Число вертикальных полос меша */
  N: number;
  /** Стрела прогиба (глубина вогнутости, px). R = W²/(8s) при малых углах */
  s?: number;
  /** Радиус цилиндра (если задан, s игнорируется) */
  R?: number;
  /** Глубина краёв (Z0) */
  Z0?: number;
  /** Фокусное расстояние проекции */
  f?: number;
  /** Центр проекции (по умолчанию центр панели) */
  cx?: number;
  cy?: number;
}

/**
 * Угол полуразвёртки: A = W/(2R).
 */
function getA(W: number, R: number): number {
  return W / (2 * R);
}

/**
 * 3D координаты поверхности цилиндра (края на Z0, центр дальше).
 */
function surfaceX(u: number, R: number): number {
  const alpha = u / R;
  return R * Math.sin(alpha);
}

function surfaceZ(u: number, R: number, Z0: number, A: number): number {
  const alpha = u / R;
  return Z0 + R * (Math.cos(alpha) - Math.cos(A));
}

/**
 * Проекция 3D точки на экран: x = cx + f·X/Z, y = cy + f·Y/Z.
 */
function project(
  u: number,
  v: number,
  R: number,
  Z0: number,
  A: number,
  f: number,
  cx: number,
  cy: number
): { x: number; y: number } {
  const X = surfaceX(u, R);
  const Z = surfaceZ(u, R, Z0, A);
  const Y = v;
  return {
    x: cx + (f * X) / Z,
    y: cy + (f * Y) / Z,
  };
}

/**
 * Возвращает радиус R по стреле прогиба s: s ≈ W²/(8R) => R ≈ W²/(8s).
 */
export function radiusFromSag(W: number, s: number): number {
  return (W * W) / (8 * s);
}

/**
 * Углы полос u_j = -W/2 + j*W/N, j = 0..N.
 * Для полосы j квад: TL(u_j,-H/2), TR(u_{j+1},-H/2), BR(u_{j+1},H/2), BL(u_j,H/2).
 * Координаты возвращаются в пространстве панели: origin top-left, т.е. к x,y прибавляем (W/2, H/2).
 */
export function getCylinderStripQuads(params: CylinderParams): Quad[] {
  const { W, H, N, s = 18, Z0 = 600, f: fParam, cx: cxParam, cy: cyParam } = params;

  const R = params.R ?? radiusFromSag(W, s);
  const A = getA(W, R);

  const cx = cxParam ?? W / 2;
  const cy = cyParam ?? H / 2;
  const f = fParam ?? Z0;

  const quads: Quad[] = [];

  for (let j = 0; j < N; j++) {
    const uLeft = -W / 2 + (j * W) / N;
    const uRight = -W / 2 + ((j + 1) * W) / N;

    const pTL = project(uLeft, -H / 2, R, Z0, A, f, cx, cy);
    const pTR = project(uRight, -H / 2, R, Z0, A, f, cx, cy);
    const pBR = project(uRight, H / 2, R, Z0, A, f, cx, cy);
    const pBL = project(uLeft, H / 2, R, Z0, A, f, cx, cy);

    quads.push([
      { x: pTL.x + W / 2, y: pTL.y + H / 2 },
      { x: pTR.x + W / 2, y: pTR.y + H / 2 },
      { x: pBR.x + W / 2, y: pBR.y + H / 2 },
      { x: pBL.x + W / 2, y: pBL.y + H / 2 },
    ]);
  }

  return quads;
}

/**
 * Для каждой полосы j: гомография из прямоугольника (0,0)-(W/N,H) в квад в координатах панели.
 * Возвращает массив CSS matrix3d для применения к контенту полосы (transform-origin: 0 0).
 */
export function getCylinderStripTransforms(params: CylinderParams): string[] {
  const { W, H, N } = params;
  const quads = getCylinderStripQuads(params);
  const stripW = W / N;

  return quads.map((quad) => {
    const H_mat = homographyFromRectToQuad(stripW, H, quad);
    return cssMatrix3dFromH(H_mat);
  });
}
