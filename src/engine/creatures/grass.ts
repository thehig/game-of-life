import { CreatureInstance, CreatureModule } from "../creature.js";
import { EngineIntent } from "../intents.js";

const getNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const toRgb = (hex: string): { r: number; g: number; b: number } => {
  const sanitized = hex.replace("#", "");
  const value = Number.parseInt(sanitized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

const toHex = (value: number): string => value.toString(16).padStart(2, "0");

const tintColor = (hex: string, factor: number): string => {
  const { r, g, b } = toRgb(hex);
  const clampChannel = (v: number) => Math.max(0, Math.min(255, v));
  return `#${toHex(clampChannel(Math.round(r * factor)))}${toHex(clampChannel(Math.round(g * factor)))}${toHex(
    clampChannel(Math.round(b * factor))
  )}`;
};

const getTileNutrition = (
  api: Parameters<CreatureInstance["update"]>[1],
  tile: ReturnType<Parameters<CreatureInstance["update"]>[1]["getTile"]>
): number => {
  if (!tile) return 0;
  const terrain = api.getDefinitions().terrains[tile.terrainId];
  const base = clamp01((terrain?.fertility ?? 0.5) + tile.soilFertilityBoost - tile.soilToxicity);
  if (tile.floraEntityId !== 0) {
    const flora = api.getEntity(tile.floraEntityId);
    if (flora?.typeId === "carcass") {
      const calories = clamp01(getNumber(flora.state["calories"], getNumber(flora.state["energy"], 0)));
      return clamp01(base + calories * 0.4);
    }
  }
  return base;
};

class GrassInstance implements CreatureInstance {
  public update(_deltaTimeMs: number, api: Parameters<CreatureInstance["update"]>[1]): void {
    const self = api.getSelf();
    const time = api.getTime();
    const state = self.state;

    const energy = getNumber(state["energy"], 0.6);
    const growth = getNumber(state["growth"], 0.4);

    const tile = api.getTile(self.x, self.y);
    const localNutrition = getTileNutrition(api, tile);
    let maxNeighborNutrition = localNutrition;
    for (const neighbor of api.getNeighbors(self.x, self.y, 1)) {
      const neighborNutrition = getTileNutrition(api, neighbor);
      if (neighborNutrition > maxNeighborNutrition) {
        maxNeighborNutrition = neighborNutrition;
      }
    }
    const gradientBoost = clamp01(maxNeighborNutrition - localNutrition);

    const soilToxicity = clamp01(tile?.soilToxicity ?? 0);
    const dayDelta = 0.02 * (0.5 + localNutrition + gradientBoost * 0.4);
    const nightDelta = -0.01 * (1 + soilToxicity);
    const delta = time.phase === "day" ? dayDelta : nightDelta;

    const nextEnergy = clamp01(energy + delta);
    const nextGrowth = clamp01(growth + delta * 0.6 + localNutrition * 0.003 + gradientBoost * 0.002);

    const intent: EngineIntent = { kind: "setState", entityId: self.id, patch: { energy: nextEnergy, growth: nextGrowth } };
    api.emit(intent);
  }

  public draw(renderer: Parameters<CreatureInstance["draw"]>[0], api: Parameters<CreatureInstance["draw"]>[1]): void {
    const self = api.getSelf();
    const baseColor = api.getDefinitions().flora["grass"]?.color ?? "#4caf50";
    const energy = clamp01(getNumber(self.state["energy"], 0.6));
    const growth = clamp01(getNumber(self.state["growth"], 0.4));
    const factor = Math.max(0.5, Math.min(1.2, 0.6 + growth * 0.5 + energy * 0.2));
    renderer.drawCell(self.x, self.y, tintColor(baseColor, factor));
  }
}

export const creature: CreatureModule = {
  id: "grass",
  layer: "flora",
  spawn: () => new GrassInstance()
};

