import { conwayRules } from "./rules/conway.js";
import { ecosystemRules } from "./rules/ecosystem.js";
import { getSimulationTime } from "./time.js";
import {
  DefinitionSet,
  RuleSet,
  Simulation,
  SimulationTiming,
  TerrainId,
  Tile,
  World
} from "./types.js";
import { createWorld } from "./world.js";

export type SimulationOptions = {
  width: number;
  height: number;
  definitions: DefinitionSet;
  timing: SimulationTiming;
  terrainId?: TerrainId;
  ruleset?: RuleSet;
  tileFactory?: (x: number, y: number) => Tile;
};

export const createSimulation = (options: SimulationOptions): Simulation => {
  const ruleset = options.ruleset ?? ecosystemRules;
  const terrainId = options.terrainId ?? "land";
  const world = createWorld(options.width, options.height, terrainId, options.tileFactory);

  return {
    world,
    definitions: options.definitions,
    timing: options.timing,
    ruleset
  };
};

export const stepSimulation = (simulation: Simulation): Simulation => {
  const time = getSimulationTime(simulation.world.tick, simulation.timing);
  const nextWorld: World = simulation.ruleset.step(simulation.world, {
    definitions: simulation.definitions,
    timing: simulation.timing,
    time
  });

  return {
    ...simulation,
    world: nextWorld
  };
};

export const createEcosystemSimulation = (options: Omit<SimulationOptions, "ruleset">): Simulation =>
  createSimulation({
    ...options,
    ruleset: ecosystemRules
  });

export const createConwaySimulation = (options: Omit<SimulationOptions, "ruleset">): Simulation =>
  createSimulation({
    ...options,
    ruleset: conwayRules
  });
