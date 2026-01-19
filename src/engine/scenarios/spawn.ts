import { EngineV2 } from "../engine.v2.js";
import { EntityId } from "../types.js";
import { getIndex } from "../world.layers.js";

export type SpawnRegion = {
  minX: number;
  minY: number;
  maxXExclusive: number;
  maxYExclusive: number;
};

export const spawnAt = (
  engine: EngineV2,
  typeId: string,
  layer: "flora" | "fauna",
  x: number,
  y: number
): EntityId => engine.spawn(typeId, layer, x, y, {});

export const spawnRandom = (
  engine: EngineV2,
  typeId: string,
  layer: "flora" | "fauna",
  count: number,
  region?: Partial<SpawnRegion>
): EntityId[] => {
  const minX = Math.max(0, Math.floor(region?.minX ?? 0));
  const minY = Math.max(0, Math.floor(region?.minY ?? 0));
  const maxXExclusive = Math.min(engine.world.width, Math.floor(region?.maxXExclusive ?? engine.world.width));
  const maxYExclusive = Math.min(engine.world.height, Math.floor(region?.maxYExclusive ?? engine.world.height));

  const out: EntityId[] = [];
  const maxAttempts = Math.max(500, count * 200);

  for (let attempt = 0; attempt < maxAttempts && out.length < count; attempt += 1) {
    const x = engine.rng.nextInt(minX, maxXExclusive);
    const y = engine.rng.nextInt(minY, maxYExclusive);
    if (!engine.isTilePassable(x, y)) {
      continue;
    }
    const idx = getIndex(engine.world, x, y);
    const occupied = layer === "flora" ? engine.world.floraAt[idx] : engine.world.faunaAt[idx];
    if (occupied !== 0) continue;
    out.push(engine.spawn(typeId, layer, x, y, {}));
  }

  return out;
};

