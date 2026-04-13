/**
 * One camera + one plane: project card quads to screen, then homography → matrix3d.
 * All cards share the same yaw/pitch; they differ only by v (Y position on plane).
 */

const deg = (d: number) => (d * Math.PI) / 180;

function rotX(a: number): number[][] {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c],
  ];
}

function rotY(a: number): number[][] {
  const c = Math.cos(a),
    s = Math.sin(a);
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c],
  ];
}

function matMul3(A: number[][], B: number[][]): number[][] {
  const M = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      M[r][c] = A[r][0] * B[0][c] + A[r][1] * B[1][c] + A[r][2] * B[2][c];
    }
  }
  return M;
}

function matVec3(M: number[][], v: number[]): number[] {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
}

export interface ProjectCardQuadParams {
  W: number;
  H: number;
  u?: number;
  v?: number;
  f?: number;
  cx?: number;
  cy?: number;
  tz?: number;
  yaw?: number;
  pitch?: number;
}

/**
 * Returns quad corners in screen px: [{x,y}*4] in order: TL, TR, BR, BL.
 */
export function projectCardQuad({
  W,
  H,
  u = 0,
  v = 0,
  f = 1200,
  cx = 0,
  cy = 0,
  tz = 1400,
  yaw = -10,
  pitch = 2,
}: ProjectCardQuadParams): Array<{ x: number; y: number }> {
  const R = matMul3(rotX(deg(pitch)), rotY(deg(yaw)));

  const corners: Array<[number, number, number]> = [
    [u - W / 2, v - H / 2, 0],
    [u + W / 2, v - H / 2, 0],
    [u + W / 2, v + H / 2, 0],
    [u - W / 2, v + H / 2, 0],
  ];

  return corners.map(([x, y, z]) => {
    const [X, Y, Z0] = matVec3(R, [x, y, z]);
    const Z = Z0 + tz;
    const sx = cx + (f * X) / Z;
    const sy = cy + (f * Y) / Z;
    return { x: sx, y: sy };
  });
}

function gaussSolve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => row.concat([b[i]]));

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];

    const div = M[col][col];
    if (Math.abs(div) < 1e-12) throw new Error('Singular matrix');

    for (let c = col; c <= n; c++) M[col][c] /= div;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }

  return M.map((row) => row[n]);
}

export type Quad = Array<{ x: number; y: number }>;

/**
 * Homography from rectangle (0,0)-(w,h) to dst quad (TL, TR, BR, BL).
 */
export function homographyFromRectToQuad(w: number, h: number, quad: Quad): number[][] {
  const src: Array<[number, number]> = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const dst = quad.map((p) => [p.x, p.y]);

  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];

    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    B.push(u);

    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    B.push(v);
  }

  const [a, b, c, d, e, f, g, h_] = gaussSolve(A, B);

  return [
    [a, b, c],
    [d, e, f],
    [g, h_, 1],
  ];
}

/**
 * Convert 3x3 homography H to CSS matrix3d string (column-major).
 */
export function cssMatrix3dFromH(H: number[][]): string {
  const a = H[0][0],
    b = H[0][1],
    c = H[0][2];
  const d = H[1][0],
    e = H[1][1],
    f = H[1][2];
  const g = H[2][0],
    h = H[2][1];

  const m = [a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1];

  return `matrix3d(${m.map((v) => Number(v.toFixed(10))).join(',')})`;
}

export interface CabinPlaneParams {
  W: number;
  H: number;
  gap: number;
  cardCount: number;
  f?: number;
  cx?: number;
  cy?: number;
  tz?: number;
  yaw?: number;
  pitch?: number;
}

/**
 * Compute cx, cy so that card 0's TL projects to (0, 0).
 */
export function getCxCyForTLAtOrigin(params: {
  W: number;
  H: number;
  f: number;
  tz: number;
  yaw: number;
  pitch: number;
}): { cx: number; cy: number } {
  const { W, H, f, tz, yaw, pitch } = params;
  const R = matMul3(rotX(deg(pitch)), rotY(deg(yaw)));
  const tl = [-W / 2, -H / 2, 0] as const;
  const [X, Y, Z0] = matVec3(R, [...tl]);
  const Z = Z0 + tz;
  return {
    cx: -(f * X) / Z,
    cy: -(f * Y) / Z,
  };
}

/**
 * Returns one matrix3d string per card. Quad for card i is translated so TL is at (0, i*(H+gap)).
 */
export function getCardTransforms(params: CabinPlaneParams): string[] {
  const {
    W,
    H,
    gap,
    cardCount,
    f = 1200,
    cx: cxIn,
    cy: cyIn,
    tz = 1400,
    yaw = -10,
    pitch = 2,
  } = params;

  const { cx, cy } =
    cxIn !== undefined && cyIn !== undefined
      ? { cx: cxIn, cy: cyIn }
      : getCxCyForTLAtOrigin({ W, H, f, tz, yaw, pitch });

  const out: string[] = [];

  for (let i = 0; i < cardCount; i++) {
    const v = i * (H + gap);
    const quad = projectCardQuad({
      W,
      H,
      u: 0,
      v,
      f,
      cx,
      cy,
      tz,
      yaw,
      pitch,
    });

    const tl = quad[0];
    const quadInFlow: Quad = quad.map((p) => ({
      x: p.x - tl.x,
      y: p.y - tl.y + i * (H + gap),
    }));

    const H_mat = homographyFromRectToQuad(W, H, quadInFlow);
    out.push(cssMatrix3dFromH(H_mat));
  }

  return out;
}
