import { EngineV2 } from "../engine.v2.js";
import { CameraState, Entity, EntityLayer, JsonObject, SimulationTiming, TerrainId } from "../types.js";

export type SaveV1Entity = {
  id: number;
  typeId: string;
  layer: EntityLayer;
  x: number;
  y: number;
  state: JsonObject;
};

export type SaveV1 = {
  version: 1;
  tick: number;
  timing: SimulationTiming;
  seed: number;
  rngState: number;
  camera: CameraState;
  world: {
    width: number;
    height: number;
    terrainPalette: TerrainId[];
    terrainRle: number[];
  };
  entities: SaveV1Entity[];
};

export const encodeUint16Rle = (data: Uint16Array): number[] => {
  const out: number[] = [];
  if (data.length === 0) return out;

  let current = data[0] ?? 0;
  let count = 1;

  for (let i = 1; i < data.length; i += 1) {
    const value = data[i] ?? 0;
    if (value === current && count < 0x7fffffff) {
      count += 1;
      continue;
    }
    out.push(current, count);
    current = value;
    count = 1;
  }

  out.push(current, count);
  return out;
};

export const decodeUint16RleInto = (rle: number[], target: Uint16Array): void => {
  let writeIndex = 0;
  for (let i = 0; i < rle.length; i += 2) {
    const value = rle[i] ?? 0;
    const count = rle[i + 1] ?? 0;
    for (let j = 0; j < count && writeIndex < target.length; j += 1) {
      target[writeIndex] = value;
      writeIndex += 1;
    }
  }
  if (writeIndex !== target.length) {
    // Fill remainder with 0 (defensive).
    for (let i = writeIndex; i < target.length; i += 1) {
      target[i] = 0;
    }
  }
};

export const createSaveV1 = (engine: EngineV2): SaveV1 => {
  const entities = engine.entities.exportEntities().map(
    (e): SaveV1Entity => ({
      id: e.id,
      typeId: e.typeId,
      layer: e.layer,
      x: e.x,
      y: e.y,
      state: { ...e.state }
    })
  );

  return {
    version: 1,
    tick: engine.world.tick,
    timing: engine.timing,
    seed: engine.rng.getSeed(),
    rngState: engine.rng.getState(),
    camera: { ...engine.camera },
    world: {
      width: engine.world.width,
      height: engine.world.height,
      terrainPalette: [...engine.world.terrainPalette],
      terrainRle: encodeUint16Rle(engine.world.terrain)
    },
    entities
  };
};

export const toEntities = (saveEntities: SaveV1Entity[]): Entity[] =>
  saveEntities.map(
    (e): Entity => ({
      id: e.id,
      typeId: e.typeId,
      layer: e.layer,
      x: e.x,
      y: e.y,
      state: { ...e.state }
    })
  );

