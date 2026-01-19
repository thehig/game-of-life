import { CreatureInstance, CreatureModule } from "../creature.js";
import { EngineIntent } from "../intents.js";

const neighborOffsets = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1]
] as const;

class ConwayInstance implements CreatureInstance {
  public update(_deltaTimeMs: number, api: Parameters<CreatureInstance["update"]>[1]): void {
    const self = api.getSelf();
    // Emit votes to adjacent squares (radius 1, 360 degrees).
    for (const [dx, dy] of neighborOffsets) {
      const x = self.x + dx;
      const y = self.y + dy;
      const intent: EngineIntent = { kind: "neighborVote", x, y };
      api.emit(intent);
    }
  }

  public draw(renderer: Parameters<CreatureInstance["draw"]>[0], api: Parameters<CreatureInstance["draw"]>[1]): void {
    const self = api.getSelf();
    const color = api.getDefinitions().fauna["conway"]?.color ?? "#8e9aaf";
    renderer.drawCell(self.x, self.y, color);
  }
}

export const creature: CreatureModule = {
  id: "conway",
  layer: "fauna",
  spawn: () => new ConwayInstance()
};

