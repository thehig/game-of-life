import { CreatureInstance, CreatureModule } from "../creature.js";
import { EngineIntent } from "../intents.js";

const movementOffsets = [
  [0, 0],
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0]
] as const;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const getNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

class SheepInstance implements CreatureInstance {
  public update(_deltaTimeMs: number, api: Parameters<CreatureInstance["update"]>[1]): void {
    const self = api.getSelf();
    const time = api.getTime();

    const hunger = clamp01(getNumber(self.state["hunger"], 0.2) + 0.02);
    const energyDelta = time.phase === "night" ? -0.005 : -0.01;
    const energy = clamp01(getNumber(self.state["energy"], 1) + energyDelta);
    const health = clamp01(getNumber(self.state["health"], 1) - (hunger >= 1 ? 0.03 : 0));

    api.emit({ kind: "setState", entityId: self.id, patch: { hunger, energy, health, age: getNumber(self.state["age"], 0) + 1 } });

    if (health <= 0) {
      api.emit({ kind: "despawn", entityId: self.id });
      return;
    }

    // Decide movement (radius 1, cardinal + stay). Prefer grass tiles when hungry.
    let bestX = self.x;
    let bestY = self.y;
    let bestScore = -1;

    for (const [dx, dy] of movementOffsets) {
      const x = self.x + dx;
      const y = self.y + dy;
      if (!api.isPassable(x, y)) continue;
      const tile = api.getTile(x, y);
      if (!tile) continue;
      if (tile.faunaEntityId !== 0 && tile.faunaEntityId !== self.id) continue;

      let score = api.rngFloat() * 0.01; // deterministic tie noise

      if (hunger > 0.4 && tile.floraEntityId !== 0) {
        const flora = api.getEntity(tile.floraEntityId);
        if (flora?.typeId === "grass") {
          score += 2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }

    if (bestX !== self.x || bestY !== self.y) {
      api.emit({ kind: "move", entityId: self.id, toX: bestX, toY: bestY, score: bestScore });
    }
  }

  public draw(renderer: Parameters<CreatureInstance["draw"]>[0], api: Parameters<CreatureInstance["draw"]>[1]): void {
    const self = api.getSelf();
    const color = api.getDefinitions().fauna["sheep"]?.color ?? "#f8e6b8";
    renderer.drawCell(self.x, self.y, color);
  }
}

export const creature: CreatureModule = {
  id: "sheep",
  layer: "fauna",
  spawn: () => new SheepInstance()
};

