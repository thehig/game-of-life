import { CreatureInstance, CreatureModule } from "../creature.js";
import { EngineIntent } from "../intents.js";

const getNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

class GrassInstance implements CreatureInstance {
  public update(_deltaTimeMs: number, api: Parameters<CreatureInstance["update"]>[1]): void {
    const self = api.getSelf();
    const time = api.getTime();
    const state = self.state;

    const energy = getNumber(state["energy"], 0.6);
    const growth = getNumber(state["growth"], 0.4);

    const delta = time.phase === "day" ? 0.02 : -0.01;
    const nextEnergy = Math.max(0, Math.min(1, energy + delta));
    const nextGrowth = Math.max(0, Math.min(1, growth + delta * 0.6));

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

