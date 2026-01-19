import { RuleSet, Tile, World } from "../types.js";
import { getIndex, isInBounds } from "../world.js";

const neighborOffsets = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
] as const;

const countLiveNeighbors = (world: World, x: number, y: number): number => {
  let count = 0;
  for (const [dx, dy] of neighborOffsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (!isInBounds(world, nx, ny)) {
      continue;
    }
    const neighbor = world.tiles[getIndex(world, nx, ny)];
    if (neighbor.fauna?.id === "conway") {
      count += 1;
    }
  }
  return count;
};

export const conwayRules: RuleSet = {
  id: "conway",
  name: "Conway",
  step: (world) => {
    const tiles: Tile[] = [];

    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const index = getIndex(world, x, y);
        const tile = world.tiles[index];
        const liveNeighbors = countLiveNeighbors(world, x, y);
        const isAlive = tile.fauna?.id === "conway";
        const nextAlive = liveNeighbors === 3 || (isAlive && liveNeighbors === 2);

        tiles.push({
          terrainId: tile.terrainId,
          flora: tile.flora ? { ...tile.flora } : undefined,
          shade: tile.shade,
          soil: tile.soil,
          fauna: nextAlive
            ? {
                id: "conway",
                health: 1,
                hunger: 0,
                energy: 0,
                age: isAlive ? (tile.fauna?.age ?? 0) + 1 : 0
              }
            : undefined
        });
      }
    }

    return {
      width: world.width,
      height: world.height,
      tick: world.tick + 1,
      tiles
    };
  }
};
