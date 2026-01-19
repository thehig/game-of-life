import { describe, expect, it } from "vitest";
import { floraSamples, getFloraSample } from "./samples.js";

describe("flora samples", () => {
  it("includes at least fifteen flora types", () => {
    expect(floraSamples.length).toBeGreaterThanOrEqual(15);
  });

  it("uses unique flora identifiers", () => {
    const ids = floraSamples.map((sample) => sample.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("includes trees, flowers, and fungi", () => {
    expect(getFloraSample("oak")?.kind).toBe("tree");
    expect(getFloraSample("sunflower")?.kind).toBe("flower");
    expect(getFloraSample("mushroom")?.kind).toBe("fungus");
  });

  it("captures distinctive traits for special flora", () => {
    expect(getFloraSample("clover")?.nitrogenFixer).toBe(true);
    expect(getFloraSample("cactus")?.cactusProfile.droughtTolerance).toBeGreaterThan(0.7);
    expect(getFloraSample("ivy")?.vineProfile.maxHeight).toBeGreaterThan(5);
  });
});
