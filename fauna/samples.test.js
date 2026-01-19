import { describe, expect, it } from "vitest";
import { faunaSamples, getFaunaSample } from "./samples.js";

describe("fauna samples", () => {
  it("includes between fifteen and twenty creatures", () => {
    expect(faunaSamples.length).toBeGreaterThanOrEqual(15);
    expect(faunaSamples.length).toBeLessThanOrEqual(20);
  });

  it("uses unique fauna identifiers", () => {
    const ids = faunaSamples.map((sample) => sample.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("includes sheep, wolves, and sheepdogs", () => {
    expect(getFaunaSample("sheep")?.kind).toBe("herbivore");
    expect(getFaunaSample("wolf")?.kind).toBe("carnivore");
    expect(getFaunaSample("sheepdog")?.kind).toBe("guardian");
  });

  it("supports multi-cell and multi-node creatures", () => {
    expect(getFaunaSample("horse")?.bodyShape?.width).toBe(2);
    expect(getFaunaSample("trex")?.bodyShape?.height).toBe(8);
    expect(getFaunaSample("snake")?.behaviors.serpentine.segments.length).toBeGreaterThan(2);
  });

  it("includes amphibious and flying creatures", () => {
    expect(getFaunaSample("frog")?.movementProfile.allowedMedia.has("water")).toBe(true);
    expect(getFaunaSample("owl")?.movementProfile.allowedMedia.has("air")).toBe(true);
  });
});
