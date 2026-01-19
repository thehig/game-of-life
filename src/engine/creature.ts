import { DefinitionSet, Entity, EntityId, JsonObject, SimulationTime, SimulationTiming, TerrainId } from "./types.js";
import { EngineIntent } from "./intents.js";

export interface TileView {
  x: number;
  y: number;
  terrainId: TerrainId;
  shade: number;
  soilFertilityBoost: number;
  soilToxicity: number;
  floraEntityId: EntityId;
  faunaEntityId: EntityId;
}

export interface CreatureApi {
  getTick(): number;
  getTime(): SimulationTime;
  getTiming(): SimulationTiming;
  getDefinitions(): DefinitionSet;

  getSelf(): Entity;
  getEntity(id: EntityId): Entity | undefined;
  getTile(x: number, y: number): TileView | undefined;
  getNeighbors(x: number, y: number, radius: number): TileView[];
  isPassable(x: number, y: number): boolean;

  emit(intent: EngineIntent): void;
  rngFloat(): number;
  rngInt(minInclusive: number, maxExclusive: number): number;
}

export interface CreatureRenderer {
  // Renderer-agnostic minimal drawing primitives (expanded in renderer_camera todo).
  drawCell(x: number, y: number, color: string): void;
  drawText(x: number, y: number, text: string): void;
}

export interface CreatureInstance {
  update(deltaTimeMs: number, api: CreatureApi): void;
  draw(renderer: CreatureRenderer, api: CreatureApi): void;
  // Optional: provide serializable extra state if the module keeps non-entity state.
  snapshotState?(): JsonObject;
}

export type CreatureSpawnParams = {
  entityId: EntityId;
  x: number;
  y: number;
  initialState: JsonObject;
};

export interface CreatureModule {
  id: string;
  // entity layer for occupancy rules.
  layer: "flora" | "fauna";
  spawn(params: CreatureSpawnParams): CreatureInstance;
}

