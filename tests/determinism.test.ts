import { describe, expect, it } from "vitest";
import { createDemoSimulation, renderAscii, stepSimulation } from "../src/engine/index.js";

const runSteps = (steps: number) => {
  let simulation = createDemoSimulation(16, 10);
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
