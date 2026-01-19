import { describe, expect, it } from "vitest";
import { conwaySpecies, createConwayState, renderConway, stepConway } from "./conway.js";

describe("conway", () => {
  it("exposes a conway species stub", () => {
    expect(conwaySpecies.id).toBe("conway");
  });

  it("applies classic life rules (birth, survival, death)", () => {
    const initial = createConwayState(3, 3, new Set([1, 3, 4]));
    const next = stepConway(initial);
    expect(renderConway(next)).toBe(["OO.", "OO.", "..."].join("\n"));
  });

  it("preserves a blinker oscillator", () => {
    const width = 5;
    const height = 5;
    const live = new Set([2 + 1 * width, 2 + 2 * width, 2 + 3 * width]);
    const start = createConwayState(width, height, live);
    const step1 = stepConway(start);
    const step2 = stepConway(step1);

    expect(renderConway(step1)).toBe([".....", ".....", ".OOO.", ".....", "....."].join("\n"));
    expect(renderConway(step2)).toBe([".....", "..O..", "..O..", "..O..", "....."].join("\n"));
  });

  it("moves a glider across the grid", () => {
    const width = 10;
    const height = 10;
    const live = new Set([
      1 + 0 * width,
      2 + 1 * width,
      0 + 2 * width,
      1 + 2 * width,
      2 + 2 * width
    ]);
    let current = createConwayState(width, height, live);
    for (let i = 0; i < 4; i += 1) {
      current = stepConway(current);
    }
    expect(renderConway(current)).toBe(
      [
        "..........",
        "..O.......",
        "...O......",
        ".OOO......",
        "..........",
        "..........",
        "..........",
        "..........",
        "..........",
        ".........."
      ].join("\n")
    );
  });
});
