import {
  EngineV2,
  buildTerrainPalette,
  createSaveV1,
  createWorldLayers,
  decodeUint16RleInto,
  faunaSamples,
  floraSamples,
  getScenarioSample,
  scenarioSamples
} from "../engine/index.js";
import { createWebCreatureLoader } from "../engine/creatureLoader.js";
import { loadDefinitionsFromUrl, loadTimingFromUrl } from "./config.js";
import { DefinitionSet, Entity, EntityId, SimulationTiming, TerrainId } from "../engine/types.js";
import { WebRenderer } from "./webRenderer.js";
import { getIndex as getLayerIndex } from "../engine/world.layers.js";
import type { CreatureModule } from "../engine/creature.js";
import type { ScenarioRuntime } from "../engine/index.js";

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
let selectedEntityId: EntityId | null = null;
let activeScenario: ScenarioRuntime | null = null;
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
const selectedEntityEl = getElement<HTMLSpanElement>("selectedEntity");
const selectedLayerEl = getElement<HTMLSpanElement>("selectedLayer");
const selectedVitalsEl = getElement<HTMLSpanElement>("selectedVitals");

const playButton = getElement<HTMLButtonElement>("play");
const pauseButton = getElement<HTMLButtonElement>("pause");
const stepButton = getElement<HTMLButtonElement>("step");
const fastButton = getElement<HTMLButtonElement>("fast");
const slowButton = getElement<HTMLButtonElement>("slow");

const brushActionEl = getElement<HTMLSelectElement>("brushAction");
const brushTypeEl = getElement<HTMLSelectElement>("brushType");
const scenarioSelectEl = getElement<HTMLSelectElement>("scenarioSelect");
const scenarioDescriptionEl = getElement<HTMLDivElement>("scenarioDescription");
const loadScenarioButton = getElement<HTMLButtonElement>("loadScenario");
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

const formatLabel = (value: string): string =>
  value
    .split("_")
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const colorFromId = (id: string, layer: "flora" | "fauna"): string => {
  const hash = hashString(`${layer}:${id}`);
  const baseR = 60 + (hash & 0x7f);
  const baseG = 60 + ((hash >> 7) & 0x7f);
  const baseB = 60 + ((hash >> 14) & 0x7f);
  const bias = layer === "flora" ? { r: -10, g: 35, b: -10 } : { r: 35, g: -10, b: -10 };
  const r = clamp(baseR + bias.r, 0, 255);
  const g = clamp(baseG + bias.g, 0, 255);
  const b = clamp(baseB + bias.b, 0, 255);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const floraLabelById = new Map<string, string>(
  floraSamples.map((sample) => [sample.id, formatLabel(sample.id)])
);
const faunaLabelById = new Map<string, string>(
  faunaSamples.map((sample) => [sample.id, formatLabel(sample.id)])
);

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

const getStateNumber = (state: Record<string, unknown>, key: string, fallback: number): number => {
  const value = state[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const formatNumber = (value: number): string => (Number.isInteger(value) ? value.toString() : value.toFixed(2));

const buildVitalParts = (state: Record<string, unknown>): string[] => {
  const parts: string[] = [];
  const keys = ["energy", "growth", "hunger", "health", "age", "density"];
  for (const key of keys) {
    const value = state[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      parts.push(`${key} ${formatNumber(value)}`);
    }
  }
  return parts;
};

const createGenericFloraModule = (id: string): CreatureModule => ({
  id,
  layer: "flora",
  spawn: () => ({
    update: (_deltaTimeMs, api) => {
      const self = api.getSelf();
      const time = api.getTime();
      const energy = getStateNumber(self.state, "energy", 0.5);
      const growth = getStateNumber(self.state, "growth", 0.3);
      const tile = api.getTile(self.x, self.y);
      const terrain = api.getDefinitions().terrains[tile?.terrainId ?? "land"];
      const fertility = clamp(terrain?.fertility ?? 0.5, 0, 1);
      const dayDelta = 0.015 * (0.4 + fertility);
      const nightDelta = -0.008;
      const delta = time.phase === "day" ? dayDelta : nightDelta;
      const nextEnergy = clamp(energy + delta, 0, 1);
      const nextGrowth = clamp(growth + delta * 0.7, 0, 1);
      api.emit({ kind: "setState", entityId: self.id, patch: { energy: nextEnergy, growth: nextGrowth } });
    },
    draw: (renderer, api) => {
      const self = api.getSelf();
      const defColor = api.getDefinitions().flora[id]?.color;
      renderer.drawCell(self.x, self.y, defColor ?? colorFromId(id, "flora"));
    }
  })
});

const createGenericFaunaModule = (id: string): CreatureModule => ({
  id,
  layer: "fauna",
  spawn: () => ({
    update: (_deltaTimeMs, api) => {
      const self = api.getSelf();
      const time = api.getTime();
      const hunger = clamp(getStateNumber(self.state, "hunger", 0.2) + 0.01, 0, 1);
      const energy = clamp(getStateNumber(self.state, "energy", 1) + (time.phase === "night" ? -0.004 : -0.006), 0, 1);
      const health = clamp(getStateNumber(self.state, "health", 1) - (hunger >= 1 ? 0.02 : 0), 0, 1);
      api.emit({
        kind: "setState",
        entityId: self.id,
        patch: { hunger, energy, health, age: getStateNumber(self.state, "age", 0) + 1 }
      });
      if (health <= 0) {
        api.emit({ kind: "despawn", entityId: self.id });
      }
    },
    draw: (renderer, api) => {
      const self = api.getSelf();
      const defColor = api.getDefinitions().fauna[id]?.color;
      renderer.drawCell(self.x, self.y, defColor ?? colorFromId(id, "fauna"));
    }
  })
});

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

  const selectedEntity = selectedEntityId ? current.entities.get(selectedEntityId) : undefined;
  if (selectedEntity) {
    webRenderer.drawText(selectedEntity.x, selectedEntity.y, "*");
  }
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

  const getEntityLabel = (layer: "flora" | "fauna", typeId: string): string => {
    if (layer === "flora") {
      return current.definitions.flora[typeId]?.name ?? floraLabelById.get(typeId) ?? typeId;
    }
    return current.definitions.fauna[typeId]?.name ?? faunaLabelById.get(typeId) ?? typeId;
  };

  const formatInlineVitals = (entity: Entity | undefined): string => {
    if (!entity) return "";
    const parts = buildVitalParts(entity.state);
    return parts.length === 0 ? "" : ` (${parts.join(", ")})`;
  };

  const markSelected = (entityId: EntityId | 0): string =>
    entityId !== 0 && entityId === selectedEntityId ? " *" : "";

  const floraName = flora ? getEntityLabel("flora", flora.typeId) : "None";
  const faunaName = fauna ? getEntityLabel("fauna", fauna.typeId) : "None";

  floraEl.textContent = floraEntityId
    ? `${floraName}${markSelected(floraEntityId)}${formatInlineVitals(flora)}`
    : floraName;
  faunaEl.textContent = faunaEntityId
    ? `${faunaName}${markSelected(faunaEntityId)}${formatInlineVitals(fauna)}`
    : faunaName;
  shadeEl.textContent = (current.world.shade[tileIdx] ?? 0).toFixed(2);

  let selectedEntity: Entity | undefined;
  if (selectedEntityId) {
    selectedEntity = current.entities.get(selectedEntityId) ?? undefined;
  }
  if (!selectedEntity) {
    selectedEntityId = null;
    selectedEntityEl.textContent = "None";
    selectedLayerEl.textContent = "-";
    selectedVitalsEl.textContent = "";
  } else {
    selectedEntityEl.textContent = getEntityLabel(selectedEntity.layer, selectedEntity.typeId);
    selectedLayerEl.textContent = selectedEntity.layer;
    const parts = buildVitalParts(selectedEntity.state);
    selectedVitalsEl.textContent = parts.length === 0 ? "None" : parts.join(", ");
  }
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

const registerModule = (module: CreatureModule) => {
  const current = engine;
  if (!current) return;
  current.registerModule(module);
  loadedModules.set(module.id, module);
  creatureLayerById.set(module.id, module.layer);
};

const populateBrushTypes = () => {
  creatureLayerById.clear();
  brushTypeEl.innerHTML = "";

  const addOption = (group: HTMLOptGroupElement, id: string, label: string) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    group.appendChild(option);
  };

  const specialGroup = document.createElement("optgroup");
  specialGroup.label = "Special";
  addOption(specialGroup, "conway", "Conway");
  brushTypeEl.appendChild(specialGroup);
  creatureLayerById.set("conway", "fauna");

  const floraGroup = document.createElement("optgroup");
  floraGroup.label = "Flora";
  for (const sample of floraSamples) {
    addOption(floraGroup, sample.id, floraLabelById.get(sample.id) ?? sample.id);
    creatureLayerById.set(sample.id, "flora");
  }
  brushTypeEl.appendChild(floraGroup);

  const faunaGroup = document.createElement("optgroup");
  faunaGroup.label = "Fauna";
  for (const sample of faunaSamples) {
    addOption(faunaGroup, sample.id, faunaLabelById.get(sample.id) ?? sample.id);
    creatureLayerById.set(sample.id, "fauna");
  }
  brushTypeEl.appendChild(faunaGroup);

  if (brushTypeEl.querySelector('option[value="grass"]')) {
    brushTypeEl.value = "grass";
  } else if (brushTypeEl.options.length > 0) {
    brushTypeEl.selectedIndex = 0;
  }
};

const setScenarioDescription = (scenarioId: string) => {
  if (scenarioId === "custom") {
    scenarioDescriptionEl.textContent = "Custom world state (no scenario updates).";
    return;
  }
  const scenario = getScenarioSample(scenarioId);
  scenarioDescriptionEl.textContent = scenario?.description ?? "";
};

const populateScenarioSelect = (defaultScenarioId: string) => {
  scenarioSelectEl.innerHTML = "";
  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "Custom";
  scenarioSelectEl.appendChild(customOption);
  for (const scenario of scenarioSamples) {
    const option = document.createElement("option");
    option.value = scenario.id;
    option.textContent = scenario.name;
    scenarioSelectEl.appendChild(option);
  }
  if (scenarioSelectEl.querySelector(`option[value="${defaultScenarioId}"]`)) {
    scenarioSelectEl.value = defaultScenarioId;
  } else {
    scenarioSelectEl.value = "custom";
  }
  setScenarioDescription(scenarioSelectEl.value);
};

const applyScenario = (scenarioId: string) => {
  const current = engine;
  if (!current) return;
  if (scenarioId === "custom") {
    activeScenario = null;
    setScenarioDescription("custom");
    render();
    return;
  }
  const scenario = getScenarioSample(scenarioId);
  if (!scenario) {
    activeScenario = null;
    setScenarioDescription("custom");
    render();
    return;
  }
  activeScenario = scenario.setup(current);
  selectedEntityId = null;
  setScenarioDescription(scenarioId);
  render();
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
      if (activeScenario?.update) {
        activeScenario.update(currentEngine);
      }
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

scenarioSelectEl.addEventListener("change", () => {
  setScenarioDescription(scenarioSelectEl.value);
});

loadScenarioButton.addEventListener("click", () => {
  applyScenario(scenarioSelectEl.value);
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
  activeScenario = null;
  selectedEntityId = null;
  if (scenarioSelectEl.querySelector('option[value="custom"]')) {
    scenarioSelectEl.value = "custom";
  }
  scenarioDescriptionEl.textContent = "Loaded save (custom).";
  render();
});

const stepOnce = () => {
  if (!engine) {
    return;
  }
  engine.step(speedMs);
  if (activeScenario?.update) {
    activeScenario.update(engine);
  }
  render();
};

const updateSpeed = (delta: number) => {
  speedMs = clamp(speedMs + delta, 120, 2000);
  if (mode === "playing") {
    setMode("playing");
  }
  renderPanel();
};

const selectEntityAt = (x: number, y: number) => {
  const current = engine;
  if (!current) return;
  const idx = getLayerIndex(current.world, x, y);
  const faunaId = (current.world.faunaAt[idx] ?? 0) as EntityId;
  const floraId = (current.world.floraAt[idx] ?? 0) as EntityId;
  if (faunaId) {
    selectedEntityId = faunaId;
    return;
  }
  if (floraId) {
    selectedEntityId = floraId;
    return;
  }
  selectedEntityId = null;
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

  if (action === "select") {
    selectEntityAt(x, y);
    return;
  }

  if (action === "erase" || !layer) {
    if (faunaId) current.despawn(faunaId);
    if (floraId) current.despawn(floraId);
    if (selectedEntityId === faunaId || selectedEntityId === floraId) {
      selectedEntityId = null;
    }
    return;
  }

  if (layer === "fauna") {
    if (faunaId) {
      const existing = current.entities.get(faunaId);
      if (existing?.typeId === brushType) {
        current.despawn(faunaId);
        if (selectedEntityId === faunaId) {
          selectedEntityId = null;
        }
        return;
      }
      current.despawn(faunaId);
      if (selectedEntityId === faunaId) {
        selectedEntityId = null;
      }
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
    if (selectedEntityId === floraId) {
      selectedEntityId = null;
    }
      return;
    }
    current.despawn(floraId);
  if (selectedEntityId === floraId) {
    selectedEntityId = null;
  }
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

  engine = new EngineV2({
    definitions,
    timing,
    world,
    seed: 12345,
    camera: { x: 0, y: 0, zoom: 1 }
  });

  populateBrushTypes();
  populateScenarioSelect("beach_tide");

  const loader = createWebCreatureLoader();
  const baseIds = ["conway", "grass", "sheep", "wolf", "sheepdog"];
  const baseModules = await Promise.all(baseIds.map((id) => loader(id)));
  for (const module of baseModules) {
    registerModule(module);
  }
  for (const sample of floraSamples) {
    if (!loadedModules.has(sample.id)) {
      registerModule(createGenericFloraModule(sample.id));
    }
  }
  for (const sample of faunaSamples) {
    if (!loadedModules.has(sample.id)) {
      registerModule(createGenericFaunaModule(sample.id));
    }
  }

  applyScenario(scenarioSelectEl.value);

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
