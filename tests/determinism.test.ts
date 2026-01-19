import { beforeAll, describe, expect, it } from "vitest";
import { createDemoSimulation, renderAscii, stepSimulation } from "../src/engine/index.js";
import { DefinitionSet, SimulationTiming } from "../src/engine/types.js";
import { loadDefinitionsFixture, loadTimingFixture } from "./helpers.js";

let definitions: DefinitionSet;
let timing: SimulationTiming;

beforeAll(async () => {
  definitions = await loadDefinitionsFixture();
  timing = await loadTimingFixture();
});

const runSteps = (steps: number) => {
  let simulation = createDemoSimulation(16, 10, definitions, timing);
  for (let i = 0; i < steps; i += 1) {
    simulation = stepSimulation(simulation);
  }
  return simulation;
};

describe("determinism", () => {
  it("produces identical worlds for identical inputs", () => {
    const first = runSteps(12);
    const second = runSteps(12);

    expect(JSON.stringify(first.world)).toBe(JSON.stringify(second.world));
    expect(renderAscii(first.world, first.definitions)).toBe(
      renderAscii(second.world, second.definitions)
    );
  });
});
