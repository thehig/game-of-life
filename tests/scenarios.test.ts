import { beforeAll, describe, expect, it } from "vitest";
import { createTestEngineV2 } from "./engineV2.helpers.js";
import { getScenarioSample, getTerrainIdAt } from "../src/engine/index.js";
import { creature as grassCreature } from "../src/engine/creatures/grass.js";
import { creature as sheepCreature } from "../src/engine/creatures/sheep.js";
import { creature as wolfCreature } from "../src/engine/creatures/wolf.js";
import type { DefinitionSet, SimulationTiming } from "../src/engine/types.js";
import { loadDefinitionsFixture, loadTimingFixture } from "./helpers.js";

let definitions: DefinitionSet;
let timing: SimulationTiming;

beforeAll(async () => {
  definitions = await loadDefinitionsFixture();
  timing = await loadTimingFixture();
});

const countOccupied = (arr: Uint32Array): number => {
  let count = 0;
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i] !== 0) count += 1;
  }
  return count;
};

const findSeaStart = (engine: ReturnType<typeof createTestEngineV2>): number => {
  for (let x = 0; x < engine.world.width; x += 1) {
    if (getTerrainIdAt(engine.world, x, 0) === "sea") {
      return x;
    }
  }
  return -1;
};

describe("scenario samples", () => {
  it("applies a soil grass scenario", () => {
    const scenario = getScenarioSample("soil_grass_basic");
    if (!scenario) {
      throw new Error("Missing soil_grass_basic scenario");
    }
    const engine = createTestEngineV2({
      width: 12,
      height: 6,
      definitions,
      timing,
      terrainIds: ["soil"],
      modules: [grassCreature]
    });

    scenario.setup(engine);

    for (let y = 0; y < engine.world.height; y += 1) {
      for (let x = 0; x < engine.world.width; x += 1) {
        expect(getTerrainIdAt(engine.world, x, y)).toBe("soil");
      }
    }

    expect(countOccupied(engine.world.floraAt)).toBeGreaterThan(0);
  });

  it("laps the beach tide across the day/night cycle", () => {
    const scenario = getScenarioSample("beach_tide");
    if (!scenario) {
      throw new Error("Missing beach_tide scenario");
    }
    const engine = createTestEngineV2({
      width: 20,
      height: 6,
      definitions,
      timing,
      terrainIds: ["sand", "sea"],
      modules: [grassCreature, sheepCreature, wolfCreature]
    });

    const runtime = scenario.setup(engine);
    if (!runtime.update) {
      throw new Error("Beach scenario missing update()");
    }

    const startSea = findSeaStart(engine);
    const cycleLength = timing.dayLength + timing.nightLength;
    engine.world.tick = Math.floor(cycleLength / 4);
    runtime.update(engine);

    const nextSea = findSeaStart(engine);
    expect(nextSea).not.toBe(startSea);
  });
});
