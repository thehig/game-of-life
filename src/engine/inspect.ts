import { getSimulationTime } from "./time.js";
import { Simulation, TileDetails } from "./types.js";
import { getTile, isInBounds } from "./world.js";

export const inspectTile = (simulation: Simulation, x: number, y: number): TileDetails => {
  if (!isInBounds(simulation.world, x, y)) {
    throw new Error(`Tile out of bounds: (${x}, ${y})`);
  }

  const tile = getTile(simulation.world, x, y);
  const time = getSimulationTime(simulation.world.tick, simulation.timing);
  const terrain = simulation.definitions.terrains[tile.terrainId];

  return {
    position: { x, y },
    terrain,
    shade: tile.shade,
    time,
    flora: tile.flora
      ? {
          definition: simulation.definitions.flora[tile.flora.id],
          state: tile.flora
        }
      : undefined,
    fauna: tile.fauna
      ? {
          definition: simulation.definitions.fauna[tile.fauna.id],
          state: tile.fauna
        }
      : undefined
  };
};
