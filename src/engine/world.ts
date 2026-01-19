import { Tile, TerrainId, World } from "./types.js";

export const createEmptyTile = (terrainId: TerrainId): Tile => ({
  terrainId,
  shade: 0
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
      tiles.push(tileFactory ? tileFactory(x, y) : createEmptyTile(terrainId));
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
  return world.tiles[getIndex(world, x, y)];
};

export const cloneWorld = (world: World): World => ({
  width: world.width,
  height: world.height,
  tick: world.tick,
  tiles: world.tiles.map((tile) => ({
    terrainId: tile.terrainId,
    shade: tile.shade,
    flora: tile.flora
      ? {
          id: tile.flora.id,
          nutrition: tile.flora.nutrition,
          age: tile.flora.age,
          growth: tile.flora.growth
        }
      : undefined,
    fauna: tile.fauna
      ? {
          id: tile.fauna.id,
          health: tile.fauna.health,
          hunger: tile.fauna.hunger,
          energy: tile.fauna.energy,
          age: tile.fauna.age
        }
      : undefined
  }))
});

export const replaceTile = (world: World, x: number, y: number, tile: Tile): World => {
  const tiles = [...world.tiles];
  tiles[getIndex(world, x, y)] = tile;
  return {
    ...world,
    tiles
  };
};
