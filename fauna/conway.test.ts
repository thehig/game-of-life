import { describe, expect, it } from "vitest";
import { conwaySpecies } from "./conway.js";

describe("conway", () => {
  it("exposes a conway species stub", () => {
    expect(conwaySpecies.id).toBe("conway");
  });

  it.todo("applies classic life rules (birth, survival, death)");
  it.todo("preserves a blinker oscillator");
  it.todo("moves a glider across the grid");
});
