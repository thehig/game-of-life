import { describe, expect, it } from "vitest";
import { faunaSamples, floraSamples, getFaunaSample, getFloraSample } from "../src/engine/index.js";

describe("engine samples", () => {
  it("exports flora samples", () => {
    expect(floraSamples.length).toBeGreaterThanOrEqual(15);
    expect(getFloraSample("oak")?.kind).toBe("tree");
  });

  it("exports fauna samples", () => {
    expect(faunaSamples.length).toBeGreaterThanOrEqual(15);
    expect(getFaunaSample("sheepdog")?.kind).toBe("guardian");
  });
});
