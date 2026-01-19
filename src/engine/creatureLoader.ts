import { CreatureModule } from "./creature.js";

export type CreatureLoader = (id: string) => Promise<CreatureModule>;

const ensureModule = (raw: unknown, id: string): CreatureModule => {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`Creature '${id}' did not export an object`);
  }
  const record = raw as Record<string, unknown>;
  const module = record["creature"];
  if (typeof module !== "object" || module === null) {
    throw new Error(`Creature '${id}' must export 'creature'`);
  }
  const m = module as Partial<CreatureModule> & Record<string, unknown>;
  if (m.id !== id) {
    throw new Error(`Creature id mismatch: expected '${id}', got '${String(m.id)}'`);
  }
  if (m.layer !== "flora" && m.layer !== "fauna") {
    throw new Error(`Creature '${id}' has invalid layer '${String(m.layer)}'`);
  }
  if (typeof m.spawn !== "function") {
    throw new Error(`Creature '${id}' missing spawn()`);
  }
  return module as CreatureModule;
};

export const createWebCreatureLoader = (baseUrl: string = "/engine/creatures/"): CreatureLoader => {
  return async (id: string) => {
    const url = `${baseUrl}${encodeURIComponent(id)}.js`;
    const mod: unknown = await import(/* @vite-ignore */ url);
    return ensureModule(mod, id);
  };
};

export const createNodeCreatureLoader = (baseUrl: URL): CreatureLoader => {
  return async (id: string) => {
    const url = new URL(`./${encodeURIComponent(id)}.js`, baseUrl);
    const mod: unknown = await import(url.href);
    return ensureModule(mod, id);
  };
};

