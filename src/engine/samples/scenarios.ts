import type { EngineV2 } from "../engine.v2.js";
import type { TerrainId, WorldLayers } from "../types.js";
import { applyBeachTerrain } from "../scenarios/beach.js";
import { applyTerrainFill, applyTerrainStripes } from "../scenarios/terrain.js";
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

type Region = { minX: number; minY: number; maxXExclusive: number; maxYExclusive: number };

type SeedPulse = {
  typeId: string;
  layer: "flora" | "fauna";
  everyTicks: number;
  count: number;
  region: Region;
};

const clampRegion = (engine: EngineV2, region: Region): Region => ({
  minX: clamp(region.minX, 0, engine.world.width - 1),
  minY: clamp(region.minY, 0, engine.world.height - 1),
  maxXExclusive: clamp(region.maxXExclusive, 1, engine.world.width),
  maxYExclusive: clamp(region.maxYExclusive, 1, engine.world.height)
});

const setTerrainRect = (
  world: WorldLayers,
  paletteIndexById: ReadonlyMap<TerrainId, number>,
  terrainId: TerrainId,
  region: Region
): void => {
  const terrainIndex = paletteIndexById.get(terrainId);
  if (terrainIndex === undefined) {
    throw new Error(`Terrain palette missing '${terrainId}'`);
  }
  for (let y = region.minY; y < region.maxYExclusive; y += 1) {
    const rowStart = y * world.width;
    for (let x = region.minX; x < region.maxXExclusive; x += 1) {
      world.terrain[rowStart + x] = terrainIndex;
    }
  }
};

const applySoilProfile = (engine: EngineV2): void => {
  for (let y = 0; y < engine.world.height; y += 1) {
    for (let x = 0; x < engine.world.width; x += 1) {
      const idx = y * engine.world.width + x;
      const terrainId = engine.world.terrainPalette[engine.world.terrain[idx] ?? 0] ?? "land";
      let fertility = 0;
      let toxicity = 0;
      if (terrainId === "rich_soil") {
        fertility = 0.4;
      } else if (terrainId === "soil") {
        fertility = 0.2;
      } else if (terrainId === "dirt") {
        fertility = 0.12;
      } else if (terrainId === "sand") {
        fertility = 0.04;
      } else if (terrainId === "mud") {
        fertility = 0.08;
      } else if (terrainId === "shallow_water") {
        fertility = 0.1;
      } else if (terrainId === "toxic_soil") {
        toxicity = 0.35;
      }
      engine.world.soilFertilityBoost[idx] = fertility;
      engine.world.soilToxicity[idx] = toxicity;
    }
  }
};

const spawnRandomWithState = (
  engine: EngineV2,
  typeId: string,
  layer: "flora" | "fauna",
  count: number,
  region: Region,
  state: Record<string, unknown>
): void => {
  const ids = spawnRandom(engine, typeId, layer, count, region);
  for (const id of ids) {
    engine.entities.setState(id, state);
  }
};

const applySeedPulses = (engine: EngineV2, pulses: SeedPulse[]): void => {
  for (const pulse of pulses) {
    if (engine.world.tick % pulse.everyTicks !== 0) continue;
    spawnRandom(engine, pulse.typeId, pulse.layer, pulse.count, pulse.region);
  }
};

const spawnAtSafe = (
  engine: EngineV2,
  typeId: string,
  layer: "flora" | "fauna",
  x: number,
  y: number,
  state?: Record<string, unknown>
): void => {
  try {
    engine.spawn(typeId, layer, x, y, state);
  } catch {
    // ignore placement errors
  }
};

const createCornerFloraScenario = (): ScenarioDefinition => ({
  id: "corner_flora_race",
  name: "Corner Flora Race",
  description: "Four flora types seeded in corners with pulsed seeding on distinct soils.",
  setup: (engine) => {
    resetEngineForScenario(engine);
    const paletteIndexById = buildPaletteIndexByTerrainId(engine.world);
    applyTerrainFill(engine.world, paletteIndexById, "soil");

    const midX = Math.floor(engine.world.width / 2);
    const midY = Math.floor(engine.world.height / 2);

    setTerrainRect(engine.world, paletteIndexById, "rich_soil", {
      minX: 0,
      minY: 0,
      maxXExclusive: midX,
      maxYExclusive: midY
    });
    setTerrainRect(engine.world, paletteIndexById, "soil", {
      minX: midX,
      minY: 0,
      maxXExclusive: engine.world.width,
      maxYExclusive: midY
    });
    setTerrainRect(engine.world, paletteIndexById, "sand", {
      minX: 0,
      minY: midY,
      maxXExclusive: midX,
      maxYExclusive: engine.world.height
    });
    setTerrainRect(engine.world, paletteIndexById, "toxic_soil", {
      minX: midX,
      minY: midY,
      maxXExclusive: engine.world.width,
      maxYExclusive: engine.world.height
    });

    applySoilProfile(engine);

    const cornerSize = Math.max(4, Math.floor(Math.min(engine.world.width, engine.world.height) * 0.12));
    const topLeft = clampRegion(engine, {
      minX: 1,
      minY: 1,
      maxXExclusive: cornerSize,
      maxYExclusive: cornerSize
    });
    const topRight = clampRegion(engine, {
      minX: engine.world.width - cornerSize,
      minY: 1,
      maxXExclusive: engine.world.width,
      maxYExclusive: cornerSize
    });
    const bottomLeft = clampRegion(engine, {
      minX: 1,
      minY: engine.world.height - cornerSize,
      maxXExclusive: cornerSize,
      maxYExclusive: engine.world.height
    });
    const bottomRight = clampRegion(engine, {
      minX: engine.world.width - cornerSize,
      minY: engine.world.height - cornerSize,
      maxXExclusive: engine.world.width,
      maxYExclusive: engine.world.height
    });

    spawnRandom(engine, "grass", "flora", 24, topLeft);
    spawnRandom(engine, "clover", "flora", 20, topRight);
    spawnRandom(engine, "cactus", "flora", 16, bottomLeft);
    spawnRandom(engine, "moss", "flora", 22, bottomRight);

    const pulses: SeedPulse[] = [
      {
        typeId: "grass",
        layer: "flora",
        everyTicks: 18,
        count: 6,
        region: clampRegion(engine, { minX: 0, minY: 0, maxXExclusive: midX, maxYExclusive: midY })
      },
      {
        typeId: "clover",
        layer: "flora",
        everyTicks: 22,
        count: 5,
        region: clampRegion(engine, { minX: midX, minY: 0, maxXExclusive: engine.world.width, maxYExclusive: midY })
      },
      {
        typeId: "cactus",
        layer: "flora",
        everyTicks: 26,
        count: 4,
        region: clampRegion(engine, { minX: 0, minY: midY, maxXExclusive: midX, maxYExclusive: engine.world.height })
      },
      {
        typeId: "moss",
        layer: "flora",
        everyTicks: 20,
        count: 5,
        region: clampRegion(engine, { minX: midX, minY: midY, maxXExclusive: engine.world.width, maxYExclusive: engine.world.height })
      }
    ];

    return {
      id: "corner_flora_race",
      name: "Corner Flora Race",
      description: "Four flora types seeded in corners with pulsed seeding on distinct soils.",
      update: (current) => {
        applySeedPulses(current, pulses);
      }
    };
  }
});

const createShorelineSuccessionScenario = (): ScenarioDefinition => ({
  id: "shoreline_succession",
  name: "Shoreline Succession",
  description: "Land, dunes, and shallows seeded with terrestrial and aquatic flora.",
  setup: (engine) => {
    resetEngineForScenario(engine);
    const paletteIndexById = buildPaletteIndexByTerrainId(engine.world);
    applyTerrainStripes(
      engine.world,
      paletteIndexById,
      [
        { terrainId: "land", sizeRatio: 3 },
        { terrainId: "sand", sizeRatio: 2 },
        { terrainId: "shallow_water", sizeRatio: 2 },
        { terrainId: "sea", sizeRatio: 2 }
      ],
      "x"
    );

    applySoilProfile(engine);

    const landEnd = Math.floor(engine.world.width * 0.3);
    const sandEnd = Math.floor(engine.world.width * 0.5);
    const shallowEnd = Math.floor(engine.world.width * 0.7);

    spawnRandom(engine, "grass", "flora", 120, {
      minX: 0,
      minY: 0,
      maxXExclusive: landEnd,
      maxYExclusive: engine.world.height
    });
    spawnRandom(engine, "berry_bush", "flora", 50, {
      minX: 0,
      minY: 0,
      maxXExclusive: landEnd,
      maxYExclusive: engine.world.height
    });
    spawnRandom(engine, "cactus", "flora", 40, {
      minX: landEnd,
      minY: 0,
      maxXExclusive: sandEnd,
      maxYExclusive: engine.world.height
    });
    spawnRandom(engine, "lily", "flora", 30, {
      minX: sandEnd,
      minY: 0,
      maxXExclusive: shallowEnd,
      maxYExclusive: engine.world.height
    });
    spawnRandom(engine, "kelp", "flora", 40, {
      minX: sandEnd,
      minY: 0,
      maxXExclusive: shallowEnd,
      maxYExclusive: engine.world.height
    });

    return {
      id: "shoreline_succession",
      name: "Shoreline Succession",
      description: "Land, dunes, and shallows seeded with terrestrial and aquatic flora."
    };
  }
});

const createSheepdogScenario = (options: {
  id: string;
  name: string;
  description: string;
  wolves: number;
  packComms: boolean;
}): ScenarioDefinition => ({
  id: options.id,
  name: options.name,
  description: options.description,
  setup: (engine) => {
    resetEngineForScenario(engine);
    const paletteIndexById = buildPaletteIndexByTerrainId(engine.world);
    applyTerrainFill(engine.world, paletteIndexById, "soil");
    applySoilProfile(engine);

    spawnByDensity(engine, "grass", "flora", 0.006);

    const herdRegion = clampRegion(engine, {
      minX: Math.floor(engine.world.width * 0.35),
      minY: Math.floor(engine.world.height * 0.35),
      maxXExclusive: Math.floor(engine.world.width * 0.65),
      maxYExclusive: Math.floor(engine.world.height * 0.65)
    });
    spawnRandom(engine, "sheep", "fauna", Math.max(18, Math.floor(engine.world.width * engine.world.height * 0.008)), herdRegion);

    const centerX = Math.floor(engine.world.width / 2);
    const centerY = Math.floor(engine.world.height / 2);
    spawnAtSafe(engine, "sheepdog", "fauna", centerX, centerY);

    const wolfRegion = clampRegion(engine, {
      minX: Math.floor(engine.world.width * 0.05),
      minY: Math.floor(engine.world.height * 0.1),
      maxXExclusive: Math.floor(engine.world.width * 0.25),
      maxYExclusive: Math.floor(engine.world.height * 0.9)
    });

    if (options.packComms) {
      spawnRandomWithState(engine, "wolf", "fauna", options.wolves, wolfRegion, { packComms: true });
    } else {
      spawnRandom(engine, "wolf", "fauna", options.wolves, wolfRegion);
    }

    return {
      id: options.id,
      name: options.name,
      description: options.description
    };
  }
});

const createWolfPackScenario = (options: {
  id: string;
  name: string;
  description: string;
  wolves: number;
  packComms: boolean;
}): ScenarioDefinition => ({
  id: options.id,
  name: options.name,
  description: options.description,
  setup: (engine) => {
    resetEngineForScenario(engine);
    const paletteIndexById = buildPaletteIndexByTerrainId(engine.world);
    applyTerrainFill(engine.world, paletteIndexById, "land");
    applySoilProfile(engine);

    spawnByDensity(engine, "grass", "flora", 0.004);

    const herdA = clampRegion(engine, {
      minX: Math.floor(engine.world.width * 0.1),
      minY: Math.floor(engine.world.height * 0.1),
      maxXExclusive: Math.floor(engine.world.width * 0.3),
      maxYExclusive: Math.floor(engine.world.height * 0.3)
    });
    const herdB = clampRegion(engine, {
      minX: Math.floor(engine.world.width * 0.7),
      minY: Math.floor(engine.world.height * 0.7),
      maxXExclusive: Math.floor(engine.world.width * 0.9),
      maxYExclusive: Math.floor(engine.world.height * 0.9)
    });
    spawnRandom(engine, "sheep", "fauna", Math.max(12, Math.floor(engine.world.width * engine.world.height * 0.004)), herdA);
    spawnRandom(engine, "sheep", "fauna", Math.max(12, Math.floor(engine.world.width * engine.world.height * 0.004)), herdB);

    const wolfRegion = clampRegion(engine, {
      minX: Math.floor(engine.world.width * 0.4),
      minY: Math.floor(engine.world.height * 0.4),
      maxXExclusive: Math.floor(engine.world.width * 0.6),
      maxYExclusive: Math.floor(engine.world.height * 0.6)
    });

    if (options.packComms) {
      spawnRandomWithState(engine, "wolf", "fauna", options.wolves, wolfRegion, { packComms: true });
    } else {
      spawnRandom(engine, "wolf", "fauna", options.wolves, wolfRegion);
    }

    return {
      id: options.id,
      name: options.name,
      description: options.description
    };
  }
});

const createCarrionScenario = (): ScenarioDefinition => ({
  id: "carrion_cycle",
  name: "Carrion Cycle",
  description: "Wolves cull a herd, leaving carcasses that enrich nearby soil.",
  setup: (engine) => {
    resetEngineForScenario(engine);
    const paletteIndexById = buildPaletteIndexByTerrainId(engine.world);
    applyTerrainFill(engine.world, paletteIndexById, "land");
    applySoilProfile(engine);

    const herdRegion = clampRegion(engine, {
      minX: Math.floor(engine.world.width * 0.25),
      minY: Math.floor(engine.world.height * 0.25),
      maxXExclusive: Math.floor(engine.world.width * 0.75),
      maxYExclusive: Math.floor(engine.world.height * 0.75)
    });
    spawnRandom(engine, "sheep", "fauna", Math.max(20, Math.floor(engine.world.width * engine.world.height * 0.01)), herdRegion);
    spawnByDensity(engine, "grass", "flora", 0.004);

    const wolfRegion = clampRegion(engine, {
      minX: Math.floor(engine.world.width * 0.05),
      minY: Math.floor(engine.world.height * 0.1),
      maxXExclusive: Math.floor(engine.world.width * 0.2),
      maxYExclusive: Math.floor(engine.world.height * 0.9)
    });
    spawnRandomWithState(engine, "wolf", "fauna", 2, wolfRegion, { hunger: 0.15 });

    return {
      id: "carrion_cycle",
      name: "Carrion Cycle",
      description: "Wolves cull a herd, leaving carcasses that enrich nearby soil."
    };
  }
});

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
  createBeachScenario(),
  createCornerFloraScenario(),
  createShorelineSuccessionScenario(),
  createSheepdogScenario({
    id: "sheepdog_vs_wolf",
    name: "Sheepdog vs One Wolf",
    description: "A grazing herd guarded by a sheepdog against a lone wolf.",
    wolves: 1,
    packComms: false
  }),
  createSheepdogScenario({
    id: "sheepdog_vs_two_wolves",
    name: "Sheepdog vs Two Wolves",
    description: "Two wolves test the sheepdog's ability to guard the herd.",
    wolves: 2,
    packComms: false
  }),
  createWolfPackScenario({
    id: "wolf_pair",
    name: "Two Wolves (No Comms)",
    description: "Two wolves hunt separate herds without coordination.",
    wolves: 2,
    packComms: false
  }),
  createWolfPackScenario({
    id: "wolf_pack_comms",
    name: "Communicating Wolf Pack",
    description: "Two wolves share signals and converge on distant sheep.",
    wolves: 2,
    packComms: true
  }),
  createCarrionScenario()
];

export const getScenarioSample = (id: string): ScenarioDefinition | null =>
  scenarioSamples.find((sample) => sample.id === id) ?? null;
