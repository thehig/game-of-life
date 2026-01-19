import {
  buildTerrainPalette,
  createWorldLayers,
  EngineV2,
  getIndex,
  getTerrainIdAt,
  setTerrainIdAt
} from "../src/engine/index.js";
import type { CreatureModule } from "../src/engine/creature.js";
import type { DefinitionSet, Entity, EntityId, SimulationTiming, TerrainId } from "../src/engine/types.js";

type AsciiGrid = {
  lines: string[];
  width: number;
  height: number;
};

const parseAsciiLines = (input: string): AsciiGrid => {
  const lines = input.replace(/\r/g, "").split("\n");
  while (lines.length > 0 && lines[0].trim().length === 0) {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim().length === 0) {
    lines.pop();
  }
  const width = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return { lines, width, height: lines.length };
};

const buildAsciiLookup = <T extends string>(entries: Record<T, { ascii: string }>): Map<string, T> => {
  const map = new Map<string, T>();
  for (const [id, definition] of Object.entries(entries) as [T, { ascii: string }][]) {
    map.set(definition.ascii, id);
  }
  return map;
};

export const normalizeAscii = (input: string): string => parseAsciiLines(input).lines.join("\n");

export const createTestEngineV2 = (options: {
  width: number;
  height: number;
  definitions: DefinitionSet;
  timing: SimulationTiming;
  seed?: number;
  defaultTerrainId?: TerrainId;
  terrainIds?: TerrainId[];
  modules?: CreatureModule[];
}): EngineV2 => {
  const defaultTerrainId = options.defaultTerrainId ?? "land";
  const terrainPalette = buildTerrainPalette(options.terrainIds ?? [], defaultTerrainId);
  const defaultTerrainIndex = terrainPalette.indexOf(defaultTerrainId);
  if (defaultTerrainIndex < 0) {
    throw new Error(`Missing default terrain '${defaultTerrainId}' in palette`);
  }

  const world = createWorldLayers({
    width: options.width,
    height: options.height,
    terrainPalette,
    defaultTerrainIndex
  });
  const engine = new EngineV2({
    definitions: options.definitions,
    timing: options.timing,
    world,
    seed: options.seed ?? 1
  });

  if (options.modules) {
    for (const module of options.modules) {
      engine.registerModule(module);
    }
  }

  return engine;
};

export const createEngineFromAscii = (options: {
  ascii: string;
  definitions: DefinitionSet;
  timing: SimulationTiming;
  modules: CreatureModule[];
  seed?: number;
  defaultTerrainId?: TerrainId;
}): EngineV2 => {
  const grid = parseAsciiLines(options.ascii);
  if (grid.width <= 0 || grid.height <= 0) {
    throw new Error("ASCII map is empty");
  }

  const defaultTerrainId = options.defaultTerrainId ?? "land";
  const terrainLookup = buildAsciiLookup(options.definitions.terrains);
  const floraLookup = buildAsciiLookup(options.definitions.flora);
  const faunaLookup = buildAsciiLookup(options.definitions.fauna);

  const terrainIds = new Set<TerrainId>();
  for (let y = 0; y < grid.height; y += 1) {
    const line = grid.lines[y] ?? "";
    for (let x = 0; x < grid.width; x += 1) {
      const char = line[x];
      if (!char || char === " ") {
        continue;
      }
      const terrainId = terrainLookup.get(char);
      if (terrainId) {
        terrainIds.add(terrainId);
      }
    }
  }

  const engine = createTestEngineV2({
    width: grid.width,
    height: grid.height,
    definitions: options.definitions,
    timing: options.timing,
    seed: options.seed,
    defaultTerrainId,
    terrainIds: [...terrainIds],
    modules: options.modules
  });

  for (let y = 0; y < grid.height; y += 1) {
    const line = grid.lines[y] ?? "";
    for (let x = 0; x < grid.width; x += 1) {
      const char = line[x];
      if (!char || char === " ") {
        continue;
      }
      const faunaId = faunaLookup.get(char);
      const floraId = floraLookup.get(char);
      const terrainId = terrainLookup.get(char);
      const matchCount = (faunaId ? 1 : 0) + (floraId ? 1 : 0) + (terrainId ? 1 : 0);
      if (matchCount > 1) {
        throw new Error(`Ambiguous ascii '${char}' at (${x}, ${y})`);
      }
      if (terrainId) {
        setTerrainIdAt(engine.world, x, y, terrainId);
        continue;
      }
      if (faunaId) {
        engine.spawn(faunaId, "fauna", x, y, {});
        continue;
      }
      if (floraId) {
        engine.spawn(floraId, "flora", x, y, {});
        continue;
      }
      throw new Error(`Unknown ascii '${char}' at (${x}, ${y})`);
    }
  }

  return engine;
};

export const advanceEngineTicks = (engine: EngineV2, ticks: number, deltaTimeMs = 16): void => {
  for (let i = 0; i < ticks; i += 1) {
    engine.step(deltaTimeMs);
  }
};

export const renderEngineAscii = (engine: EngineV2): string => {
  const lines: string[] = [];
  for (let y = 0; y < engine.world.height; y += 1) {
    let line = "";
    for (let x = 0; x < engine.world.width; x += 1) {
      const idx = getIndex(engine.world, x, y);
      const faunaId = engine.world.faunaAt[idx];
      if (faunaId) {
        const entity = engine.entities.get(faunaId as EntityId);
        if (!entity) {
          throw new Error(`Missing fauna entity ${faunaId}`);
        }
        const def = engine.definitions.fauna[entity.typeId];
        if (!def) {
          throw new Error(`Missing fauna definition: ${entity.typeId}`);
        }
        line += def.ascii;
        continue;
      }

      const floraId = engine.world.floraAt[idx];
      if (floraId) {
        const entity = engine.entities.get(floraId as EntityId);
        if (!entity) {
          throw new Error(`Missing flora entity ${floraId}`);
        }
        const def = engine.definitions.flora[entity.typeId];
        if (!def) {
          throw new Error(`Missing flora definition: ${entity.typeId}`);
        }
        line += def.ascii;
        continue;
      }

      const terrainId = getTerrainIdAt(engine.world, x, y);
      const terrain = engine.definitions.terrains[terrainId];
      if (!terrain) {
        throw new Error(`Missing terrain definition: ${terrainId}`);
      }
      line += terrain.ascii;
    }
    lines.push(line);
  }
  return lines.join("\n");
};

export const getEntityAt = (engine: EngineV2, layer: "flora" | "fauna", x: number, y: number): Entity | undefined => {
  const idx = getIndex(engine.world, x, y);
  const id = layer === "flora" ? engine.world.floraAt[idx] : engine.world.faunaAt[idx];
  if (!id) {
    return undefined;
  }
  return engine.entities.get(id as EntityId);
};

export const getEntityStateNumber = (entity: Entity | undefined, key: string, fallback: number): number => {
  if (!entity) {
    return fallback;
  }
  const value = entity.state[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};
