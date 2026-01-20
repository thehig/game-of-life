import { beforeAll, describe, expect, it } from "vitest";
import {
  applyTerrainStripes,
  buildTerrainPalette,
  createWorldLayers,
  getTerrainIdAt,
  getTerrainSample,
  terrainSamples
} from "../src/engine/index.js";
import type { DefinitionSet } from "../src/engine/types.js";
import { loadDefinitionsFixture } from "./helpers.js";

let definitions: DefinitionSet;

beforeAll(async () => {
  definitions = await loadDefinitionsFixture();
});

describe("terrain samples", () => {
  it("exports terrain samples", () => {
    expect(terrainSamples.length).toBeGreaterThanOrEqual(9);
    expect(getTerrainSample("rich_soil")?.fertility).toBeGreaterThan(0.8);
    expect(getTerrainSample("rock")?.passable).toBe(false);
  });

  it("includes all samples in definitions", () => {
    for (const sample of terrainSamples) {
      const def = definitions.terrains[sample.id];
      expect(def).toBeDefined();
    }
  });
});

describe("terrain stripe generator", () => {
  it("paints vertical terrain stripes by ratio", () => {
    const terrainIds = ["rock", "soil", "sea"] as const;
    const palette = buildTerrainPalette([...terrainIds], "land");
    const defaultTerrainIndex = Math.max(0, palette.indexOf("land"));
    const world = createWorldLayers({
      width: 10,
      height: 2,
      terrainPalette: palette,
      defaultTerrainIndex
    });

    const paletteIndexById = new Map<string, number>();
    for (let i = 0; i < palette.length; i += 1) {
      const id = palette[i];
      if (id) {
        paletteIndexById.set(id, i);
      }
    }

    applyTerrainStripes(
      world,
      paletteIndexById,
      [
        { terrainId: "rock", sizeRatio: 1 },
        { terrainId: "soil", sizeRatio: 1 },
        { terrainId: "sea", sizeRatio: 1 }
      ],
      "x"
    );

    const expected = [
      "rock",
      "rock",
      "rock",
      "soil",
      "soil",
      "soil",
      "sea",
      "sea",
      "sea",
      "sea"
    ];
    for (let x = 0; x < expected.length; x += 1) {
      expect(getTerrainIdAt(world, x, 0)).toBe(expected[x]);
      expect(getTerrainIdAt(world, x, 1)).toBe(expected[x]);
    }
  });
});
