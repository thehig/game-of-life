import {
  DefinitionSet,
  FaunaId,
  FloraId,
  TerrainId,
  Tile,
  World
} from "./types.js";
import { createEmptyTile, createWorld, getIndex } from "./world.js";

const buildAsciiMap = <T extends string>(
  entries: Record<T, { ascii: string }>
): Map<string, T> => {
  const map = new Map<string, T>();
  for (const [id, definition] of Object.entries(entries) as [T, { ascii: string }][]) {
    map.set(definition.ascii, id);
  }
  return map;
};

export const renderAscii = (world: World, definitions: DefinitionSet): string => {
  const lines: string[] = [];

  for (let y = 0; y < world.height; y += 1) {
    let line = "";
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tiles[getIndex(world, x, y)];
      if (tile.fauna) {
        line += definitions.fauna[tile.fauna.id].ascii;
      } else if (tile.flora) {
        line += definitions.flora[tile.flora.id].ascii;
      } else {
        line += definitions.terrains[tile.terrainId].ascii;
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
};

export const parseAscii = (
  input: string,
  definitions: DefinitionSet,
  fallbackTerrain: TerrainId = "land"
): World => {
  const faunaMap = buildAsciiMap<FaunaId>(definitions.fauna);
  const floraMap = buildAsciiMap<FloraId>(definitions.flora);
  const terrainMap = buildAsciiMap<TerrainId>(definitions.terrains);
  const lines = input.replace(/\r/g, "").split("\n").filter((line) => line.length > 0);

  const width = Math.max(0, ...lines.map((line) => line.length));
  const height = lines.length;

  const world = createWorld(width, height, fallbackTerrain);
  const tiles: Tile[] = [];

  for (let y = 0; y < height; y += 1) {
    const line = lines[y];
    for (let x = 0; x < width; x += 1) {
      const char = line[x] ?? definitions.terrains[fallbackTerrain].ascii;
      const faunaId = faunaMap.get(char);
      const floraId = floraMap.get(char);
      const terrainId = terrainMap.get(char);

      if (faunaId) {
        const faunaDef = definitions.fauna[faunaId];
        const base = createEmptyTile(fallbackTerrain);
        tiles.push({
          ...base,
          fauna: {
            id: faunaId,
            health: faunaDef.maxHealth,
            hunger: 0,
            energy: 1,
            age: 0
          }
        });
      } else if (floraId) {
        const floraDef = definitions.flora[floraId];
        const base = createEmptyTile(fallbackTerrain);
        tiles.push({
          ...base,
          flora: {
            id: floraId,
            nutrition: floraDef.maxNutrition * 0.6,
            age: 0,
            growth: 0.3
          }
        });
      } else if (terrainId) {
        tiles.push(createEmptyTile(terrainId));
      } else {
        tiles.push(createEmptyTile(fallbackTerrain));
      }
    }
  }

  return {
    ...world,
    tiles
  };
};
