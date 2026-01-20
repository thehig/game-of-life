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

type Signal = { x: number; y: number; tick: number };

const getSignal = (state: Record<string, unknown>): Signal | null => {
  const x = state["signalX"];
  const y = state["signalY"];
  const tick = state["signalTick"];
  if (typeof x !== "number" || typeof y !== "number" || typeof tick !== "number") {
    return null;
  }
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(tick)) {
    return null;
  }
  return { x, y, tick };
};

class WolfInstance implements CreatureInstance {
  public update(_deltaTimeMs: number, api: Parameters<CreatureInstance["update"]>[1]): void {
    const self = api.getSelf();
    const time = api.getTime();
    const tick = api.getTick();

    const hunger = clamp01(getNumber(self.state["hunger"], 0.1) + 0.015);
    const energyDelta = time.phase === "night" ? -0.004 : -0.012;
    const energy = clamp01(getNumber(self.state["energy"], 1) + energyDelta);
    const health = clamp01(getNumber(self.state["health"], 1) - (hunger >= 1 ? 0.02 : 0));

    const packComms = self.state["packComms"] === true;
    const patch: Record<string, unknown> = {
      hunger,
      energy,
      health,
      age: getNumber(self.state["age"], 0) + 1
    };

    let signalTarget: { x: number; y: number } | null = null;

    if (packComms) {
      let closestSheep: { x: number; y: number; distance: number } | null = null;
      const neighbors = api.getNeighbors(self.x, self.y, 4);
      for (const tile of neighbors) {
        if (!tile.faunaEntityId) continue;
        const entity = api.getEntity(tile.faunaEntityId);
        if (entity?.typeId !== "sheep") continue;
        const distance = Math.abs(entity.x - self.x) + Math.abs(entity.y - self.y);
        if (!closestSheep || distance < closestSheep.distance) {
          closestSheep = { x: entity.x, y: entity.y, distance };
        }
      }
      if (closestSheep) {
        signalTarget = { x: closestSheep.x, y: closestSheep.y };
        patch["signalX"] = closestSheep.x;
        patch["signalY"] = closestSheep.y;
        patch["signalTick"] = tick;
      } else {
        const relayNeighbors = api.getNeighbors(self.x, self.y, 6);
        let closestSignal: { x: number; y: number; distance: number } | null = null;
        for (const tile of relayNeighbors) {
          if (!tile.faunaEntityId || tile.faunaEntityId === self.id) continue;
          const entity = api.getEntity(tile.faunaEntityId);
          if (!entity || entity.typeId !== "wolf") continue;
          const signal = getSignal(entity.state);
          if (!signal) continue;
          if (tick - signal.tick > 12) continue;
          const distance = Math.abs(signal.x - self.x) + Math.abs(signal.y - self.y);
          if (!closestSignal || distance < closestSignal.distance) {
            closestSignal = { x: signal.x, y: signal.y, distance };
          }
        }
        if (closestSignal) {
          signalTarget = { x: closestSignal.x, y: closestSignal.y };
        }
      }
    }

    api.emit({ kind: "setState", entityId: self.id, patch });

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

      if (signalTarget) {
        const distance = Math.abs(signalTarget.x - x) + Math.abs(signalTarget.y - y);
        score += 3 - distance;
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

