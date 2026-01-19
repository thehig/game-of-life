import { createGrassConfig } from "./grass.js";
import { treeSpecies } from "./tree.js";
import { createCactusProfile, createFlowerProfile, createFungusProfile, createVineProfile } from "./traits.js";

export const floraSamples = [
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
  }
];

export const getFloraSample = (id) => floraSamples.find((sample) => sample.id === id) ?? null;
