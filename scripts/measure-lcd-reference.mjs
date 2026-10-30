import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function solve(rows, values) {
  const a = rows.map((row, i) => [...row, values[i]]);
  for (let c = 0; c < 8; c++) {
    let pivot = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(a[r][c]) > Math.abs(a[pivot][c])) pivot = r;
    if (Math.abs(a[pivot][c]) < 1e-10) throw new Error('Degenerate LCD corners');
    [a[c], a[pivot]] = [a[pivot], a[c]];
    const divisor = a[c][c];
    for (let k = c; k <= 8; k++) a[c][k] /= divisor;
    for (let r = 0; r < 8; r++) if (r !== c) {
      const factor = a[r][c];
      for (let k = c; k <= 8; k++) a[r][k] -= factor * a[c][k];
    }
  }
  return a.map(row => row[8]);
}

const pointValid = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);

/** TL, TR, BR, BL; coordinates are continuous LCD boundary coordinates. */
export function lcdTransform(corners, target) {
  if (!Array.isArray(corners) || corners.length !== 4 || !corners.every(pointValid) ||
      !pointValid(target) || target.some(n => n <= 0)) throw new Error('Invalid corners or target');
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4], c = corners[(i + 2) % 4];
    const cross = (b[0]-a[0])*(c[1]-b[1]) - (b[1]-a[1])*(c[0]-b[0]);
    if (cross <= 1e-8) throw new Error('Corners must form a convex TL, TR, BR, BL polygon');
  }
  const [w,h] = target;
  const rows = [], values = [];
  corners.forEach(([x,y],i) => {
    const [u,v] = [[0,0],[w,0],[w,h],[0,h]][i];
    rows.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);
    values.push(u,v);
  });
  const m = solve(rows, values);
  return p => {
    if (!pointValid(p)) throw new Error('Invalid landmark');
    const [x,y] = p, denominator = m[6]*x+m[7]*y+1;
    if (Math.abs(denominator) < 1e-10) throw new Error('Landmark lies on projective horizon');
    return [(m[0]*x+m[1]*y+m[2])/denominator,(m[3]*x+m[4]*y+m[5])/denominator];
  };
}

export function measureReference({ corners, target, points, cornerErrorPx, pointErrorPx }) {
  if (!Number.isFinite(cornerErrorPx) || cornerErrorPx < 0 ||
      !Number.isFinite(pointErrorPx) || pointErrorPx < 0 ||
      !points || Array.isArray(points) || typeof points !== 'object') throw new Error('Explicit nonnegative sampling errors and named points required');
  const transform = lcdTransform(corners, target);
  const entries = Object.entries(points).map(([id,p]) => ({id, source:p, normalized:transform(p), min:[Infinity,Infinity], max:[-Infinity,-Infinity]}));
  // Deterministic perturbation of all corner/landmark coordinates at their error bounds.
  // This is a sensitivity envelope, NOT a statistical CI or a bound on lens/crop errors.
  for (let bits = 0; bits < 256; bits++) {
    const shifted = corners.map((p,i) => p.map((n,j) => n + ((bits & (1 << (2*i+j))) ? 1 : -1)*cornerErrorPx));
    const candidate = lcdTransform(shifted, target);
    for (const entry of entries) for (const dx of [-pointErrorPx,pointErrorPx]) for (const dy of [-pointErrorPx,pointErrorPx]) {
      const q = candidate([entry.source[0]+dx,entry.source[1]+dy]);
      q.forEach((n,i) => {entry.min[i] = Math.min(entry.min[i],n);entry.max[i] = Math.max(entry.max[i],n);});
    }
  }
  return { target, errorMeaning:'sampled sensitivity envelope only; excludes lens distortion, unknown crop and font identity', points:entries };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/measure-lcd-reference.mjs INPUT.json');
    console.log(JSON.stringify(measureReference(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
