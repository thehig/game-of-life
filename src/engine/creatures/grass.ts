import { CreatureInstance, CreatureModule } from "../creature.js";
import { EngineIntent } from "../intents.js";

const getNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

class GrassInstance implements CreatureInstance {
  public update(_deltaTimeMs: number, api: Parameters<CreatureInstance["update"]>[1]): void {
    const self = api.getSelf();
    const time = api.getTime();
    const state = self.state;

    const energy = getNumber(state["energy"], 0.6);
    const growth = getNumber(state["growth"], 0.4);

    const tile = api.getTile(self.x, self.y);
    const terrainId = tile?.terrainId ?? "land";
    const terrain = api.getDefinitions().terrains[terrainId];
    const fertility = clamp01(terrain?.fertility ?? 0.5);
    const soilBoost = clamp01(tile?.soilFertilityBoost ?? 0);
    const soilToxicity = clamp01(tile?.soilToxicity ?? 0);
    const adjustedFertility = clamp01(fertility + soilBoost - soilToxicity);

    const dayDelta = 0.02 * (0.5 + adjustedFertility);
    const nightDelta = -0.01 * (1 + soilToxicity);
    const delta = time.phase === "day" ? dayDelta : nightDelta;

    const nextEnergy = clamp01(energy + delta);
    const nextGrowth = clamp01(growth + delta * 0.6 + adjustedFertility * 0.003);

    const intent: EngineIntent = { kind: "setState", entityId: self.id, patch: { energy: nextEnergy, growth: nextGrowth } };
    api.emit(intent);
  }

  public draw(renderer: Parameters<CreatureInstance["draw"]>[0], api: Parameters<CreatureInstance["draw"]>[1]): void {
    const self = api.getSelf();
    const color = api.getDefinitions().flora["grass"]?.color ?? "#4caf50";
    renderer.drawCell(self.x, self.y, color);
  }
}

export const creature: CreatureModule = {
  id: "grass",
  layer: "flora",
  spawn: () => new GrassInstance()
};

