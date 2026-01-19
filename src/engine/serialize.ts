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
      if (!tile) {
        throw new Error(`Missing tile at (${x}, ${y})`);
      }
      if (tile.fauna) {
        const faunaDef = definitions.fauna[tile.fauna.id];
        if (!faunaDef) {
          throw new Error(`Missing fauna definition: ${tile.fauna.id}`);
        }
        line += faunaDef.ascii;
      } else if (tile.flora) {
        const floraDef = definitions.flora[tile.flora.id];
        if (!floraDef) {
          throw new Error(`Missing flora definition: ${tile.flora.id}`);
        }
        line += floraDef.ascii;
      } else {
        const terrainDef = definitions.terrains[tile.terrainId];
        if (!terrainDef) {
          throw new Error(`Missing terrain definition: ${tile.terrainId}`);
        }
        line += terrainDef.ascii;
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
  const fallbackDef = definitions.terrains[fallbackTerrain];
  if (!fallbackDef) {
    throw new Error(`Missing terrain definition: ${fallbackTerrain}`);
  }

  const width = Math.max(0, ...lines.map((line) => line.length));
  const height = lines.length;

  const world = createWorld(width, height, fallbackTerrain);
  const tiles: Tile[] = [];

  for (let y = 0; y < height; y += 1) {
    const line = lines[y] ?? "";
    for (let x = 0; x < width; x += 1) {
      const char = line[x] ?? fallbackDef.ascii;
      const faunaId = faunaMap.get(char);
      const floraId = floraMap.get(char);
      const terrainId = terrainMap.get(char);

      if (faunaId) {
        const faunaDef = definitions.fauna[faunaId];
        if (!faunaDef) {
          throw new Error(`Missing fauna definition: ${faunaId}`);
        }
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
        if (!floraDef) {
          throw new Error(`Missing flora definition: ${floraId}`);
        }
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
