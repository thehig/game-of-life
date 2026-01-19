import { TerrainId, WorldLayers } from "./types.js";

export const getIndex = (world: Pick<WorldLayers, "width" | "height">, x: number, y: number): number =>
  y * world.width + x;

export const isInBounds = (world: Pick<WorldLayers, "width" | "height">, x: number, y: number): boolean =>
  x >= 0 && x < world.width && y >= 0 && y < world.height;

export const buildTerrainPalette = (terrainIds: TerrainId[], defaultTerrain: TerrainId): TerrainId[] => {
  const unique: TerrainId[] = [];
  const seen = new Set<TerrainId>();
  const ensure = (id: TerrainId) => {
    if (seen.has(id)) return;
    seen.add(id);
    unique.push(id);
  };
  ensure(defaultTerrain);
  for (const id of terrainIds) {
    ensure(id);
  }
  return unique;
};

export const createWorldLayers = (options: {
  width: number;
  height: number;
  terrainPalette: TerrainId[];
  defaultTerrainIndex: number;
}): WorldLayers => {
  const { width, height, terrainPalette, defaultTerrainIndex } = options;
  const size = width * height;

  const terrain = new Uint16Array(size);
  terrain.fill(defaultTerrainIndex);

  return {
    width,
    height,
    tick: 0,
    terrainPalette,
    terrain,
    shade: new Float32Array(size),
    soilFertilityBoost: new Float32Array(size),
    soilToxicity: new Float32Array(size),
    floraAt: new Uint32Array(size),
    faunaAt: new Uint32Array(size)
  };
};

export const getTerrainIdAt = (world: WorldLayers, x: number, y: number): TerrainId => {
  const idx = getIndex(world, x, y);
  const paletteIndex = world.terrain[idx] ?? 0;
  return world.terrainPalette[paletteIndex] ?? world.terrainPalette[0] ?? "land";
};

export const setTerrainIdAt = (world: WorldLayers, x: number, y: number, terrainId: TerrainId): void => {
  const paletteIndex = world.terrainPalette.indexOf(terrainId);
  if (paletteIndex < 0) {
    throw new Error(`Unknown terrainId '${terrainId}' not in terrainPalette`);
  }
  world.terrain[getIndex(world, x, y)] = paletteIndex;
};

