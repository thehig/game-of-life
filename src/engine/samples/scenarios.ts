import type { EngineV2 } from "../engine.v2.js";
import type { TerrainId, WorldLayers } from "../types.js";
import { applyBeachTerrain } from "../scenarios/beach.js";
import { applyTerrainFill } from "../scenarios/terrain.js";
import { spawnRandom } from "../scenarios/spawn.js";
import type { ScenarioDefinition, ScenarioRuntime } from "../scenarios/types.js";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const buildPaletteIndexByTerrainId = (world: WorldLayers): Map<TerrainId, number> => {
  const map = new Map<TerrainId, number>();
  for (let i = 0; i < world.terrainPalette.length; i += 1) {
    const terrainId = world.terrainPalette[i];
    if (terrainId) {
      map.set(terrainId, i);
    }
  }
  return map;
};

const resetEngineForScenario = (engine: EngineV2): void => {
  engine.loadEntities([]);
  engine.world.shade.fill(0);
  engine.world.soilFertilityBoost.fill(0);
  engine.world.soilToxicity.fill(0);
  engine.world.tick = 0;
  engine.rng.setState(engine.rng.getSeed());
};

const spawnByDensity = (
  engine: EngineV2,
  typeId: string,
  layer: "flora" | "fauna",
  density: number,
  region?: { minX: number; minY: number; maxXExclusive: number; maxYExclusive: number }
): void => {
  const total = Math.max(1, Math.floor(engine.world.width * engine.world.height * density));
  spawnRandom(engine, typeId, layer, total, region);
};

const createSoilScenario = (options: {
  id: string;
  name: string;
  description: string;
  terrainId: TerrainId;
  grassDensity: number;
}): ScenarioDefinition => ({
  id: options.id,
  name: options.name,
  description: options.description,
  setup: (engine) => {
    resetEngineForScenario(engine);
    const paletteIndexById = buildPaletteIndexByTerrainId(engine.world);
    applyTerrainFill(engine.world, paletteIndexById, options.terrainId);
    spawnByDensity(engine, "grass", "flora", options.grassDensity);
    return {
      id: options.id,
      name: options.name,
      description: options.description
    };
  }
});

const createBeachScenario = (): ScenarioDefinition => ({
  id: "beach_tide",
  name: "Beach Tide",
  description: "Sand bar with a tidal shoreline that laps on the day/night cycle.",
  setup: (engine) => {
    resetEngineForScenario(engine);
    const paletteIndexById = buildPaletteIndexByTerrainId(engine.world);
    const baseLeft = 0.22;
    const baseRight = 0.22;
    const tideAmplitude = 0.05;
    const landId: TerrainId = "land";
    const sandId: TerrainId = "sand";
    const seaId: TerrainId = "sea";

    let lastLeftBand = -1;
    let lastRightStart = -1;

    const applyTide = (leftRatio: number, rightRatio: number): void => {
      applyBeachTerrain(engine.world, paletteIndexById, {
        leftLandRatio: leftRatio,
        rightSeaRatio: rightRatio,
        landId,
        sandId,
        seaId
      });
      lastLeftBand = Math.floor(engine.world.width * leftRatio);
      lastRightStart = Math.floor(engine.world.width * (1 - rightRatio));
    };

    applyTide(baseLeft, baseRight);

    const leftLandEnd = Math.floor(engine.world.width * baseLeft);
    const rightSeaStart = Math.floor(engine.world.width * (1 - baseRight));
    spawnByDensity(engine, "grass", "flora", 0.0025, {
      minX: 0,
      minY: 0,
      maxXExclusive: leftLandEnd,
      maxYExclusive: engine.world.height
    });
    spawnByDensity(engine, "sheep", "fauna", 0.00002, {
      minX: 0,
      minY: 0,
      maxXExclusive: leftLandEnd,
      maxYExclusive: engine.world.height
    });
    spawnByDensity(engine, "wolf", "fauna", 0.000005, {
      minX: leftLandEnd,
      minY: 0,
      maxXExclusive: rightSeaStart,
      maxYExclusive: engine.world.height
    });

    const runtime: ScenarioRuntime = {
      id: "beach_tide",
      name: "Beach Tide",
      description: "Sand bar with a tidal shoreline that laps on the day/night cycle.",
      update: (current) => {
        const timing = current.timing;
        const cycleLength = timing.dayLength + timing.nightLength;
        if (cycleLength <= 0) return;
        const cycleTick = current.world.tick % cycleLength;
        const phase = cycleTick / cycleLength;
        const tideWave = Math.sin(phase * Math.PI * 2);
        const leftRatio = clamp(baseLeft + tideAmplitude * tideWave, 0.1, 0.45);
        const rightRatio = clamp(baseRight + tideAmplitude * tideWave, 0.1, 0.45);
        const leftBand = Math.floor(current.world.width * leftRatio);
        const rightStart = Math.floor(current.world.width * (1 - rightRatio));
        if (leftBand === lastLeftBand && rightStart === lastRightStart) {
          return;
        }
        applyTide(leftRatio, rightRatio);
      }
    };

    return runtime;
  }
});

export const scenarioSamples: ScenarioDefinition[] = [
  createSoilScenario({
    id: "soil_grass_basic",
    name: "Grass on Soil",
    description: "Baseline grass growth on standard soil.",
    terrainId: "soil",
    grassDensity: 0.002
  }),
  createSoilScenario({
    id: "soil_grass_healthy",
    name: "Grass on Healthy Soil",
    description: "Faster grass growth on rich soil.",
    terrainId: "rich_soil",
    grassDensity: 0.0025
  }),
  createSoilScenario({
    id: "soil_grass_toxic",
    name: "Grass on Toxic Soil",
    description: "Struggling grass on toxic soil.",
    terrainId: "toxic_soil",
    grassDensity: 0.0015
  }),
  createBeachScenario()
];

export const getScenarioSample = (id: string): ScenarioDefinition | null =>
  scenarioSamples.find((sample) => sample.id === id) ?? null;
