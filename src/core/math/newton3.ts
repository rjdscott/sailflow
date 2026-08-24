/**
 * Damped Newton solver for 3 coupled nonlinear equations in 3 unknowns.
 * Central-difference Jacobian, step halving (max 8 halvings) whenever a
 * full step would grow the residual, 3x3 solve via Gaussian elimination
 * with partial pivoting. Never returns NaN: a singular Jacobian or a
 * non-finite step reports converged=false with the last valid iterate.
 */

export type Vec3 = [number, number, number];

export interface Newton3Options {
  tol?: number;
  maxIter?: number;
  fdStep?: Vec3;
  damping?: boolean;
}

export interface Newton3Result {
  x: Vec3;
  residual: Vec3;
  iters: number;
  converged: boolean;
}

function maxAbs(v: Vec3): number {
  return Math.max(Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2]));
}

/** Solve J * dx = -r for dx via Gaussian elimination with partial pivoting. Null if singular. */
function solveNeg(J: number[][], r: Vec3): Vec3 | null {
  const m = [
    [J[0][0], J[0][1], J[0][2], -r[0]],
    [J[1][0], J[1][1], J[1][2], -r[1]],
    [J[2][0], J[2][1], J[2][2], -r[2]],
  ];

  for (let col = 0; col < 3; col++) {
    let pivotRow = col;
    let pivotVal = Math.abs(m[col][col]);
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(m[row][col]) > pivotVal) {
        pivotVal = Math.abs(m[row][col]);
        pivotRow = row;
      }
    }
    if (pivotVal < 1e-14) return null;
    if (pivotRow !== col) [m[col], m[pivotRow]] = [m[pivotRow], m[col]];

    for (let row = col + 1; row < 3; row++) {
      const factor = m[row][col] / m[col][col];
      for (let k = col; k < 4; k++) m[row][k] -= factor * m[col][k];
    }
  }

  const dx: Vec3 = [0, 0, 0];
  for (let row = 2; row >= 0; row--) {
    let sum = m[row][3];
    for (let col = row + 1; col < 3; col++) sum -= m[row][col] * dx[col];
    dx[row] = sum / m[row][row];
  }
  return dx;
}

function jacobian(f: (x: Vec3) => Vec3, x: Vec3, h: Vec3): number[][] {
  const J: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let j = 0; j < 3; j++) {
    const xp: Vec3 = [x[0], x[1], x[2]];
    const xm: Vec3 = [x[0], x[1], x[2]];
    xp[j] += h[j];
    xm[j] -= h[j];
    const fp = f(xp);
    const fm = f(xm);
    for (let i = 0; i < 3; i++) J[i][j] = (fp[i] - fm[i]) / (2 * h[j]);
  }
  return J;
}

export function newton3(
  residual: (x: Vec3) => Vec3,
  x0: Vec3,
  opts: Newton3Options = {},
): Newton3Result {
  const tol = opts.tol ?? 1e-9;
  const maxIter = opts.maxIter ?? 50;
  const fdStep = opts.fdStep ?? [1e-6, 1e-6, 1e-6];
  const damping = opts.damping ?? true;

  let x: Vec3 = [x0[0], x0[1], x0[2]];
  let r = residual(x);
  let rn = maxAbs(r);

  if (rn <= tol) return { x, residual: r, iters: 0, converged: true };

  for (let iter = 1; iter <= maxIter; iter++) {
    const J = jacobian(residual, x, fdStep);
    const dx = solveNeg(J, r);
    if (!dx || !dx.every(Number.isFinite)) {
      return { x, residual: r, iters: iter, converged: false };
    }

    let step = 1;
    let xNew: Vec3 = [x[0] + dx[0], x[1] + dx[1], x[2] + dx[2]];
    let rNew = residual(xNew);
    let rnNew = maxAbs(rNew);

    if (damping) {
      let halvings = 0;
      while (rnNew > rn && halvings < 8) {
        step /= 2;
        xNew = [x[0] + dx[0] * step, x[1] + dx[1] * step, x[2] + dx[2] * step];
        rNew = residual(xNew);
        rnNew = maxAbs(rNew);
        halvings++;
      }
    }

    if (!Number.isFinite(rnNew)) return { x, residual: r, iters: iter, converged: false };

    x = xNew;
    r = rNew;
    rn = rnNew;

    if (rn <= tol) return { x, residual: r, iters: iter, converged: true };
  }

  return { x, residual: r, iters: maxIter, converged: rn <= tol };
}
