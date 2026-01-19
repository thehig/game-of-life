import { TerrainId, WorldLayers } from "../types.js";

export type BeachParams = {
  leftLandRatio?: number;
  rightSeaRatio?: number;
  landId?: TerrainId;
  sandId?: TerrainId;
  seaId?: TerrainId;
};

export const applyBeachTerrain = (
  world: WorldLayers,
  paletteIndexByTerrainId: ReadonlyMap<TerrainId, number>,
  params?: BeachParams
): void => {
  const leftLandRatio = params?.leftLandRatio ?? 0.22;
  const rightSeaRatio = params?.rightSeaRatio ?? 0.22;
  const landId = params?.landId ?? "land";
  const sandId = params?.sandId ?? "sand";
  const seaId = params?.seaId ?? "sea";

  const landIdx = paletteIndexByTerrainId.get(landId);
  const sandIdx = paletteIndexByTerrainId.get(sandId);
  const seaIdx = paletteIndexByTerrainId.get(seaId);
  if (landIdx === undefined || sandIdx === undefined || seaIdx === undefined) {
    throw new Error("Terrain palette missing one of land/sand/sea");
  }

  const leftBand = Math.floor(world.width * leftLandRatio);
  const rightBandStart = Math.floor(world.width * (1 - rightSeaRatio));

  // Default to sand first.
  world.terrain.fill(sandIdx);

  for (let y = 0; y < world.height; y += 1) {
    const rowStart = y * world.width;
    for (let x = 0; x < leftBand; x += 1) {
      world.terrain[rowStart + x] = landIdx;
    }
    for (let x = rightBandStart; x < world.width; x += 1) {
      world.terrain[rowStart + x] = seaIdx;
    }
  }
};

