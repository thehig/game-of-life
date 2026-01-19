import { createEcosystemSimulation } from "./engine.js";
import { DefinitionSet, SimulationTiming, Tile } from "./types.js";
import { createEmptyTile } from "./world.js";

export const createDemoSimulation = (
  width: number,
  height: number,
  definitions: DefinitionSet,
  timing: SimulationTiming
) => {
  return createEcosystemSimulation({
    width,
    height,
    terrainId: "land",
    definitions,
    timing,
    tileFactory: (x, y): Tile => {
      const terrainId = (x + y) % 11 === 0 ? "sand" : "land";
      const tile = createEmptyTile(terrainId);

      if ((x + y) % 4 === 0) {
        tile.flora = {
          id: "grass",
          nutrition: 0.45 + ((x + y) % 3) * 0.1,
          age: 0,
          growth: 0.2
        };
      }

      if (x === Math.floor(width / 2) && y === Math.floor(height / 2)) {
        const treeDef = definitions.flora["tree"];
        tile.flora = {
          id: "tree",
          nutrition: treeDef?.maxNutrition ?? 1,
          age: 5,
          growth: 0.6
        };
      }

      if (x === 2 && y === 2) {
        const herbivoreDef = definitions.fauna["herbivore"];
        tile.fauna = {
          id: "herbivore",
          health: herbivoreDef?.maxHealth ?? 10,
          hunger: 0.2,
          energy: 1,
          age: 0
        };
      }

      if (x === width - 3 && y === height - 3) {
        const carnivoreDef = definitions.fauna["carnivore"];
        tile.fauna = {
          id: "carnivore",
          health: carnivoreDef?.maxHealth ?? 12,
          hunger: 0.1,
          energy: 1,
          age: 0
        };
      }

      return tile;
    }
  });
};
