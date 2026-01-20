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

const getRotExposure = (
  api: Parameters<CreatureInstance["update"]>[1],
  x: number,
  y: number
): number => {
  let exposure = 0;
  for (const neighbor of api.getNeighbors(x, y, 1)) {
    if (!neighbor.floraEntityId) continue;
    const flora = api.getEntity(neighbor.floraEntityId);
    if (flora?.typeId !== "carcass") continue;
    const calories = getNumber(flora.state["calories"], getNumber(flora.state["energy"], 0));
    exposure = Math.max(exposure, clamp01(calories));
  }
  return exposure;
};

type Target = { x: number; y: number; distance: number };

const pickCloser = (current: Target | null, next: Target): Target => {
  if (!current) return next;
  if (next.distance < current.distance) return next;
  return current;
};

class SheepdogInstance implements CreatureInstance {
  public update(_deltaTimeMs: number, api: Parameters<CreatureInstance["update"]>[1]): void {
    const self = api.getSelf();
    const time = api.getTime();

    const hunger = clamp01(getNumber(self.state["hunger"], 0.15) + 0.01);
    const rotExposure = getRotExposure(api, self.x, self.y);
    const energyDelta = time.phase === "night" ? -0.004 : -0.008;
    const energyPenalty = rotExposure * 0.01;
    const energy = clamp01(getNumber(self.state["energy"], 1) + energyDelta - energyPenalty);
    const healthPenalty = (hunger >= 1 ? 0.02 : 0) + rotExposure * 0.02;
    const health = clamp01(getNumber(self.state["health"], 1) - healthPenalty);

    let activity = time.phase === "night" ? "resting" : "guarding";
    if (rotExposure > 0.05) {
      activity = "sick";
    } else if (hunger > 0.5) {
      activity = "foraging";
    }

    api.emit({
      kind: "setState",
      entityId: self.id,
      patch: { hunger, energy, health, age: getNumber(self.state["age"], 0) + 1, activity }
    });

    if (health <= 0) {
      api.emit({ kind: "despawn", entityId: self.id });
      return;
    }

    const neighbors = api.getNeighbors(self.x, self.y, 4);
    let nearestWolf: Target | null = null;
    let nearestSheep: Target | null = null;

    for (const tile of neighbors) {
      if (!tile.faunaEntityId || tile.faunaEntityId === self.id) continue;
      const entity = api.getEntity(tile.faunaEntityId);
      if (!entity) continue;
      const distance = Math.abs(entity.x - self.x) + Math.abs(entity.y - self.y);
      if (entity.typeId === "wolf") {
        nearestWolf = pickCloser(nearestWolf, { x: entity.x, y: entity.y, distance });
      } else if (entity.typeId === "sheep") {
        nearestSheep = pickCloser(nearestSheep, { x: entity.x, y: entity.y, distance });
      }
    }

    const target = nearestWolf ?? nearestSheep;
    const intentBias = nearestWolf ? 4 : 2;

    let bestX = self.x;
    let bestY = self.y;
    let bestScore = -Infinity;

    for (const [dx, dy] of movementOffsets) {
      const x = self.x + dx;
      const y = self.y + dy;
      if (!api.isPassable(x, y)) continue;
      const tile = api.getTile(x, y);
      if (!tile) continue;
      if (tile.faunaEntityId !== 0 && tile.faunaEntityId !== self.id) continue;

      let score = api.rngFloat() * 0.01;
      if (target) {
        const distance = Math.abs(target.x - x) + Math.abs(target.y - y);
        score += intentBias - distance;
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
    const color = api.getDefinitions().fauna["sheepdog"]?.color ?? "#b7a28c";
    renderer.drawCell(self.x, self.y, color);
  }
}

export const creature: CreatureModule = {
  id: "sheepdog",
  layer: "fauna",
  spawn: () => new SheepdogInstance()
};
