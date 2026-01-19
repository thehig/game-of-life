import { DefinitionSet, SimulationTiming } from "./types.js";

export const defaultTiming: SimulationTiming = {
  dayLength: 12,
  nightLength: 8
};

export const defaultDefinitions: DefinitionSet = {
  terrains: {
    land: {
      id: "land",
      name: "Land",
      ascii: ".",
      color: "#7c5a3a",
      fertility: 0.6,
      passable: true
    },
    sea: {
      id: "sea",
      name: "Sea",
      ascii: "~",
      color: "#2e6f95",
      fertility: 0.1,
      passable: false
    },
    sand: {
      id: "sand",
      name: "Sand",
      ascii: ":",
      color: "#c2a468",
      fertility: 0.2,
      passable: true
    },
    dirt: {
      id: "dirt",
      name: "Dirt",
      ascii: ",",
      color: "#8a5a44",
      fertility: 0.4,
      passable: true
    }
  },
  flora: {
    grass: {
      id: "grass",
      name: "Grass",
      ascii: "\"",
      color: "#4caf50",
      growthPerTick: 0.08,
      maxNutrition: 1,
      trampleLoss: 0.12,
      edibleBy: ["herbivore", "omnivore"],
      shadeRadius: 0,
      sunlightCost: 0.02
    },
    tree: {
      id: "tree",
      name: "Tree",
      ascii: "T",
      color: "#2f5d3d",
      growthPerTick: 0.03,
      maxNutrition: 1,
      trampleLoss: 0,
      edibleBy: ["omnivore"],
      shadeRadius: 2,
      sunlightCost: 0.01
    }
  },
  fauna: {
    herbivore: {
      id: "herbivore",
      name: "Herbivore",
      ascii: "H",
      color: "#f0c987",
      diet: "herbivore",
      speed: 1,
      maxHealth: 10,
      metabolism: 0.06,
      hungerRate: 0.1,
      eatRate: 0.35
    },
    carnivore: {
      id: "carnivore",
      name: "Carnivore",
      ascii: "C",
      color: "#d9534f",
      diet: "carnivore",
      speed: 1,
      maxHealth: 12,
      metabolism: 0.08,
      hungerRate: 0.12,
      eatRate: 0.5
    },
    sheep: {
      id: "sheep",
      name: "Sheep",
      ascii: "S",
      color: "#f8e6b8",
      diet: "herbivore",
      speed: 1,
      maxHealth: 8,
      metabolism: 0.05,
      hungerRate: 0.09,
      eatRate: 0.3
    },
    wolf: {
      id: "wolf",
      name: "Wolf",
      ascii: "W",
      color: "#8f8f99",
      diet: "carnivore",
      speed: 1,
      maxHealth: 14,
      metabolism: 0.07,
      hungerRate: 0.1,
      eatRate: 0.45
    },
    conway: {
      id: "conway",
      name: "Conway Cell",
      ascii: "O",
      color: "#8e9aaf",
      diet: "omnivore",
      speed: 0,
      maxHealth: 1,
      metabolism: 0,
      hungerRate: 0,
      eatRate: 0
    }
  }
};
