import { expect, test } from "vitest";
import { decodeText } from "./textDocuments";

test("text decoding preserves Chinese, strips BOM and normalizes line endings", () => {
  expect(
    decodeText(new TextEncoder().encode("\uFEFF中文\r\nsecond\rthird").buffer),
  ).toBe("中文\nsecond\nthird");
  expect(
    decodeText(Uint8Array.from([0xff, 0xfe, 0x2d, 0x4e, 0x87, 0x65]).buffer),
  ).toBe("中文");
  expect(
    decodeText(Uint8Array.from([0xfe, 0xff, 0x4e, 0x2d, 0x65, 0x87]).buffer),
  ).toBe("中文");
  expect(decodeText(Uint8Array.from([0xd6, 0xd0, 0xce, 0xc4]).buffer)).toBe(
    "中文",
  );
});

test("empty text is supported and binary content or broken Unicode is rejected", () => {
  expect(decodeText(new ArrayBuffer(0))).toBe("");
  expect(() => decodeText(Uint8Array.from([0, 1, 2, 3]).buffer)).toThrow();
  expect(() =>
    decodeText(Uint8Array.from([0xff, 0xfe, 0x2d]).buffer),
  ).toThrow();
});
