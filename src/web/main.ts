import {
  EngineV2,
  applyBeachTerrain,
  buildTerrainPalette,
  createSaveV1,
  createWorldLayers,
  decodeUint16RleInto,
  spawnRandom
} from "../engine/index.js";
import { createWebCreatureLoader } from "../engine/creatureLoader.js";
import { loadDefinitionsFromUrl, loadTimingFromUrl } from "./config.js";
import { DefinitionSet, Entity, EntityId, SimulationTiming, TerrainId } from "../engine/types.js";
import { WebRenderer } from "./webRenderer.js";
import { getIndex as getLayerIndex } from "../engine/world.layers.js";
import type { CreatureModule } from "../engine/creature.js";

type Mode = "paused" | "playing";

const baseCellSizePx = 18;
const worldWidth = 1920;
const worldHeight = 1080;
const definitionsUrl = "./config/definitions.json";
const timingUrl = "./config/timing.json";

let engine: EngineV2 | undefined;
let mode: Mode = "paused";
let speedMs = 600;
let selected = { x: 2, y: 2 };
let timer: number | undefined;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
};

const canvas = getElement<HTMLCanvasElement>("world");
const context = canvas.getContext("2d");

if (!context) {
  throw new Error("Canvas context unavailable");
}

const webRenderer = new WebRenderer(context);

const tickEl = getElement<HTMLSpanElement>("tick");
const phaseEl = getElement<HTMLSpanElement>("phase");
const speedEl = getElement<HTMLSpanElement>("speed");
const positionEl = getElement<HTMLSpanElement>("position");
const terrainEl = getElement<HTMLSpanElement>("terrain");
const floraEl = getElement<HTMLSpanElement>("flora");
const faunaEl = getElement<HTMLSpanElement>("fauna");
const shadeEl = getElement<HTMLSpanElement>("shade");

const playButton = getElement<HTMLButtonElement>("play");
const pauseButton = getElement<HTMLButtonElement>("pause");
const stepButton = getElement<HTMLButtonElement>("step");
const fastButton = getElement<HTMLButtonElement>("fast");
const slowButton = getElement<HTMLButtonElement>("slow");

const brushActionEl = getElement<HTMLSelectElement>("brushAction");
const brushTypeEl = getElement<HTMLSelectElement>("brushType");
const saveButton = getElement<HTMLButtonElement>("save");
const loadFileInput = getElement<HTMLInputElement>("loadFile");
const autosaveEveryInput = getElement<HTMLInputElement>("autosaveEvery");

const creatureLayerById = new Map<string, "flora" | "fauna">();
const loadedModules = new Map<string, CreatureModule>();

const resizeCanvasToViewport = () => {
  const rect = canvas.getBoundingClientRect();
  const widthPx = Math.max(1, Math.floor(rect.width));
  const heightPx = Math.max(1, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(widthPx * dpr);
  canvas.height = Math.floor(heightPx * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
};

const toRgb = (hex: string): { r: number; g: number; b: number } => {
  const sanitized = hex.replace("#", "");
  const value = Number.parseInt(sanitized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

const toHex = (value: number): string => value.toString(16).padStart(2, "0");

const adjustColor = (hex: string, factor: number): string => {
  const { r, g, b } = toRgb(hex);
  const next = {
    r: clamp(Math.round(r * factor), 0, 255),
    g: clamp(Math.round(g * factor), 0, 255),
    b: clamp(Math.round(b * factor), 0, 255)
  };
  return `#${toHex(next.r)}${toHex(next.g)}${toHex(next.b)}`;
};

const getTileColor = (definitions: DefinitionSet, terrainId: TerrainId, floraId?: string, faunaId?: string): string => {
  let color = definitions.terrains[terrainId]?.color ?? "#1b1f2a";

  if (floraId) {
    const floraDef = definitions.flora[floraId];
    if (floraDef) {
      color = floraDef.color;
    }
  }

  if (faunaId) {
    const faunaDef = definitions.fauna[faunaId];
    if (faunaDef) {
      color = faunaDef.color;
    }
  }

  return color;
};

const renderWorld = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  const current = engine;
  if (!current) {
    return;
  }

  resizeCanvasToViewport();

  const cellSizePx = baseCellSizePx * current.camera.zoom;
  const cols = Math.max(1, Math.floor(canvas.width / (window.devicePixelRatio || 1) / cellSizePx));
  const rows = Math.max(1, Math.floor(canvas.height / (window.devicePixelRatio || 1) / cellSizePx));
  current.setViewport(cols, rows);

  const startX = Math.floor(current.camera.x);
  const startY = Math.floor(current.camera.y);
  webRenderer.setViewport(startX, startY, cols, rows, cellSizePx);

  for (let vy = 0; vy < rows; vy += 1) {
    for (let vx = 0; vx < cols; vx += 1) {
      const x = startX + vx;
      const y = startY + vy;
      if (x < 0 || y < 0 || x >= current.world.width || y >= current.world.height) {
        continue;
      }
      const idx = getLayerIndex(current.world, x, y);
      const terrainId = current.world.terrainPalette[current.world.terrain[idx] ?? 0] ?? "land";

      const floraEntityId = (current.world.floraAt[idx] ?? 0) as EntityId;
      const faunaEntityId = (current.world.faunaAt[idx] ?? 0) as EntityId;
      const flora = floraEntityId ? current.entities.get(floraEntityId) : undefined;
      const fauna = faunaEntityId ? current.entities.get(faunaEntityId) : undefined;

      context.fillStyle = getTileColor(
        current.definitions,
        terrainId,
        flora?.typeId,
        fauna?.typeId
      );
      context.fillRect(vx * cellSizePx, vy * cellSizePx, cellSizePx, cellSizePx);
      context.strokeStyle = "rgba(0, 0, 0, 0.15)";
      context.strokeRect(vx * cellSizePx, vy * cellSizePx, cellSizePx, cellSizePx);
    }
  }

  // Creature draw overlay step (renderer-agnostic API).
  current.draw(webRenderer);

  // Selection highlight.
  context.strokeStyle = "#f5f5f5";
  context.lineWidth = 2;
  const sx = (selected.x - startX) * cellSizePx + 1;
  const sy = (selected.y - startY) * cellSizePx + 1;
  context.strokeRect(sx, sy, cellSizePx - 2, cellSizePx - 2);
};

const renderPanel = () => {
  const current = engine;
  if (!current) {
    return;
  }

  const time = current.getTime();
  tickEl.textContent = current.world.tick.toString();
  phaseEl.textContent = `${time.phase} (${time.phaseTick})`;
  speedEl.textContent = speedMs.toString();
  positionEl.textContent = `(${selected.x}, ${selected.y})`;

  const tileIdx = getLayerIndex(current.world, selected.x, selected.y);
  const terrainId = current.world.terrainPalette[current.world.terrain[tileIdx] ?? 0] ?? "land";
  terrainEl.textContent = current.definitions.terrains[terrainId]?.name ?? terrainId;

  const floraEntityId = (current.world.floraAt[tileIdx] ?? 0) as EntityId;
  const faunaEntityId = (current.world.faunaAt[tileIdx] ?? 0) as EntityId;

  const flora = floraEntityId ? current.entities.get(floraEntityId) : undefined;
  const fauna = faunaEntityId ? current.entities.get(faunaEntityId) : undefined;

  const floraName = flora ? current.definitions.flora[flora.typeId]?.name ?? flora.typeId : "None";
  const faunaName = fauna ? current.definitions.fauna[fauna.typeId]?.name ?? fauna.typeId : "None";

  const formatVitals = (entityType: "flora" | "fauna", entityId: EntityId): string => {
    const entity = current.entities.get(entityId);
    if (!entity) return "";
    const energy = entity.state["energy"];
    const hunger = entity.state["hunger"];
    const health = entity.state["health"];
    const extras: string[] = [];
    if (typeof energy === "number") extras.push(`energy ${energy.toFixed(2)}`);
    if (typeof hunger === "number") extras.push(`hunger ${hunger.toFixed(2)}`);
    if (typeof health === "number") extras.push(`health ${health.toFixed(2)}`);
    if (extras.length === 0) return "";
    return ` (${extras.join(", ")})`;
  };

  floraEl.textContent = floraEntityId ? `${floraName}${formatVitals("flora", floraEntityId)}` : floraName;
  faunaEl.textContent = faunaEntityId ? `${faunaName}${formatVitals("fauna", faunaEntityId)}` : faunaName;
  shadeEl.textContent = (current.world.shade[tileIdx] ?? 0).toFixed(2);
};

const render = () => {
  renderWorld();
  renderPanel();
};

const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const setMode = (nextMode: Mode) => {
  mode = nextMode;
  if (timer) {
    window.clearInterval(timer);
    timer = undefined;
  }
  if (mode === "playing" && engine) {
    timer = window.setInterval(() => {
      const currentEngine = engine;
      if (!currentEngine) {
        return;
      }
      currentEngine.step(speedMs);
      render();
    }, speedMs);
  }
};

saveButton.addEventListener("click", () => {
  const current = engine;
  if (!current) return;
  const save = createSaveV1(current);
  downloadJson(`life-save-tick-${save.tick}.json`, save);
});

autosaveEveryInput.addEventListener("change", () => {
  const current = engine;
  if (!current) return;
  const raw = Number.parseInt(autosaveEveryInput.value, 10);
  const every = Number.isFinite(raw) ? raw : 0;
  current.setAutosave(every, (eng) => {
    const save = createSaveV1(eng);
    downloadJson(`life-autosave-tick-${save.tick}.json`, save);
  });
});

loadFileInput.addEventListener("change", async () => {
  const file = loadFileInput.files?.[0];
  if (!file) return;
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null) return;
  const record = parsed as Record<string, unknown>;
  if (record["version"] !== 1) return;

  const worldRec = record["world"];
  if (typeof worldRec !== "object" || worldRec === null) return;
  const w = worldRec as Record<string, unknown>;
  const width = typeof w["width"] === "number" ? w["width"] : worldWidth;
  const height = typeof w["height"] === "number" ? w["height"] : worldHeight;
  const terrainPalette = Array.isArray(w["terrainPalette"]) ? (w["terrainPalette"] as TerrainId[]) : [];
  const terrainRle = Array.isArray(w["terrainRle"]) ? (w["terrainRle"] as number[]) : [];

  const timing = (record["timing"] as SimulationTiming) ?? { dayLength: 30, nightLength: 20 };
  const seed = typeof record["seed"] === "number" ? record["seed"] : 12345;
  const rngState = typeof record["rngState"] === "number" ? record["rngState"] : seed;
  const tick = typeof record["tick"] === "number" ? record["tick"] : 0;
  const camera = (record["camera"] as Record<string, unknown>) ?? {};

  // Recreate engine with same palette from save.
  const palette = terrainPalette.length > 0 ? terrainPalette : buildTerrainPalette(Object.keys((engine?.definitions.terrains ?? {})) as TerrainId[], "land");
  const defaultTerrainIndex = Math.max(0, palette.indexOf("land"));
  const world = createWorldLayers({ width, height, terrainPalette: palette, defaultTerrainIndex });
  decodeUint16RleInto(terrainRle, world.terrain);
  world.tick = tick;

  const currentDefinitions = engine?.definitions ?? (await loadDefinitionsFromUrl(definitionsUrl));
  const currentTiming = timing;

  const next = new EngineV2({
    definitions: currentDefinitions,
    timing: currentTiming,
    world,
    seed,
    camera: {
      x: typeof camera["x"] === "number" ? camera["x"] : 0,
      y: typeof camera["y"] === "number" ? camera["y"] : 0,
      zoom: typeof camera["zoom"] === "number" ? camera["zoom"] : 1
    }
  });
  next.rng.setState(rngState);

  // Re-register modules we already loaded.
  for (const module of loadedModules.values()) {
    next.registerModule(module);
  }

  const entitiesRaw = record["entities"];
  if (Array.isArray(entitiesRaw)) {
    const parsedEntities: Entity[] = [];
    for (const entry of entitiesRaw) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      const id = typeof e["id"] === "number" ? e["id"] : undefined;
      const typeId = typeof e["typeId"] === "string" ? e["typeId"] : undefined;
      const layer = e["layer"] === "flora" || e["layer"] === "fauna" ? e["layer"] : undefined;
      const x = typeof e["x"] === "number" ? e["x"] : undefined;
      const y = typeof e["y"] === "number" ? e["y"] : undefined;
      const state = typeof e["state"] === "object" && e["state"] !== null ? (e["state"] as Record<string, unknown>) : {};
      if (id === undefined || !typeId || !layer || x === undefined || y === undefined) continue;
      parsedEntities.push({ id, typeId, layer, x, y, state });
    }
    next.loadEntities(parsedEntities);
  }

  engine = next;
  render();
});

const stepOnce = () => {
  if (!engine) {
    return;
  }
  engine.step(speedMs);
  render();
};

const updateSpeed = (delta: number) => {
  speedMs = clamp(speedMs + delta, 120, 2000);
  if (mode === "playing") {
    setMode("playing");
  }
  renderPanel();
};

const applyBrush = (x: number, y: number, opts?: { forceErase?: boolean }) => {
  const current = engine;
  if (!current) return;

  const idx = getLayerIndex(current.world, x, y);
  const floraId = (current.world.floraAt[idx] ?? 0) as EntityId;
  const faunaId = (current.world.faunaAt[idx] ?? 0) as EntityId;

  const action = opts?.forceErase ? "erase" : brushActionEl.value;
  const brushType = brushTypeEl.value;
  const layer = creatureLayerById.get(brushType);

  if (action === "erase" || !layer) {
    if (faunaId) current.despawn(faunaId);
    if (floraId) current.despawn(floraId);
    return;
  }

  if (layer === "fauna") {
    if (faunaId) {
      const existing = current.entities.get(faunaId);
      if (existing?.typeId === brushType) {
        current.despawn(faunaId);
        return;
      }
      current.despawn(faunaId);
    }
    try {
      current.spawn(brushType, "fauna", x, y, {});
    } catch {
      // ignore placement errors (impassable/occupied)
    }
    return;
  }

  if (floraId) {
    const existing = current.entities.get(floraId);
    if (existing?.typeId === brushType) {
      current.despawn(floraId);
      return;
    }
    current.despawn(floraId);
  }
  try {
    current.spawn(brushType, "flora", x, y, {});
  } catch {
    // ignore placement errors
  }
};

const selectTileFromEvent = (event: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const current = engine;
  if (!current) return;
  const cellSizePx = baseCellSizePx * current.camera.zoom;
  const vx = Math.floor((event.clientX - rect.left) / cellSizePx);
  const vy = Math.floor((event.clientY - rect.top) / cellSizePx);
  const x = Math.floor(current.camera.x) + vx;
  const y = Math.floor(current.camera.y) + vy;

  selected = {
    x: clamp(x, 0, current.world.width - 1),
    y: clamp(y, 0, current.world.height - 1)
  };

  const forceErase = event.shiftKey || event.button === 2;
  applyBrush(selected.x, selected.y, { forceErase });
  render();
};

playButton.addEventListener("click", () => setMode("playing"));
pauseButton.addEventListener("click", () => setMode("paused"));
stepButton.addEventListener("click", () => stepOnce());
fastButton.addEventListener("click", () => updateSpeed(-150));
slowButton.addEventListener("click", () => updateSpeed(150));
canvas.addEventListener("click", selectTileFromEvent);
canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

let isDragging = false;
let dragLast: { x: number; y: number } | undefined;
let didDrag = false;

canvas.addEventListener("mousedown", (event) => {
  isDragging = true;
  didDrag = false;
  dragLast = { x: event.clientX, y: event.clientY };
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  dragLast = undefined;
});

window.addEventListener("mousemove", (event) => {
  const current = engine;
  if (!current || !isDragging || !dragLast) return;
  const cellSizePx = baseCellSizePx * current.camera.zoom;
  const dxPx = event.clientX - dragLast.x;
  const dyPx = event.clientY - dragLast.y;
  if (Math.abs(dxPx) + Math.abs(dyPx) > 2) {
    didDrag = true;
  }
  dragLast = { x: event.clientX, y: event.clientY };
  current.pan(-dxPx / cellSizePx, -dyPx / cellSizePx);
  renderWorld();
});

canvas.addEventListener("wheel", (event) => {
  const current = engine;
  if (!current) return;
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const cellSizePx = baseCellSizePx * current.camera.zoom;
  const vx = (event.clientX - rect.left) / cellSizePx;
  const vy = (event.clientY - rect.top) / cellSizePx;
  const anchorX = Math.floor(current.camera.x) + vx;
  const anchorY = Math.floor(current.camera.y) + vy;
  const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
  current.zoomTo(current.camera.zoom * zoomFactor, anchorX, anchorY);
  renderWorld();
}, { passive: false });

window.addEventListener("resize", () => render());

const bootstrap = async () => {
  const [definitions, timing] = await Promise.all([
    loadDefinitionsFromUrl(definitionsUrl),
    loadTimingFromUrl(timingUrl)
  ]);

  const palette = buildTerrainPalette(Object.keys(definitions.terrains) as TerrainId[], "land");
  const defaultTerrainIndex = Math.max(0, palette.indexOf("land"));
  const world = createWorldLayers({
    width: worldWidth,
    height: worldHeight,
    terrainPalette: palette,
    defaultTerrainIndex
  });

  const paletteIndexById = new Map<TerrainId, number>();
  for (let i = 0; i < palette.length; i += 1) {
    paletteIndexById.set(palette[i] ?? "land", i);
  }
  applyBeachTerrain(world, paletteIndexById, { leftLandRatio: 0.22, rightSeaRatio: 0.22 });

  engine = new EngineV2({
    definitions,
    timing,
    world,
    seed: 12345,
    camera: { x: 0, y: 0, zoom: 1 }
  });

  const loader = createWebCreatureLoader();
  const [conway, grass, sheep, wolf] = await Promise.all([
    loader("conway"),
    loader("grass"),
    loader("sheep"),
    loader("wolf")
  ]);
  engine.registerModule(conway);
  engine.registerModule(grass);
  engine.registerModule(sheep);
  engine.registerModule(wolf);
  loadedModules.set("conway", conway);
  loadedModules.set("grass", grass);
  loadedModules.set("sheep", sheep);
  loadedModules.set("wolf", wolf);

  creatureLayerById.set("conway", "fauna");
  creatureLayerById.set("sheep", "fauna");
  creatureLayerById.set("wolf", "fauna");
  creatureLayerById.set("grass", "flora");

  // Scenario: grass on left land band, creatures everywhere but sea.
  const rightSeaStart = Math.floor(worldWidth * (1 - 0.22));
  const leftLandEnd = Math.floor(worldWidth * 0.22);

  spawnRandom(engine, "grass", "flora", 5000, { minX: 0, minY: 0, maxXExclusive: leftLandEnd, maxYExclusive: worldHeight });
  spawnRandom(engine, "sheep", "fauna", 30, { minX: 0, minY: 0, maxXExclusive: leftLandEnd, maxYExclusive: worldHeight });
  spawnRandom(engine, "wolf", "fauna", 3, { minX: leftLandEnd, minY: 0, maxXExclusive: rightSeaStart, maxYExclusive: worldHeight });
  spawnRandom(engine, "conway", "fauna", 30, { minX: 0, minY: 0, maxXExclusive: rightSeaStart, maxYExclusive: worldHeight });

  render();
};

bootstrap().catch((error) => {
  console.error(error);
});

const enableLiveReload = () => {
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    return;
  }
  const source = new EventSource("/events");
  source.addEventListener("message", (event) => {
    if (event.data === "reload") {
      window.location.reload();
    }
  });
};

enableLiveReload();
