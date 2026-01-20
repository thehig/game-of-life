import { describe, expect, it } from "vitest";
import {
  faunaSamples,
  floraSamples,
  terrainSamples,
  scenarioSamples,
  getFaunaSample,
  getFloraSample,
  getTerrainSample,
  getScenarioSample
} from "../src/engine/index.js";

describe("engine samples", () => {
  it("exports flora samples", () => {
    expect(floraSamples.length).toBeGreaterThanOrEqual(15);
    expect(getFloraSample("oak")?.kind).toBe("tree");
  });

  it("exports fauna samples", () => {
    expect(faunaSamples.length).toBeGreaterThanOrEqual(15);
    expect(getFaunaSample("sheepdog")?.kind).toBe("guardian");
  });

  it("exports terrain samples", () => {
    expect(terrainSamples.length).toBeGreaterThanOrEqual(9);
    expect(getTerrainSample("rich_soil")?.fertility).toBeGreaterThan(0.8);
  });

  it("exports scenario samples", () => {
    expect(scenarioSamples.length).toBeGreaterThanOrEqual(4);
    expect(getScenarioSample("beach_tide")?.name).toBe("Beach Tide");
  });
});
