import { describe, expect, it } from "vitest";
import {
  advanceGrass,
  calculateSpreadTargets,
  createGrassConfig,
  createGrassState,
  getRingOffsets,
  grassModel,
  growGrass
} from "./grass.js";

describe("grass", () => {
  it("exposes a grass model stub", () => {
    expect(grassModel.id).toBe("grass");
    expect(createGrassState({ height: 2 }).height).toBe(2);
  });

  it("grows to a sunlight-adjusted spread threshold", () => {
    const config = createGrassConfig({ spreadHeight: 0.6 });
    let grass = createGrassState({ height: 0, energy: 0.6 });
    for (let i = 0; i < 40; i += 1) {
      grass = growGrass(grass, { sunlight: 1, isDay: true, isShaded: false }, config);
    }
    expect(grass.height).toBeGreaterThanOrEqual(0.6);

    let lowLight = createGrassState({ height: 0, energy: 0.6 });
    for (let i = 0; i < 40; i += 1) {
      lowLight = growGrass(lowLight, { sunlight: 0.3, isDay: true, isShaded: false }, config);
    }
    expect(lowLight.height).toBeLessThan(grass.height);
  });

  it("spreads in clustered, ring-like patches over time", () => {
    const config = createGrassConfig({ ringBandHeight: 0.3, spreadDensity: 0.4 });
    const grass = createGrassState({ height: 1, energy: 1, seed: 12 });
    const targets = calculateSpreadTargets(grass, config);
    const radius = Math.max(...targets.map((cell) => Math.max(Math.abs(cell.x), Math.abs(cell.y))));

    expect(targets.length).toBeGreaterThan(0);
    expect(targets.length).toBeLessThan(getRingOffsets(radius).length);
    for (const cell of targets) {
      expect(Math.max(Math.abs(cell.x), Math.abs(cell.y))).toBe(radius);
    }
  });

  it("slows growth at night relative to daytime", () => {
    const config = createGrassConfig();
    const base = createGrassState({ height: 0.2, energy: 0.5 });
    const day = growGrass(base, { sunlight: 1, isDay: true, isShaded: false }, config);
    const night = growGrass(base, { sunlight: 1, isDay: false, isShaded: false }, config);
    expect(day.height).toBeGreaterThan(night.height);
  });

  it("reduces growth under tree shade", () => {
    const config = createGrassConfig();
    const base = createGrassState({ height: 0.2, energy: 0.5 });
    const open = growGrass(base, { sunlight: 1, isDay: true, isShaded: false }, config);
    const shaded = growGrass(base, { sunlight: 1, isDay: true, isShaded: true }, config);
    expect(shaded.height).toBeLessThan(open.height);
  });

  it("recovers after grazing with a realistic regrowth curve", () => {
    const config = createGrassConfig({ maxHeight: 1 });
    const shortGrass = createGrassState({ height: 0.2, energy: 0.4 });
    const tallGrass = createGrassState({ height: 0.9, energy: 0.4 });
    const shortGrowth = growGrass(shortGrass, { sunlight: 1, isDay: true }, config);
    const tallGrowth = growGrass(tallGrass, { sunlight: 1, isDay: true }, config);

    expect(shortGrowth.height - shortGrass.height).toBeGreaterThan(tallGrowth.height - tallGrass.height);
  });

  it("emits spread targets after growth when conditions are met", () => {
    const config = createGrassConfig({ spreadHeight: 0.5, spreadDensity: 0.8 });
    const grass = createGrassState({ height: 0.6, energy: 0.9, seed: 4 });
    const result = advanceGrass(grass, { sunlight: 1, isDay: true }, config);
    expect(result.targets.length).toBeGreaterThan(0);
  });
});
