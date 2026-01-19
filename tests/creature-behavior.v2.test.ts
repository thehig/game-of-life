import { beforeAll, describe, expect, it } from "vitest";
import { creature as conwayCreature } from "../src/engine/creatures/conway.js";
import { creature as grassCreature } from "../src/engine/creatures/grass.js";
import type { DefinitionSet, SimulationTiming } from "../src/engine/types.js";
import { loadDefinitionsFixture } from "./helpers.js";
import {
  advanceEngineTicks,
  createEngineFromAscii,
  createTestEngineV2,
  getEntityAt,
  getEntityStateNumber,
  normalizeAscii,
  renderEngineAscii
} from "./engineV2.helpers.js";

let definitions: DefinitionSet;

beforeAll(async () => {
  definitions = await loadDefinitionsFixture();
});

const timingAlwaysDay: SimulationTiming = {
  dayLength: 1,
  nightLength: 0
};

const timingAlwaysNight: SimulationTiming = {
  dayLength: 0,
  nightLength: 1
};

describe("engine v2 creature behaviors", () => {
  it("oscillates a conway blinker", () => {
    const start = [".....", "..O..", "..O..", "..O..", "....."].join("\n");
    const expected = [".....", ".....", ".OOO.", ".....", "....."].join("\n");

    const engine = createEngineFromAscii({
      ascii: start,
      definitions,
      timing: timingAlwaysDay,
      modules: [conwayCreature]
    });

    advanceEngineTicks(engine, 1);
    expect(renderEngineAscii(engine)).toBe(normalizeAscii(expected));

    advanceEngineTicks(engine, 1);
    expect(renderEngineAscii(engine)).toBe(normalizeAscii(start));
  });

  it("moves a conway glider across the grid", () => {
    const start = [
      ".O........",
      "..O.......",
      "OOO.......",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      ".........."
    ].join("\n");
    const expected = [
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
    ].join("\n");

    const engine = createEngineFromAscii({
      ascii: start,
      definitions,
      timing: timingAlwaysDay,
      modules: [conwayCreature]
    });

    advanceEngineTicks(engine, 4);
    expect(renderEngineAscii(engine)).toBe(normalizeAscii(expected));
  });

  it("clamps grass growth during long daylight runs", () => {
    const engine = createTestEngineV2({
      width: 1,
      height: 1,
      definitions,
      timing: timingAlwaysDay,
      modules: [grassCreature]
    });

    engine.spawn("grass", "flora", 0, 0, { energy: 0.2, growth: 0.2 });
    advanceEngineTicks(engine, 1000);

    const grass = getEntityAt(engine, "flora", 0, 0);
    expect(grass).toBeDefined();
    expect(getEntityStateNumber(grass, "energy", -1)).toBeCloseTo(1, 6);
    expect(getEntityStateNumber(grass, "growth", -1)).toBeCloseTo(1, 6);
  });

  it("withers grass during long night runs", () => {
    const engine = createTestEngineV2({
      width: 1,
      height: 1,
      definitions,
      timing: timingAlwaysNight,
      modules: [grassCreature]
    });

    engine.spawn("grass", "flora", 0, 0, { energy: 0.6, growth: 0.4 });
    advanceEngineTicks(engine, 1000);

    const grass = getEntityAt(engine, "flora", 0, 0);
    expect(grass).toBeDefined();
    expect(getEntityStateNumber(grass, "energy", 1)).toBeCloseTo(0, 6);
    expect(getEntityStateNumber(grass, "growth", 1)).toBeCloseTo(0, 6);
  });

  it.skip("spreads grass into adjacent tiles under full sun (tdd)", () => {
    const start = ["...", '.".', "..."].join("\n");
    const expected = ['"""', '"""', '"""'].join("\n");
    const engine = createEngineFromAscii({
      ascii: start,
      definitions,
      timing: timingAlwaysDay,
      modules: [grassCreature]
    });
    const center = getEntityAt(engine, "flora", 1, 1);
    if (!center) {
      throw new Error("Missing center grass");
    }
    engine.entities.setState(center.id, { energy: 1, growth: 1 });

    advanceEngineTicks(engine, 1000);
    expect(renderEngineAscii(engine)).toBe(normalizeAscii(expected));
  });

  it.skip("densifies grass when surrounded (tdd)", () => {
    const start = ['"""', '"""', '"""'].join("\n");
    const engine = createEngineFromAscii({
      ascii: start,
      definitions,
      timing: timingAlwaysDay,
      modules: [grassCreature]
    });
    const center = getEntityAt(engine, "flora", 1, 1);
    if (!center) {
      throw new Error("Missing center grass");
    }
    engine.entities.setState(center.id, { energy: 1, growth: 1, density: 1 });

    advanceEngineTicks(engine, 1000);
    const updated = getEntityAt(engine, "flora", 1, 1);
    expect(getEntityStateNumber(updated, "density", 0)).toBeGreaterThan(1);
  });
});
