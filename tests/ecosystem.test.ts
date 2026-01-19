import { beforeAll, describe, expect, it } from "vitest";
import {
  createEcosystemSimulation,
  createEmptyTile,
  stepSimulation
} from "../src/engine/index.js";
import { DefinitionSet, Tile } from "../src/engine/types.js";
import { loadDefinitionsFixture } from "./helpers.js";

let definitions: DefinitionSet;

beforeAll(async () => {
  definitions = await loadDefinitionsFixture();
});

const timingAlwaysDay = {
  dayLength: 1,
  nightLength: 0
};

const runSteps = (definitions: DefinitionSet, tileFactory: (x: number, y: number) => Tile, steps: number) => {
  let simulation = createEcosystemSimulation({
    width: 1,
    height: 1,
    definitions,
    timing: timingAlwaysDay,
    tileFactory
  });

  for (let i = 0; i < steps; i += 1) {
    simulation = stepSimulation(simulation);
  }

  return simulation;
};

describe("ecosystem rules", () => {
  it("grows a tree over 100 cycles", () => {
    const initialGrowth = 0.1;
    const simulation = runSteps(
      definitions,
      () => {
        const tile = createEmptyTile("land");
        tile.flora = {
          id: "tree",
          nutrition: 0.3,
          age: 0,
          growth: initialGrowth
        };
        return tile;
      },
      100
    );

    const tile = simulation.world.tiles[0];
    expect(tile.flora?.growth).toBeGreaterThan(initialGrowth);
    expect(tile.shade).toBeGreaterThan(0);
  });

  it("lets sheep eat grass on the same tile", () => {
    const customDefinitions: DefinitionSet = {
      ...definitions,
      flora: {
        ...definitions.flora,
        grass: {
          ...definitions.flora.grass,
          growthPerTick: 0,
          sunlightCost: 0
        }
      }
    };

    const simulation = runSteps(
      customDefinitions,
      () => {
        const tile = createEmptyTile("land");
        tile.flora = {
          id: "grass",
          nutrition: 0.5,
          age: 0,
          growth: 0.2
        };
        tile.fauna = {
          id: "sheep",
          health: customDefinitions.fauna.sheep.maxHealth,
          hunger: 0.6,
          energy: 1,
          age: 0
        };
        return tile;
      },
      1
    );

    const tile = simulation.world.tiles[0];
    expect(tile.flora?.nutrition).toBeCloseTo(0.08, 2);
    expect(tile.fauna?.hunger).toBeCloseTo(0.39, 2);
  });

  it("moves a wolf onto a sheep and reduces hunger", () => {
    let simulation = createEcosystemSimulation({
      width: 2,
      height: 1,
      definitions,
      timing: timingAlwaysDay,
      tileFactory: (x) => {
        const tile = createEmptyTile("land");
        if (x === 0) {
          tile.fauna = {
            id: "wolf",
            health: definitions.fauna.wolf.maxHealth,
            hunger: 0.7,
            energy: 1,
            age: 0
          };
        }
        if (x === 1) {
          tile.fauna = {
            id: "sheep",
            health: definitions.fauna.sheep.maxHealth,
            hunger: 0.2,
            energy: 1,
            age: 0
          };
        }
        return tile;
      }
    });

    simulation = stepSimulation(simulation);

    const left = simulation.world.tiles[0];
    const right = simulation.world.tiles[1];

    expect(left.fauna).toBeUndefined();
    expect(right.fauna?.id).toBe("wolf");
    expect(right.fauna?.hunger).toBeCloseTo(0.35, 2);
  });

  it("kills fauna by starvation when hunger is maxed", () => {
    const simulation = runSteps(
      definitions,
      () => {
        const tile = createEmptyTile("land");
        tile.fauna = {
          id: "sheep",
          health: 0.04,
          hunger: 0.95,
          energy: 0.2,
          age: 0
        };
        return tile;
      },
      1
    );

    const tile = simulation.world.tiles[0];
    expect(tile.fauna).toBeUndefined();
  });

  it("enriches soil after herbivore death and boosts growth", () => {
    const base = runSteps(
      definitions,
      () => {
        const tile = createEmptyTile("land");
        tile.flora = {
          id: "grass",
          nutrition: 0.2,
          age: 0,
          growth: 0.2
        };
        return tile;
      },
      2
    );

    let withSheep = createEcosystemSimulation({
      width: 1,
      height: 1,
      definitions,
      timing: timingAlwaysDay,
      tileFactory: () => {
        const tile = createEmptyTile("land");
        tile.flora = {
          id: "grass",
          nutrition: 0.2,
          age: 0,
          growth: 0.2
        };
        tile.fauna = {
          id: "sheep",
          health: 0.04,
          hunger: 0.95,
          energy: 0.2,
          age: 0
        };
        return tile;
      }
    });

    withSheep = stepSimulation(withSheep);
    const soilAfterDeath = withSheep.world.tiles[0].soil;
    expect(soilAfterDeath.fertilityBoost).toBeGreaterThan(0);

    withSheep = stepSimulation(withSheep);

    const baseNutrition = base.world.tiles[0].flora?.nutrition ?? 0;
    const enrichedNutrition = withSheep.world.tiles[0].flora?.nutrition ?? 0;
    expect(enrichedNutrition).toBeGreaterThan(baseNutrition);
  });

  it("poisons soil after carnivore death and slows growth", () => {
    const base = runSteps(
      definitions,
      () => {
        const tile = createEmptyTile("land");
        tile.flora = {
          id: "grass",
          nutrition: 0.2,
          age: 0,
          growth: 0.2
        };
        return tile;
      },
      2
    );

    let withWolf = createEcosystemSimulation({
      width: 1,
      height: 1,
      definitions,
      timing: timingAlwaysDay,
      tileFactory: () => {
        const tile = createEmptyTile("land");
        tile.flora = {
          id: "grass",
          nutrition: 0.2,
          age: 0,
          growth: 0.2
        };
        tile.fauna = {
          id: "wolf",
          health: 0.06,
          hunger: 0.95,
          energy: 0.2,
          age: 0
        };
        return tile;
      }
    });

    withWolf = stepSimulation(withWolf);
    const soilAfterDeath = withWolf.world.tiles[0].soil;
    expect(soilAfterDeath.toxicity).toBeGreaterThan(0);

    withWolf = stepSimulation(withWolf);

    const baseNutrition = base.world.tiles[0].flora?.nutrition ?? 0;
    const poisonedNutrition = withWolf.world.tiles[0].flora?.nutrition ?? 0;
    expect(poisonedNutrition).toBeLessThan(baseNutrition);
  });
});
