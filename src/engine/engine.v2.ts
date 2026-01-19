import { EntityStore } from "./entityStore.js";
import { CreatureApi, CreatureInstance, CreatureModule, TileView } from "./creature.js";
import { EngineIntent, MoveIntent } from "./intents.js";
import { Rng } from "./rng.js";
import {
  CameraState,
  DefinitionSet,
  Entity,
  EntityId,
  JsonObject,
  SimulationTime,
  SimulationTiming,
  TerrainId,
  WorldLayers
} from "./types.js";
import { getSimulationTime } from "./time.js";
import { getIndex, isInBounds, getTerrainIdAt, setTerrainIdAt } from "./world.layers.js";
import { clampCameraToWorld } from "./camera.js";

export type EngineV2Options = {
  definitions: DefinitionSet;
  timing: SimulationTiming;
  world: WorldLayers;
  seed: number;
  camera?: Partial<CameraState>;
  autosaveEveryNTicks?: number;
  onAutosave?: (engine: EngineV2) => void;
};

export class EngineV2 {
  public readonly definitions: DefinitionSet;
  public readonly timing: SimulationTiming;
  public readonly world: WorldLayers;
  public readonly entities: EntityStore;
  public readonly camera: CameraState;
  public readonly rng: Rng;

  private readonly modules = new Map<string, CreatureModule>();
  private readonly instancesByEntityId = new Map<EntityId, CreatureInstance>();
  private autosaveEveryNTicks: number | undefined;
  private onAutosave: ((engine: EngineV2) => void) | undefined;

  constructor(options: EngineV2Options) {
    this.definitions = options.definitions;
    this.timing = options.timing;
    this.world = options.world;
    this.entities = new EntityStore(1);
    this.rng = new Rng(options.seed);
    this.camera = {
      x: options.camera?.x ?? 0,
      y: options.camera?.y ?? 0,
      zoom: options.camera?.zoom ?? 1,
      viewportWidth: options.camera?.viewportWidth ?? 32,
      viewportHeight: options.camera?.viewportHeight ?? 18
    };
    this.autosaveEveryNTicks =
      options.autosaveEveryNTicks && options.autosaveEveryNTicks > 0
        ? Math.floor(options.autosaveEveryNTicks)
        : undefined;
    this.onAutosave = options.onAutosave;
  }

  public registerModule(module: CreatureModule): void {
    this.modules.set(module.id, module);
  }

  public spawn(typeId: string, layer: "flora" | "fauna", x: number, y: number, state?: JsonObject): EntityId {
    const module = this.modules.get(typeId);
    if (!module) throw new Error(`Unknown creature module '${typeId}'`);
    if (module.layer !== layer) throw new Error(`Layer mismatch for '${typeId}'`);
    if (!isInBounds(this.world, x, y)) throw new Error("Spawn out of bounds");
    if (!this.isPassable(x, y)) throw new Error("Cannot spawn on impassable terrain");

    const idx = getIndex(this.world, x, y);
    if (layer === "flora" && (this.world.floraAt[idx] ?? 0) !== 0) {
      throw new Error("Tile already has flora");
    }
    if (layer === "fauna" && (this.world.faunaAt[idx] ?? 0) !== 0) {
      throw new Error("Tile already has fauna");
    }

    const id = this.entities.spawn(
      this.world,
      state ? { typeId, layer, x, y, state } : { typeId, layer, x, y }
    );
    const entity = this.requireEntity(id);
    const instance = module.spawn({ entityId: id, x: entity.x, y: entity.y, initialState: entity.state });
    this.instancesByEntityId.set(id, instance);
    return id;
  }

  public despawn(entityId: EntityId): void {
    this.instancesByEntityId.delete(entityId);
    this.entities.despawn(this.world, entityId);
  }

  public step(deltaTimeMs: number): void {
    const time = getSimulationTime(this.world.tick, this.timing);
    const intents: EngineIntent[] = [];

    for (const id of this.entities.getAllIds()) {
      const entity = this.entities.get(id);
      if (!entity) continue;
      const instance = this.instancesByEntityId.get(id);
      if (!instance) continue;

      const api = this.createApi(entity, time, intents);
      instance.update(deltaTimeMs, api);
    }

    this.commitIntents(intents);
    this.world.tick += 1;

    if (this.autosaveEveryNTicks && this.onAutosave) {
      if (this.world.tick % this.autosaveEveryNTicks === 0) {
        this.onAutosave(this);
      }
    }
  }

  public draw(renderer: import("./creature.js").CreatureRenderer): void {
    const time = getSimulationTime(this.world.tick, this.timing);
    const noIntents: EngineIntent[] = [];

    for (const id of this.entities.getAllIds()) {
      const entity = this.entities.get(id);
      if (!entity) continue;
      const instance = this.instancesByEntityId.get(id);
      if (!instance) continue;
      const api = this.createApi(entity, time, noIntents);
      instance.draw(renderer, api);
    }
  }

  public setViewport(widthTiles: number, heightTiles: number): void {
    this.camera.viewportWidth = Math.max(1, Math.floor(widthTiles));
    this.camera.viewportHeight = Math.max(1, Math.floor(heightTiles));
    const next = clampCameraToWorld(this.camera, this.world);
    this.camera.x = next.x;
    this.camera.y = next.y;
    this.camera.zoom = next.zoom;
  }

  public pan(dxTiles: number, dyTiles: number): void {
    this.camera.x += dxTiles;
    this.camera.y += dyTiles;
    const next = clampCameraToWorld(this.camera, this.world);
    this.camera.x = next.x;
    this.camera.y = next.y;
  }

  public zoomTo(nextZoom: number, anchorWorldX: number, anchorWorldY: number): void {
    const beforeZoom = this.camera.zoom;
    const clampedZoom = clampCameraToWorld({ ...this.camera, zoom: nextZoom }, this.world).zoom;
    if (clampedZoom === beforeZoom) return;

    // Keep anchor point stable in world space by adjusting camera origin.
    const scale = beforeZoom / clampedZoom;
    this.camera.x = anchorWorldX - (anchorWorldX - this.camera.x) * scale;
    this.camera.y = anchorWorldY - (anchorWorldY - this.camera.y) * scale;
    this.camera.zoom = clampedZoom;

    const next = clampCameraToWorld(this.camera, this.world);
    this.camera.x = next.x;
    this.camera.y = next.y;
  }

  public isTilePassable(x: number, y: number): boolean {
    return this.isPassable(x, y);
  }

  public setAutosave(everyNTicks: number, handler?: (engine: EngineV2) => void): void {
    this.autosaveEveryNTicks = everyNTicks > 0 ? Math.floor(everyNTicks) : undefined;
    this.onAutosave = handler;
  }

  public loadEntities(entities: Entity[]): void {
    // Reset store and instances, then respawn instances with the same ids.
    this.entities.reset(this.world, 1);
    this.instancesByEntityId.clear();

    for (const entity of entities.sort((a, b) => a.id - b.id)) {
      const module = this.modules.get(entity.typeId);
      if (!module) {
        throw new Error(`Missing creature module '${entity.typeId}' for load`);
      }
      this.entities.spawnWithId(this.world, entity);
      const instance = module.spawn({
        entityId: entity.id,
        x: entity.x,
        y: entity.y,
        initialState: entity.state
      });
      this.instancesByEntityId.set(entity.id, instance);
    }
  }

  public getTime(): SimulationTime {
    return getSimulationTime(this.world.tick, this.timing);
  }

  private createApi(entity: Entity, time: SimulationTime, out: EngineIntent[]): CreatureApi {
    return {
      getTick: () => this.world.tick,
      getTime: () => time,
      getTiming: () => this.timing,
      getDefinitions: () => this.definitions,
      getSelf: () => this.requireEntity(entity.id),
      getEntity: (id: EntityId) => this.entities.get(id),
      getTile: (x: number, y: number) => this.getTileView(x, y),
      getNeighbors: (x: number, y: number, radius: number) => this.getNeighbors(x, y, radius),
      isPassable: (x: number, y: number) => this.isPassable(x, y),
      emit: (intent: EngineIntent) => {
        out.push(intent);
      },
      rngFloat: () => this.rng.nextFloat(),
      rngInt: (minInclusive: number, maxExclusive: number) => this.rng.nextInt(minInclusive, maxExclusive)
    };
  }

  private isPassable(x: number, y: number): boolean {
    if (!isInBounds(this.world, x, y)) return false;
    const terrainId = getTerrainIdAt(this.world, x, y);
    const def = this.definitions.terrains[terrainId];
    return def?.passable ?? true;
  }

  private getTileView(x: number, y: number): TileView | undefined {
    if (!isInBounds(this.world, x, y)) return undefined;
    const idx = getIndex(this.world, x, y);
    return {
      x,
      y,
      terrainId: getTerrainIdAt(this.world, x, y),
      shade: this.world.shade[idx] ?? 0,
      soilFertilityBoost: this.world.soilFertilityBoost[idx] ?? 0,
      soilToxicity: this.world.soilToxicity[idx] ?? 0,
      floraEntityId: (this.world.floraAt[idx] ?? 0) as EntityId,
      faunaEntityId: (this.world.faunaAt[idx] ?? 0) as EntityId
    };
  }

  private getNeighbors(x: number, y: number, radius: number): TileView[] {
    const tiles: TileView[] = [];
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const t = this.getTileView(x + dx, y + dy);
        if (t) tiles.push(t);
      }
    }
    return tiles;
  }

  private commitIntents(intents: EngineIntent[]): void {
    this.applyConwayVotes(intents);

    // Apply terrain and state changes deterministically in arrival order.
    for (const intent of intents) {
      if (intent.kind === "setTerrain") {
        setTerrainIdAt(this.world, intent.x, intent.y, intent.terrainId);
      } else if (intent.kind === "setState") {
        this.entities.setState(intent.entityId, intent.patch);
      }
    }

    // Resolve moves by destination: highest score wins, tie-break by lowest entityId.
    const moves = intents.filter((i): i is MoveIntent => i.kind === "move");
    const byDest = new Map<number, MoveIntent[]>();
    for (const move of moves) {
      const idx = getIndex(this.world, move.toX, move.toY);
      const list = byDest.get(idx);
      if (list) list.push(move);
      else byDest.set(idx, [move]);
    }

    const winners: MoveIntent[] = [];
    for (const group of byDest.values()) {
      const sorted = [...group].sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.entityId - b.entityId;
      });
      const winner = sorted[0];
      if (winner) winners.push(winner);
    }

    for (const move of winners) {
      if (!isInBounds(this.world, move.toX, move.toY)) continue;
      if (!this.isPassable(move.toX, move.toY)) continue;

      const mover = this.entities.get(move.entityId);
      if (!mover) continue;

      const destIdx = getIndex(this.world, move.toX, move.toY);
      if (mover.layer === "fauna") {
        const destFaunaId = (this.world.faunaAt[destIdx] ?? 0) as EntityId;
        if (destFaunaId !== 0) {
          const dest = this.entities.get(destFaunaId);
          const canEat = mover.typeId === "wolf" && dest?.typeId === "sheep";
          if (canEat) {
            this.despawn(destFaunaId);
          } else {
            continue;
          }
        }
      } else {
        const destFloraId = (this.world.floraAt[destIdx] ?? 0) as EntityId;
        if (destFloraId !== 0) {
          continue;
        }
      }

      this.entities.move(this.world, move.entityId, move.toX, move.toY);
    }

    // Spawns (after moves).
    for (const intent of intents) {
      if (intent.kind !== "spawn") continue;
      this.spawn(intent.typeId, intent.layer, intent.x, intent.y, intent.state);
    }

    // Despawns (last).
    for (const intent of intents) {
      if (intent.kind !== "despawn") continue;
      this.despawn(intent.entityId);
    }
  }

  private applyConwayVotes(intents: EngineIntent[]): void {
    const votes = new Map<number, number>();

    for (const intent of intents) {
      if (intent.kind !== "neighborVote") continue;
      if (!isInBounds(this.world, intent.x, intent.y)) continue;
      const idx = getIndex(this.world, intent.x, intent.y);
      votes.set(idx, (votes.get(idx) ?? 0) + 1);
    }

    if (votes.size === 0) {
      return;
    }

    // Survival / death for existing Conway cells.
    for (const id of this.entities.getAllIds()) {
      const entity = this.entities.get(id);
      if (!entity) continue;
      if (entity.layer !== "fauna" || entity.typeId !== "conway") continue;

      const idx = getIndex(this.world, entity.x, entity.y);
      const count = votes.get(idx) ?? 0;
      const survives = count === 2 || count === 3;
      if (!survives) {
        this.despawn(entity.id);
      }
    }

    // Births where exactly 3 votes and tile has no fauna.
    for (const [idx, count] of votes.entries()) {
      if (count !== 3) continue;
      if ((this.world.faunaAt[idx] ?? 0) !== 0) continue;
      const x = idx % this.world.width;
      const y = Math.floor(idx / this.world.width);
      this.spawn("conway", "fauna", x, y, {});
    }
  }

  private requireEntity(id: EntityId): Entity {
    const entity = this.entities.get(id);
    if (!entity) throw new Error(`Missing entity ${id}`);
    return entity;
  }
}

