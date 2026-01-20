import { beforeAll, describe, expect, it } from "vitest";
import { creature as carcassCreature } from "../src/engine/creatures/carcass.js";
import { creature as sheepCreature } from "../src/engine/creatures/sheep.js";
import { creature as wolfCreature } from "../src/engine/creatures/wolf.js";
import type { DefinitionSet, SimulationTiming } from "../src/engine/types.js";
import { loadDefinitionsFixture, loadTimingFixture } from "./helpers.js";
import { advanceEngineTicks, createTestEngineV2, getEntityAt, getEntityStateNumber } from "./engineV2.helpers.js";

let definitions: DefinitionSet;
let timing: SimulationTiming;

beforeAll(async () => {
  definitions = await loadDefinitionsFixture();
  timing = await loadTimingFixture();
});

describe("carcass behavior", () => {
  it("leaves a carcass when a wolf eats while nearly full", () => {
    const engine = createTestEngineV2({
      width: 2,
      height: 1,
      definitions,
      timing,
      modules: [sheepCreature, wolfCreature, carcassCreature]
    });

    engine.spawn("sheep", "fauna", 1, 0, { energy: 0.8, health: 0.9, hunger: 0.1 });
    engine.spawn("wolf", "fauna", 0, 0, { hunger: 0.15, energy: 1, health: 1 });

    advanceEngineTicks(engine, 1);

    const wolf = getEntityAt(engine, "fauna", 1, 0);
    const carcass = getEntityAt(engine, "flora", 1, 0);

    expect(wolf?.typeId).toBe("wolf");
    expect(carcass?.typeId).toBe("carcass");
    expect(getEntityStateNumber(wolf, "hunger", 1)).toBeLessThan(0.16);
    expect(getEntityStateNumber(carcass, "calories", 0)).toBeGreaterThan(0);
  });

  it("decays carcasses into soil fertility", () => {
    const engine = createTestEngineV2({
      width: 1,
      height: 1,
      definitions,
      timing,
      modules: [carcassCreature]
    });

    engine.spawn("carcass", "flora", 0, 0, {
      calories: 0.18,
      decayRate: 0.06,
      fertilityPerCalorie: 0.5,
      toxicityPerCalorie: 0
    });

    advanceEngineTicks(engine, 4);

    const carcass = getEntityAt(engine, "flora", 0, 0);
    expect(carcass).toBeUndefined();
    expect(engine.world.soilFertilityBoost[0]).toBeGreaterThan(0);
  });
});
