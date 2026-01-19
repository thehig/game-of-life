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
  if (!terrain) {
    throw new Error(`Missing terrain definition: ${tile.terrainId}`);
  }

  const details: TileDetails = {
    position: { x, y },
    terrain,
    shade: tile.shade,
    time
  };

  if (tile.flora) {
    const floraDef = simulation.definitions.flora[tile.flora.id];
    if (!floraDef) {
      throw new Error(`Missing flora definition: ${tile.flora.id}`);
    }
    details.flora = {
      definition: floraDef,
      state: tile.flora
    };
  }

  if (tile.fauna) {
    const faunaDef = simulation.definitions.fauna[tile.fauna.id];
    if (!faunaDef) {
      throw new Error(`Missing fauna definition: ${tile.fauna.id}`);
    }
    details.fauna = {
      definition: faunaDef,
      state: tile.fauna
    };
  }

  return details;
};
