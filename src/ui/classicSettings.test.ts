import { expect, it } from "vitest";
import { parsePreferences } from "./classicSettings";
it("migrates appearance settings without losing the classic defaults", () => {
  expect(
    parsePreferences({ finish: "black", clickSound: false }),
  ).toMatchObject({
    finish: "black",
    clickSound: false,
    brightness: 1,
    volumeLimit: 1,
    backlight: 10,
  });
});
it("clamps controls and accepts only known menu entries and backlight durations", () => {
  expect(
    parsePreferences({
      brightness: -1,
      volumeLimit: 9,
      backlight: 17,
      mainMenu: ["coverflow", "unknown", "coverflow", 4],
    }),
  ).toMatchObject({
    brightness: 0.25,
    volumeLimit: 1,
    backlight: 10,
    mainMenu: ["coverflow"],
  });
  expect(
    parsePreferences({ mainMenu: [], volumeLimit: Infinity, backlight: 0 }),
  ).toMatchObject({
    mainMenu: [],
    volumeLimit: 1,
    backlight: 0,
  });
});
