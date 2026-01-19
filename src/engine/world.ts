import { SoilState, Tile, TerrainId, World } from "./types.js";

export const createEmptySoil = (): SoilState => ({
  fertilityBoost: 0,
  toxicity: 0
});

export const createEmptyTile = (terrainId: TerrainId): Tile => ({
  terrainId,
  shade: 0,
  soil: createEmptySoil()
});

export const createWorld = (
  width: number,
  height: number,
  terrainId: TerrainId,
  tileFactory?: (x: number, y: number) => Tile
): World => {
  const tiles: Tile[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = tileFactory ? tileFactory(x, y) : createEmptyTile(terrainId);
      tiles.push({
        ...tile,
        soil: tile.soil ?? createEmptySoil()
      });
    }
  }

  return {
    width,
    height,
    tick: 0,
    tiles
  };
};

export const getIndex = (world: World, x: number, y: number): number => y * world.width + x;

export const isInBounds = (world: World, x: number, y: number): boolean =>
  x >= 0 && x < world.width && y >= 0 && y < world.height;

export const getTile = (world: World, x: number, y: number): Tile => {
  const tile = world.tiles[getIndex(world, x, y)];
  if (!tile) {
    throw new Error(`Missing tile at (${x}, ${y})`);
  }
  return tile;
};

export const cloneWorld = (world: World): World => ({
  width: world.width,
  height: world.height,
  tick: world.tick,
  tiles: world.tiles.map((tile) => {
    const next: Tile = {
      terrainId: tile.terrainId,
      shade: tile.shade,
      soil: tile.soil ?? createEmptySoil()
    };

    if (tile.flora) {
      next.flora = {
        id: tile.flora.id,
        nutrition: tile.flora.nutrition,
        age: tile.flora.age,
        growth: tile.flora.growth
      };
    }

    if (tile.fauna) {
      next.fauna = {
        id: tile.fauna.id,
        health: tile.fauna.health,
        hunger: tile.fauna.hunger,
        energy: tile.fauna.energy,
        age: tile.fauna.age
      };
    }

    return next;
  })
});

export const replaceTile = (world: World, x: number, y: number, tile: Tile): World => {
  const tiles = [...world.tiles];
  tiles[getIndex(world, x, y)] = tile;
  return {
    ...world,
    tiles
  };
};
