import { createEcosystemSimulation } from "./engine.js";
import { defaultDefinitions } from "./definitions.js";
import { Tile } from "./types.js";
import { createEmptyTile } from "./world.js";

export const createDemoSimulation = (width: number, height: number) => {
  return createEcosystemSimulation({
    width,
    height,
    terrainId: "land",
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
        tile.flora = {
          id: "tree",
          nutrition: defaultDefinitions.flora.tree.maxNutrition,
          age: 5,
          growth: 0.6
        };
      }

      if (x === 2 && y === 2) {
        tile.fauna = {
          id: "herbivore",
          health: defaultDefinitions.fauna.herbivore.maxHealth,
          hunger: 0.2,
          energy: 1,
          age: 0
        };
      }

      if (x === width - 3 && y === height - 3) {
        tile.fauna = {
          id: "carnivore",
          health: defaultDefinitions.fauna.carnivore.maxHealth,
          hunger: 0.1,
          energy: 1,
          age: 0
        };
      }

      return tile;
    }
  });
};
