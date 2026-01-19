import { describe, expect, it } from "vitest";
import {
  createConwaySimulation,
  createEmptyTile,
  renderAscii,
  stepSimulation
} from "../src/engine/index.js";
import { Tile } from "../src/engine/types.js";

const createBlinker = () => {
  const live = new Set([2 + 1 * 5, 2 + 2 * 5, 2 + 3 * 5]);
  return createConwaySimulation({
    width: 5,
    height: 5,
    terrainId: "land",
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
});
