import { expect, it } from 'vitest';
import { lcdTransform, measureReference } from './measure-lcd-reference.mjs';

it('maps a skew LCD to its own native coordinate system rather than the photo dimensions', () => {
  const corners = [[10,20],[210,10],[230,170],[0,190]];
  const transform = lcdTransform(corners,[320,240]);
  corners.forEach((p,i) => {
    const expected = [[0,0],[320,0],[320,240],[0,240]][i];
    transform(p).forEach((v,j) => expect(v).toBeCloseTo(expected[j],8));
  });
  const affine = lcdTransform([[10,20],[210,20],[210,120],[10,120]],[240,240]);
  expect(affine([110,70])).toEqual([120,120]);
});

it('records source uncertainty instead of presenting exact-looking normalized pixels', () => {
  const input = {corners:[[0,0],[200,0],[200,150],[0,150]],target:[320,240],points:{center:[100,75]},cornerErrorPx:1,pointErrorPx:1};
  const m = measureReference(input).points[0];
  expect(m.normalized).toEqual([160,120]);
  expect(m.min[0]).toBeLessThan(160);
  expect(m.max[0]).toBeGreaterThan(160);
  const exact = measureReference({...input,cornerErrorPx:0,pointErrorPx:0}).points[0];
  expect(exact.min).toEqual(exact.normalized);
  expect(exact.max).toEqual(exact.normalized);
});

it('rejects swapped/degenerate corners, missing uncertainty and nonfinite coordinates', () => {
  expect(() => lcdTransform([[0,0],[1,1],[1,0],[0,1]],[320,240])).toThrow();
  expect(() => lcdTransform([[0,0],[0,0],[0,0],[0,0]],[320,240])).toThrow();
  expect(() => lcdTransform([[0,0],[2,0],[2,2],[0,2]],[NaN,240])).toThrow();
  expect(() => measureReference({corners:[],target:[320,240],points:{}})).toThrow();
});
