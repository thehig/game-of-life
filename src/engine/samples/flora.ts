type GrassConfig = {
  maxHeight: number;
  spreadHeight: number;
  baseGrowthRate: number;
  nightPenalty: number;
  shadePenalty: number;
  energyRate: number;
  maintenanceCost: number;
  spreadEnergyCost: number;
  spreadDensity: number;
  ringBandHeight: number;
};

const createGrassConfig = (overrides: Partial<GrassConfig> = {}): GrassConfig => ({
  maxHeight: 1,
  spreadHeight: 0.6,
  baseGrowthRate: 0.04,
  nightPenalty: 0.35,
  shadePenalty: 0.5,
  energyRate: 0.03,
  maintenanceCost: 0.005,
  spreadEnergyCost: 0.2,
  spreadDensity: 0.6,
  ringBandHeight: 0.35,
  ...overrides
});

type FlowerProfile = {
  budRate: number;
  bloomThreshold: number;
  nectarPerBloom: number;
  nectarCap: number;
  seedPerVisit: number;
  nectarPerVisit: number;
};

const createFlowerProfile = (overrides: Partial<FlowerProfile> = {}): FlowerProfile => ({
  budRate: 0.4,
  bloomThreshold: 3,
  nectarPerBloom: 0.6,
  nectarCap: 6,
  seedPerVisit: 2,
  nectarPerVisit: 0.4,
  ...overrides
});

type VineProfile = {
  climbRate: number;
  maxHeight: number;
  gripStrength: number;
};

const createVineProfile = (overrides: Partial<VineProfile> = {}): VineProfile => ({
  climbRate: 0.6,
  maxHeight: 8,
  gripStrength: 0.4,
  ...overrides
});

type FungusProfile = {
  sporeRadius: number;
  spreadDensity: number;
  moistureSensitivity: number;
};

const createFungusProfile = (overrides: Partial<FungusProfile> = {}): FungusProfile => ({
  sporeRadius: 2,
  spreadDensity: 0.5,
  moistureSensitivity: 0.8,
  ...overrides
});

type CactusProfile = {
  waterCapacity: number;
  droughtTolerance: number;
};

const createCactusProfile = (overrides: Partial<CactusProfile> = {}): CactusProfile => ({
  waterCapacity: 1,
  droughtTolerance: 0.8,
  ...overrides
});

type TreeSpecies = {
  id: string;
  growthRate: number;
  maxHeight: number;
  strength: number;
  shadePerHeight: number;
  deathAge: number;
  corpseDecayRate: number;
  seasonalProfile?: string;
  waterNeed?: number;
};

const treeSpecies = {
  oak: {
    id: "oak",
    growthRate: 0.011,
    maxHeight: 16,
    strength: 0.8,
    shadePerHeight: 0.55,
    deathAge: 120,
    corpseDecayRate: 0.05,
    seasonalProfile: "deciduous"
  },
  pine: {
    id: "pine",
    growthRate: 0.013,
    maxHeight: 20,
    strength: 0.7,
    shadePerHeight: 0.45,
    deathAge: 130,
    corpseDecayRate: 0.04,
    seasonalProfile: "evergreen"
  },
  willow: {
    id: "willow",
    growthRate: 0.015,
    maxHeight: 14,
    strength: 0.55,
    shadePerHeight: 0.65,
    deathAge: 100,
    corpseDecayRate: 0.06,
    seasonalProfile: "deciduous",
    waterNeed: 0.9
  }
} satisfies Record<string, TreeSpecies>;

type FloraSample = {
  id: string;
  kind: string;
  capabilities: string[];
  seasonalProfile: string;
  waterNeed: number;
  growthProfile?: GrassConfig;
  flowerProfile?: FlowerProfile;
  sporeProfile?: FungusProfile;
  cactusProfile?: CactusProfile;
  vineProfile?: VineProfile;
  treeProfile?: TreeSpecies;
  nitrogenFixer?: boolean;
  aquatic?: boolean;
  fruiting?: { fruitEnergy: number; ripenTime: number };
  growthRate?: number;
};

export const floraSamples: FloraSample[] = [
  {
    id: "grass",
    kind: "groundcover",
    capabilities: ["spread", "regrow", "grazing"],
    seasonalProfile: "evergreen",
    waterNeed: 0.5,
    growthProfile: createGrassConfig({ spreadHeight: 0.55, spreadDensity: 0.7 })
  },
  {
    id: "clover",
    kind: "groundcover",
    capabilities: ["nitrogenFixer", "pollinatorFood"],
    seasonalProfile: "deciduous",
    waterNeed: 0.6,
    nitrogenFixer: true,
    flowerProfile: createFlowerProfile({ nectarPerBloom: 0.5, seedPerVisit: 3 })
  },
  {
    id: "wildflower",
    kind: "flower",
    capabilities: ["pollination", "seedBurst"],
    seasonalProfile: "deciduous",
    waterNeed: 0.4,
    flowerProfile: createFlowerProfile({ budRate: 0.6, nectarCap: 8 })
  },
  {
    id: "sunflower",
    kind: "flower",
    capabilities: ["pollination", "tallStalk"],
    seasonalProfile: "deciduous",
    waterNeed: 0.7,
    flowerProfile: createFlowerProfile({ budRate: 0.7, bloomThreshold: 4, nectarCap: 10 })
  },
  {
    id: "fern",
    kind: "shadePlant",
    capabilities: ["shadeTolerance", "sporeSpread"],
    seasonalProfile: "evergreen",
    waterNeed: 0.8,
    sporeProfile: createFungusProfile({ sporeRadius: 1, spreadDensity: 0.6 })
  },
  {
    id: "moss",
    kind: "groundcover",
    capabilities: ["shadeTolerance", "moistureRetention"],
    seasonalProfile: "evergreen",
    waterNeed: 0.9,
    sporeProfile: createFungusProfile({ sporeRadius: 1, spreadDensity: 0.4 })
  },
  {
    id: "cactus",
    kind: "succulent",
    capabilities: ["droughtSurvival", "waterStorage"],
    seasonalProfile: "dormant",
    waterNeed: 0.1,
    cactusProfile: createCactusProfile({ droughtTolerance: 0.9, waterCapacity: 1.2 })
  },
  {
    id: "lily",
    kind: "aquaticFlower",
    capabilities: ["pollination", "floatingLeaves"],
    seasonalProfile: "deciduous",
    waterNeed: 1,
    aquatic: true,
    flowerProfile: createFlowerProfile({ budRate: 0.5, nectarCap: 7 })
  },
  {
    id: "kelp",
    kind: "aquatic",
    capabilities: ["underwater", "rapidGrowth"],
    seasonalProfile: "evergreen",
    waterNeed: 1,
    aquatic: true,
    growthRate: 0.08
  },
  {
    id: "berry_bush",
    kind: "shrub",
    capabilities: ["fruiting", "birdFood"],
    seasonalProfile: "deciduous",
    waterNeed: 0.6,
    flowerProfile: createFlowerProfile({ budRate: 0.5, seedPerVisit: 4 }),
    fruiting: { fruitEnergy: 0.4, ripenTime: 4 }
  },
  {
    id: "ivy",
    kind: "vine",
    capabilities: ["climbing", "shadeTolerance"],
    seasonalProfile: "evergreen",
    waterNeed: 0.5,
    vineProfile: createVineProfile({ climbRate: 0.7, maxHeight: 10 })
  },
  {
    id: "mushroom",
    kind: "fungus",
    capabilities: ["decomposer", "sporeBurst"],
    seasonalProfile: "evergreen",
    waterNeed: 0.7,
    sporeProfile: createFungusProfile({ sporeRadius: 2, spreadDensity: 0.7 })
  },
  {
    id: "oak",
    kind: "tree",
    capabilities: ["shade", "hardwood", "leafLitter"],
    seasonalProfile: "deciduous",
    waterNeed: 0.6,
    treeProfile: treeSpecies.oak
  },
  {
    id: "pine",
    kind: "tree",
    capabilities: ["shade", "evergreen", "needleDrop"],
    seasonalProfile: "evergreen",
    waterNeed: 0.4,
    treeProfile: treeSpecies.pine
  },
  {
    id: "willow",
    kind: "tree",
    capabilities: ["shade", "waterSeeking"],
    seasonalProfile: "deciduous",
    waterNeed: 0.9,
    treeProfile: treeSpecies.willow
  },
  {
    id: "carcass",
    kind: "decomposer",
    capabilities: ["decay", "soilBoost"],
    seasonalProfile: "evergreen",
    waterNeed: 0,
    growthRate: 0
  }
];

export const getFloraSample = (id: string): FloraSample | null =>
  floraSamples.find((sample) => sample.id === id) ?? null;
