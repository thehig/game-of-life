export type TerrainId = "land" | "sea" | "sand" | "dirt";
export type FloraId = "grass" | "tree";
export type FaunaId = "herbivore" | "carnivore" | "conway";
export type RuleSetId = "ecosystem" | "conway";
export type DietType = "herbivore" | "carnivore" | "omnivore";

export interface TerrainDefinition {
  id: TerrainId;
  name: string;
  ascii: string;
  color: string;
  fertility: number;
  passable: boolean;
}

export interface FloraDefinition {
  id: FloraId;
  name: string;
  ascii: string;
  color: string;
  growthPerTick: number;
  maxNutrition: number;
  trampleLoss: number;
  edibleBy: DietType[];
  shadeRadius: number;
  sunlightCost: number;
}

export interface FaunaDefinition {
  id: FaunaId;
  name: string;
  ascii: string;
  color: string;
  diet: DietType;
  speed: number;
  maxHealth: number;
  metabolism: number;
  hungerRate: number;
  eatRate: number;
}

export interface FloraState {
  id: FloraId;
  nutrition: number;
  age: number;
  growth: number;
}

export interface FaunaState {
  id: FaunaId;
  health: number;
  hunger: number;
  energy: number;
  age: number;
}

export interface Tile {
  terrainId: TerrainId;
  flora?: FloraState;
  fauna?: FaunaState;
  shade: number;
}

export interface World {
  width: number;
  height: number;
  tick: number;
  tiles: Tile[];
}

export interface DefinitionSet {
  terrains: Record<TerrainId, TerrainDefinition>;
  flora: Record<FloraId, FloraDefinition>;
  fauna: Record<FaunaId, FaunaDefinition>;
}

export interface SimulationTiming {
  dayLength: number;
  nightLength: number;
}

export interface SimulationTime {
  tick: number;
  phase: "day" | "night";
  phaseTick: number;
}

export interface RuleContext {
  definitions: DefinitionSet;
  time: SimulationTime;
  timing: SimulationTiming;
}

export interface RuleSet {
  id: RuleSetId;
  name: string;
  step: (world: World, context: RuleContext) => World;
}

export interface Simulation {
  world: World;
  definitions: DefinitionSet;
  timing: SimulationTiming;
  ruleset: RuleSet;
}

export interface TileDetails {
  position: { x: number; y: number };
  terrain: TerrainDefinition;
  flora?: { definition: FloraDefinition; state: FloraState };
  fauna?: { definition: FaunaDefinition; state: FaunaState };
  shade: number;
  time: SimulationTime;
}
