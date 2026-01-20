import { EntityId, EntityLayer, JsonObject, TerrainId } from "./types.js";

export type MoveIntent = {
  kind: "move";
  entityId: EntityId;
  toX: number;
  toY: number;
  score: number;
};

export type DespawnIntent = {
  kind: "despawn";
  entityId: EntityId;
};

export type SpawnIntent = {
  kind: "spawn";
  typeId: string;
  layer: EntityLayer;
  x: number;
  y: number;
  state?: JsonObject;
};

export type SetStateIntent = {
  kind: "setState";
  entityId: EntityId;
  patch: JsonObject;
};

export type SetTerrainIntent = {
  kind: "setTerrain";
  x: number;
  y: number;
  terrainId: TerrainId;
};

export type SetSoilIntent = {
  kind: "setSoil";
  x: number;
  y: number;
  fertilityDelta: number;
  toxicityDelta: number;
};

export type NeighborVoteIntent = {
  kind: "neighborVote";
  x: number;
  y: number;
};

export type EngineIntent =
  | MoveIntent
  | DespawnIntent
  | SpawnIntent
  | SetStateIntent
  | SetTerrainIntent
  | SetSoilIntent
  | NeighborVoteIntent;

