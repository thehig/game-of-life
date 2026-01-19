import { beforeAll, describe, expect, it } from "vitest";
import {
  createConwaySimulation,
  createEmptyTile,
  renderAscii,
  stepSimulation
} from "../src/engine/index.js";
import { DefinitionSet, SimulationTiming, Tile } from "../src/engine/types.js";
import { loadDefinitionsFixture, loadTimingFixture } from "./helpers.js";

let definitions: DefinitionSet;
let timing: SimulationTiming;

beforeAll(async () => {
  definitions = await loadDefinitionsFixture();
  timing = await loadTimingFixture();
});

const createBlinker = () => {
  const live = new Set([2 + 1 * 5, 2 + 2 * 5, 2 + 3 * 5]);
  return createConwaySimulation({
    width: 5,
    height: 5,
    terrainId: "land",
    definitions,
    timing,
    tileFactory: (x, y): Tile => {
      const tile = createEmptyTile("land");
      if (live.has(x + y * 5)) {
        tile.fauna = {
          id: "conway",
          health: 1,
          hunger: 0,
          energy: 0,
          age: 0
        };
      }
      return tile;
    }
  });
};

const renderExpected = (width: number, height: number, live: Set<number>): string => {
  const lines: string[] = [];
  for (let y = 0; y < height; y += 1) {
    let line = "";
    for (let x = 0; x < width; x += 1) {
      line += live.has(x + y * width) ? "O" : ".";
    }
    lines.push(line);
  }
  return lines.join("\n");
};

describe("conway rules", () => {
  it("oscillates a blinker deterministically", () => {
    const simulation = createBlinker();
    const step1 = stepSimulation(simulation);
    const step2 = stepSimulation(step1);

    expect(renderAscii(step1.world, step1.definitions)).toBe(
      [".....", ".....", ".OOO.", ".....", "....."].join("\n")
    );

    expect(renderAscii(step2.world, step2.definitions)).toBe(
      [".....", "..O..", "..O..", "..O..", "....."].join("\n")
    );
  });

  it("moves a glider across a larger grid", () => {
    const width = 10;
    const height = 10;
    const live = new Set([1 + 0 * width, 2 + 1 * width, 0 + 2 * width, 1 + 2 * width, 2 + 2 * width]);

    const simulation = createConwaySimulation({
      width,
      height,
      terrainId: "land",
    definitions,
    timing,
      tileFactory: (x, y): Tile => {
        const tile = createEmptyTile("land");
        if (live.has(x + y * width)) {
          tile.fauna = {
            id: "conway",
            health: 1,
            hunger: 0,
            energy: 0,
            age: 0
          };
        }
        return tile;
      }
    });

    let current = simulation;
    for (let i = 0; i < 4; i += 1) {
      current = stepSimulation(current);
    }

    const expected = new Set([
      2 + 1 * width,
      3 + 2 * width,
      1 + 3 * width,
      2 + 3 * width,
      3 + 3 * width
    ]);

    expect(renderAscii(current.world, current.definitions)).toBe(renderExpected(width, height, expected));
  });
});
