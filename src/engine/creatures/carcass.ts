import { CreatureInstance, CreatureModule } from "../creature.js";
import type { EngineIntent } from "../intents.js";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const getNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

class CarcassInstance implements CreatureInstance {
  public update(_deltaTimeMs: number, api: Parameters<CreatureInstance["update"]>[1]): void {
    const self = api.getSelf();
    const calories = getNumber(self.state["calories"], getNumber(self.state["energy"], 0.4));
    const decayRate = getNumber(self.state["decayRate"], 0.04);
    const fertilityPerCalorie = getNumber(self.state["fertilityPerCalorie"], 0.2);
    const toxicityPerCalorie = getNumber(self.state["toxicityPerCalorie"], 0.05);

    const release = Math.min(calories, decayRate);
    const nextCalories = Math.max(0, calories - release);

    if (release > 0) {
      const intent: EngineIntent = {
        kind: "setSoil",
        x: self.x,
        y: self.y,
        fertilityDelta: release * fertilityPerCalorie,
        toxicityDelta: release * toxicityPerCalorie
      };
      api.emit(intent);
    }

    api.emit({
      kind: "setState",
      entityId: self.id,
      patch: {
        calories: nextCalories,
        energy: nextCalories,
        age: getNumber(self.state["age"], 0) + 1
      }
    });

    if (nextCalories <= 0.01) {
      api.emit({ kind: "despawn", entityId: self.id });
    }
  }

  public draw(renderer: Parameters<CreatureInstance["draw"]>[0], api: Parameters<CreatureInstance["draw"]>[1]): void {
    const self = api.getSelf();
    const color = api.getDefinitions().flora["carcass"]?.color ?? "#8b5a3c";
    renderer.drawCell(self.x, self.y, color);
  }
}

export const creature: CreatureModule = {
  id: "carcass",
  layer: "flora",
  spawn: () => new CarcassInstance()
};
