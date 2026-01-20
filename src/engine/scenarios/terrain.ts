import { TerrainId, WorldLayers } from "../types.js";

export type TerrainStripe = {
  terrainId: TerrainId;
  sizeRatio: number;
};

const getTerrainIndex = (
  paletteIndexByTerrainId: ReadonlyMap<TerrainId, number>,
  terrainId: TerrainId
): number => {
  const idx = paletteIndexByTerrainId.get(terrainId);
  if (idx === undefined) {
    throw new Error(`Terrain palette missing '${terrainId}'`);
  }
  return idx;
};

const clampPositive = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

export const applyTerrainFill = (
  world: WorldLayers,
  paletteIndexByTerrainId: ReadonlyMap<TerrainId, number>,
  terrainId: TerrainId
): void => {
  const terrainIndex = getTerrainIndex(paletteIndexByTerrainId, terrainId);
  world.terrain.fill(terrainIndex);
};

export const applyTerrainStripes = (
  world: WorldLayers,
  paletteIndexByTerrainId: ReadonlyMap<TerrainId, number>,
  stripes: TerrainStripe[],
  axis: "x" | "y" = "x"
): void => {
  if (stripes.length === 0) {
    return;
  }
  const totalRatio = stripes.reduce((sum, stripe) => sum + clampPositive(stripe.sizeRatio), 0);
  if (totalRatio <= 0) {
    throw new Error("Terrain stripe ratios must be positive");
  }

  const axisLength = axis === "x" ? world.width : world.height;
  let cursor = 0;

  for (const [i, stripe] of stripes.entries()) {
    const normalized = clampPositive(stripe.sizeRatio) / totalRatio;
    const remaining = axisLength - cursor;
    const span = i === stripes.length - 1 ? remaining : Math.max(1, Math.floor(axisLength * normalized));
    const length = Math.min(remaining, span);
    if (length <= 0) {
      continue;
    }

    const terrainIndex = getTerrainIndex(paletteIndexByTerrainId, stripe.terrainId);
    if (axis === "x") {
      for (let y = 0; y < world.height; y += 1) {
        const rowStart = y * world.width;
        for (let x = cursor; x < cursor + length; x += 1) {
          world.terrain[rowStart + x] = terrainIndex;
        }
      }
    } else {
      for (let y = cursor; y < cursor + length; y += 1) {
        const rowStart = y * world.width;
        for (let x = 0; x < world.width; x += 1) {
          world.terrain[rowStart + x] = terrainIndex;
        }
      }
    }

    cursor += length;
    if (cursor >= axisLength) {
      break;
    }
  }
};
