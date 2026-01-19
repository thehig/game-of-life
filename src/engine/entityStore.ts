import { Entity, EntityId, EntityLayer, JsonObject, WorldLayers } from "./types.js";
import { getIndex } from "./world.layers.js";

export type SpawnEntityInput = {
  typeId: string;
  layer: EntityLayer;
  x: number;
  y: number;
  state?: JsonObject;
};

export class EntityStore {
  private nextId: EntityId;
  private readonly entitiesById = new Map<EntityId, Entity>();

  // For deterministic iteration we maintain insertion order list of ids and never reuse ids.
  private readonly idList: EntityId[] = [];

  constructor(seedId: EntityId = 1) {
    this.nextId = Math.max(1, seedId);
  }

  public getAllIds(): readonly EntityId[] {
    return this.idList;
  }

  public get(id: EntityId): Entity | undefined {
    return this.entitiesById.get(id);
  }

  public exportEntities(): Entity[] {
    return Array.from(this.entitiesById.values()).sort((a, b) => a.id - b.id);
  }

  public reset(world: WorldLayers, seedId: EntityId = 1): void {
    // Clear occupancy.
    world.floraAt.fill(0);
    world.faunaAt.fill(0);
    this.entitiesById.clear();
    this.idList.length = 0;
    this.nextId = Math.max(1, seedId);
  }

  public spawnWithId(world: WorldLayers, entity: Entity): void {
    if (this.entitiesById.has(entity.id)) {
      throw new Error(`Duplicate entity id ${entity.id}`);
    }
    this.entitiesById.set(entity.id, {
      id: entity.id,
      typeId: entity.typeId,
      layer: entity.layer,
      x: entity.x,
      y: entity.y,
      state: { ...entity.state }
    });
    this.idList.push(entity.id);
    this.occupy(world, entity);
    this.nextId = Math.max(this.nextId, entity.id + 1);
  }

  public spawn(world: WorldLayers, input: SpawnEntityInput): EntityId {
    const id = this.nextId;
    this.nextId += 1;

    const entity: Entity = {
      id,
      typeId: input.typeId,
      layer: input.layer,
      x: input.x,
      y: input.y,
      state: input.state ? { ...input.state } : {}
    };

    this.entitiesById.set(id, entity);
    this.idList.push(id);
    this.occupy(world, entity);
    return id;
  }

  public despawn(world: WorldLayers, id: EntityId): void {
    const entity = this.entitiesById.get(id);
    if (!entity) return;
    this.vacate(world, entity);
    this.entitiesById.delete(id);
    // Keep idList for deterministic ordering; we’ll skip missing entries during iteration.
  }

  public move(world: WorldLayers, id: EntityId, x: number, y: number): void {
    const entity = this.entitiesById.get(id);
    if (!entity) {
      throw new Error(`Missing entity ${id}`);
    }
    this.vacate(world, entity);
    entity.x = x;
    entity.y = y;
    this.occupy(world, entity);
  }

  public setState(id: EntityId, patch: JsonObject): void {
    const entity = this.entitiesById.get(id);
    if (!entity) {
      throw new Error(`Missing entity ${id}`);
    }
    entity.state = { ...entity.state, ...patch };
  }

  private occupy(world: WorldLayers, entity: Entity): void {
    const idx = getIndex(world, entity.x, entity.y);
    if (entity.layer === "flora") {
      world.floraAt[idx] = entity.id;
      return;
    }
    world.faunaAt[idx] = entity.id;
  }

  private vacate(world: WorldLayers, entity: Entity): void {
    const idx = getIndex(world, entity.x, entity.y);
    if (entity.layer === "flora") {
      if (world.floraAt[idx] === entity.id) world.floraAt[idx] = 0;
      return;
    }
    if (world.faunaAt[idx] === entity.id) world.faunaAt[idx] = 0;
  }
}

