import { CreatureInstance, CreatureModule } from "../creature.js";

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

class WolfInstance implements CreatureInstance {
  public update(_deltaTimeMs: number, api: Parameters<CreatureInstance["update"]>[1]): void {
    const self = api.getSelf();
    const time = api.getTime();

    const hunger = clamp01(getNumber(self.state["hunger"], 0.1) + 0.015);
    const energyDelta = time.phase === "night" ? -0.004 : -0.012;
    const energy = clamp01(getNumber(self.state["energy"], 1) + energyDelta);
    const health = clamp01(getNumber(self.state["health"], 1) - (hunger >= 1 ? 0.02 : 0));

    api.emit({ kind: "setState", entityId: self.id, patch: { hunger, energy, health, age: getNumber(self.state["age"], 0) + 1 } });

    if (health <= 0) {
      api.emit({ kind: "despawn", entityId: self.id });
      return;
    }

    // Hunt sheep in adjacent tiles; otherwise wander.
    let bestX = self.x;
    let bestY = self.y;
    let bestScore = -1;

    for (const [dx, dy] of movementOffsets) {
      const x = self.x + dx;
      const y = self.y + dy;
      if (!api.isPassable(x, y)) continue;
      const tile = api.getTile(x, y);
      if (!tile) continue;

      let score = api.rngFloat() * 0.01;

      if (tile.faunaEntityId !== 0 && tile.faunaEntityId !== self.id) {
        const target = api.getEntity(tile.faunaEntityId);
        if (target?.typeId === "sheep") {
          score += 10;
        } else {
          continue;
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
    const color = api.getDefinitions().fauna["wolf"]?.color ?? "#8f8f99";
    renderer.drawCell(self.x, self.y, color);
  }
}

export const creature: CreatureModule = {
  id: "wolf",
  layer: "fauna",
  spawn: () => new WolfInstance()
};

