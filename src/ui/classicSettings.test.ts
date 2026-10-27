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
      menuVersion: 2,
    }),
  ).toMatchObject({
    brightness: 0.25,
    volumeLimit: 1,
    backlight: 10,
    mainMenu: ["coverflow"],
  });
  expect(
    parsePreferences({
      mainMenu: [],
      volumeLimit: Infinity,
      backlight: 0,
      menuVersion: 2,
    }),
  ).toMatchObject({
    mainMenu: [],
    volumeLimit: 1,
    backlight: 0,
  });
});
it("adds newly available photo and podcast entries when migrating the previous menu schema", () => {
  expect(parsePreferences({ mainMenu: ["coverflow"] }).mainMenu).toEqual([
    "photos",
    "podcasts",
    "coverflow",
  ]);
  expect(parsePreferences({ mainMenu: [], menuVersion: 2 }).mainMenu).toEqual(
    [],
  );
});
