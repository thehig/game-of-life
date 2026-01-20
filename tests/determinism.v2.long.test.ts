import { beforeAll, describe, expect, it } from "vitest";
import { advanceEngineTicks, createTestEngineV2 } from "./engineV2.helpers.js";
import {
  applyTerrainStripes,
  getTerrainIdAt,
  setTerrainIdAt,
  spawnRandom
} from "../src/engine/index.js";
import type { CreatureModule } from "../src/engine/creature.js";
import type { DefinitionSet, SimulationTiming, TerrainId } from "../src/engine/types.js";
import { creature as grassCreature } from "../src/engine/creatures/grass.js";
import { creature as sheepCreature } from "../src/engine/creatures/sheep.js";
import { creature as wolfCreature } from "../src/engine/creatures/wolf.js";
import { loadDefinitionsFixture, loadTimingFixture } from "./helpers.js";

let definitions: DefinitionSet;
let timing: SimulationTiming;

beforeAll(async () => {
  definitions = await loadDefinitionsFixture();
  timing = await loadTimingFixture();
});

const width = 60;
const height = 40;
const longTicks = 1200;

const movementOffsets = [
  [0, 0],
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0]
] as const;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const getStateNumber = (state: Record<string, unknown>, key: string, fallback: number): number => {
  const value = state[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const createTreeModule = (): CreatureModule => ({
  id: "tree",
  layer: "flora",
  spawn: () => ({
    update: (_deltaTimeMs, api) => {
      const self = api.getSelf();
      const time = api.getTime();
      const tile = api.getTile(self.x, self.y);
      const terrainId = tile?.terrainId ?? "land";
      const terrain = api.getDefinitions().terrains[terrainId];
      const fertility = clamp01(terrain?.fertility ?? 0.5);
      const energy = clamp01(getStateNumber(self.state, "energy", 0.6) + (time.phase === "day" ? 0.008 : -0.004));
      const growth = clamp01(getStateNumber(self.state, "growth", 0.2) + fertility * 0.003);
      api.emit({
        kind: "setState",
        entityId: self.id,
        patch: { energy, growth, age: getStateNumber(self.state, "age", 0) + 1 }
      });
    },
    draw: () => undefined
  })
});

const createWandererModule = (id: string, hungerRate: number, energyLoss: number): CreatureModule => ({
  id,
  layer: "fauna",
  spawn: () => ({
    update: (_deltaTimeMs, api) => {
      const self = api.getSelf();
      const time = api.getTime();
      const currentTile = api.getTile(self.x, self.y);
      const forageBonus = currentTile?.floraEntityId ? 0.03 : 0;
      const hunger = clamp01(getStateNumber(self.state, "hunger", 0.2) + hungerRate - forageBonus);
      const energy = clamp01(getStateNumber(self.state, "energy", 1) - energyLoss - (time.phase === "night" ? 0.002 : 0));
      const health = clamp01(getStateNumber(self.state, "health", 1) - (hunger >= 1 ? 0.02 : 0));
      api.emit({
        kind: "setState",
        entityId: self.id,
        patch: { hunger, energy, health, age: getStateNumber(self.state, "age", 0) + 1 }
      });
      if (health <= 0) {
        api.emit({ kind: "despawn", entityId: self.id });
        return;
      }

      const startIndex = api.rngInt(0, movementOffsets.length);
      let targetX = self.x;
      let targetY = self.y;
      for (let i = 0; i < movementOffsets.length; i += 1) {
        const offset = movementOffsets[(startIndex + i) % movementOffsets.length];
        if (!offset) continue;
        const [dx, dy] = offset;
        const x = self.x + dx;
        const y = self.y + dy;
        if (!api.isPassable(x, y)) continue;
        const tile = api.getTile(x, y);
        if (!tile) continue;
        if (tile.faunaEntityId !== 0 && tile.faunaEntityId !== self.id) continue;
        targetX = x;
        targetY = y;
        break;
      }

      if (targetX !== self.x || targetY !== self.y) {
        api.emit({ kind: "move", entityId: self.id, toX: targetX, toY: targetY, score: 1 });
      }
    },
    draw: () => undefined
  })
});

const buildPaletteIndexById = (palette: TerrainId[]): Map<TerrainId, number> => {
  const map = new Map<TerrainId, number>();
  for (let i = 0; i < palette.length; i += 1) {
    const terrainId = palette[i];
    if (terrainId) {
      map.set(terrainId, i);
    }
  }
  return map;
};

const applyComplexTerrain = (engine: ReturnType<typeof createTestEngineV2>): void => {
  const paletteIndexById = buildPaletteIndexById(engine.world.terrainPalette);
  applyTerrainStripes(
    engine.world,
    paletteIndexById,
    [
      { terrainId: "land", sizeRatio: 3 },
      { terrainId: "soil", sizeRatio: 2 },
      { terrainId: "sand", sizeRatio: 2 },
      { terrainId: "mud", sizeRatio: 1 },
      { terrainId: "shallow_water", sizeRatio: 1 },
      { terrainId: "sea", sizeRatio: 1 },
      { terrainId: "rock", sizeRatio: 1 }
    ],
    "x"
  );

  const widthTiles = engine.world.width;
  const heightTiles = engine.world.height;
  for (let y = 0; y < heightTiles; y += 1) {
    for (let x = 0; x < widthTiles; x += 1) {
      const terrainId = getTerrainIdAt(engine.world, x, y);
      if (terrainId === "sea" || terrainId === "rock") {
        continue;
      }
      if (terrainId === "land" || terrainId === "soil" || terrainId === "dirt") {
        if ((x + y) % 13 === 0) {
          setTerrainIdAt(engine.world, x, y, "rich_soil");
        } else if ((x * 5 + y * 3) % 17 === 0) {
          setTerrainIdAt(engine.world, x, y, "toxic_soil");
        } else if ((x * 7 + y) % 11 === 0) {
          setTerrainIdAt(engine.world, x, y, "dirt");
        }
      }
    }
  }

  for (let y = 0; y < heightTiles; y += 1) {
    for (let x = 0; x < widthTiles; x += 1) {
      const idx = y * widthTiles + x;
      const terrainId = getTerrainIdAt(engine.world, x, y);
      if (terrainId === "rich_soil") {
        engine.world.soilFertilityBoost[idx] = 0.4;
      } else if (terrainId === "soil") {
        engine.world.soilFertilityBoost[idx] = 0.2;
      } else if (terrainId === "dirt") {
        engine.world.soilFertilityBoost[idx] = 0.12;
      } else if (terrainId === "sand") {
        engine.world.soilFertilityBoost[idx] = 0.02;
      } else if (terrainId === "mud") {
        engine.world.soilFertilityBoost[idx] = 0.08;
      } else if (terrainId === "shallow_water") {
        engine.world.soilFertilityBoost[idx] = 0.1;
      } else if (terrainId === "toxic_soil") {
        engine.world.soilToxicity[idx] = 0.35;
      }
    }
  }
};

const createLongRunEngine = (seed: number): ReturnType<typeof createTestEngineV2> => {
  const terrainIds: TerrainId[] = [
    "land",
    "soil",
    "sand",
    "mud",
    "shallow_water",
    "sea",
    "rock",
    "dirt",
    "rich_soil",
    "toxic_soil"
  ];
  const herbivoreModule = createWandererModule("herbivore", 0.006, 0.004);
  const carnivoreModule = createWandererModule("carnivore", 0.007, 0.005);
  const treeModule = createTreeModule();

  const engine = createTestEngineV2({
    width,
    height,
    definitions,
    timing,
    seed,
    terrainIds,
    modules: [grassCreature, sheepCreature, wolfCreature, herbivoreModule, carnivoreModule, treeModule]
  });

  applyComplexTerrain(engine);

  const totalTiles = width * height;
  spawnRandom(engine, "grass", "flora", Math.floor(totalTiles * 0.12));
  spawnRandom(engine, "tree", "flora", Math.floor(totalTiles * 0.03));
  spawnRandom(engine, "sheep", "fauna", Math.max(12, Math.floor(totalTiles * 0.01)));
  spawnRandom(engine, "wolf", "fauna", Math.max(4, Math.floor(totalTiles * 0.004)));
  spawnRandom(engine, "herbivore", "fauna", Math.max(8, Math.floor(totalTiles * 0.006)));
  spawnRandom(engine, "carnivore", "fauna", Math.max(4, Math.floor(totalTiles * 0.003)));

  return engine;
};

const hashStep = (hash: number, value: number): number => Math.imul(hash ^ value, 16777619) >>> 0;

const hashString = (hash: number, value: string): number => {
  let next = hash;
  for (let i = 0; i < value.length; i += 1) {
    next = hashStep(next, value.charCodeAt(i));
  }
  return next;
};

const fingerprintEngine = (engine: ReturnType<typeof createTestEngineV2>): number => {
  let hash = 2166136261;
  hash = hashStep(hash, engine.world.tick);
  hash = hashStep(hash, engine.world.width);
  hash = hashStep(hash, engine.world.height);

  for (const value of engine.world.terrain) {
    hash = hashStep(hash, value);
  }
  for (const value of engine.world.floraAt) {
    hash = hashStep(hash, value);
  }
  for (const value of engine.world.faunaAt) {
    hash = hashStep(hash, value);
  }
  for (const value of engine.world.soilFertilityBoost) {
    hash = hashStep(hash, Math.round(value * 1000));
  }
  for (const value of engine.world.soilToxicity) {
    hash = hashStep(hash, Math.round(value * 1000));
  }

  for (const entity of engine.entities.exportEntities()) {
    hash = hashStep(hash, entity.id);
    hash = hashString(hash, entity.typeId);
    hash = hashStep(hash, entity.layer === "flora" ? 1 : 2);
    hash = hashStep(hash, entity.x);
    hash = hashStep(hash, entity.y);
    hash = hashStep(hash, Math.round(getStateNumber(entity.state, "energy", 0) * 1000));
    hash = hashStep(hash, Math.round(getStateNumber(entity.state, "growth", 0) * 1000));
    hash = hashStep(hash, Math.round(getStateNumber(entity.state, "hunger", 0) * 1000));
    hash = hashStep(hash, Math.round(getStateNumber(entity.state, "health", 0) * 1000));
    hash = hashStep(hash, Math.round(getStateNumber(entity.state, "age", 0)));
  }

  return hash >>> 0;
};

const countArrayDiff = (first: Uint32Array, second: Uint32Array): number => {
  let diff = 0;
  for (let i = 0; i < first.length; i += 1) {
    if (first[i] !== second[i]) diff += 1;
  }
  return diff;
};

describe("engine v2 long-run determinism", () => {
  it("stays deterministic for long mixed-terrain runs", () => {
    const first = createLongRunEngine(4242);
    const second = createLongRunEngine(4242);

    advanceEngineTicks(first, longTicks);
    advanceEngineTicks(second, longTicks);

    expect(fingerprintEngine(first)).toBe(fingerprintEngine(second));
    expect(countArrayDiff(first.world.floraAt, second.world.floraAt)).toBe(0);
    expect(countArrayDiff(first.world.faunaAt, second.world.faunaAt)).toBe(0);
  });

  it("diverges across seeds but remains deterministic per seed", () => {
    const baselineA = createLongRunEngine(12345);
    const baselineB = createLongRunEngine(12345);
    const variant = createLongRunEngine(54321);

    advanceEngineTicks(baselineA, longTicks);
    advanceEngineTicks(baselineB, longTicks);
    advanceEngineTicks(variant, longTicks);

    const baselineHash = fingerprintEngine(baselineA);
    expect(baselineHash).toBe(fingerprintEngine(baselineB));
    expect(baselineHash).not.toBe(fingerprintEngine(variant));

    const totalTiles = baselineA.world.width * baselineA.world.height;
    const floraDiff = countArrayDiff(baselineA.world.floraAt, variant.world.floraAt);
    const faunaDiff = countArrayDiff(baselineA.world.faunaAt, variant.world.faunaAt);

    expect(floraDiff).toBeGreaterThan(Math.floor(totalTiles * 0.05));
    expect(faunaDiff).toBeGreaterThan(Math.floor(totalTiles * 0.01));
  });
});
