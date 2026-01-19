import readline from "node:readline";
import { readFile, writeFile } from "node:fs/promises";
import {
  EngineV2,
  buildTerrainPalette,
  createNodeCreatureLoader,
  createSaveV1,
  createWorldLayers,
  decodeUint16RleInto
} from "../engine/index.js";
import type { CreatureModule } from "../engine/creature.js";
import type { Entity, EntityId, TerrainId } from "../engine/types.js";
import { loadDefinitionsFromFile, loadTimingFromFile } from "../engine/config.node.js";

type Mode = "paused" | "playing";

const width = 24;
const height = 14;
const definitionsPath = process.env["LIFE_DEFINITIONS"] ?? "config/definitions.json";
const timingPath = process.env["LIFE_TIMING"] ?? "config/timing.json";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const run = async () => {
  const definitions = await loadDefinitionsFromFile(definitionsPath);
  const timing = await loadTimingFromFile(timingPath);

  const palette = buildTerrainPalette(Object.keys(definitions.terrains) as TerrainId[], "land");
  const defaultTerrainIndex = Math.max(0, palette.indexOf("land"));
  const world = createWorldLayers({ width, height, terrainPalette: palette, defaultTerrainIndex });

  let engine = new EngineV2({
    definitions,
    timing,
    world,
    seed: 12345,
    camera: { x: 0, y: 0, zoom: 1, viewportWidth: width, viewportHeight: height }
  });

  const loader = createNodeCreatureLoader(new URL("../engine/creatures/", import.meta.url));
  const modules = new Map<string, CreatureModule>();
  for (const id of ["conway", "grass", "sheep", "wolf"]) {
    const mod = await loader(id);
    modules.set(id, mod);
    engine.registerModule(mod);
  }

  let mode: Mode = "paused";
  let speedMs = 600;
  let selected = { x: 2, y: 2 };
  let timer: NodeJS.Timeout | undefined;

  const getTerrainIdAt = (x: number, y: number): string => {
    const idx = y * engine.world.width + x;
    const paletteIndex = engine.world.terrain[idx] ?? 0;
    return engine.world.terrainPalette[paletteIndex] ?? "land";
  };

  const renderGridLines = (): string[] => {
    const lines: string[] = [];
    for (let y = 0; y < engine.world.height; y += 1) {
      let line = "";
      for (let x = 0; x < engine.world.width; x += 1) {
        const idx = y * engine.world.width + x;
        const faunaId = engine.world.faunaAt[idx] as EntityId;
        const floraId = engine.world.floraAt[idx] as EntityId;
        if (faunaId) {
          const e = engine.entities.get(faunaId);
          const def = e ? engine.definitions.fauna[e.typeId] : undefined;
          line += def?.ascii ?? "?";
        } else if (floraId) {
          const e = engine.entities.get(floraId);
          const def = e ? engine.definitions.flora[e.typeId] : undefined;
          line += def?.ascii ?? "?";
        } else {
          const terrainId = getTerrainIdAt(x, y);
          line += engine.definitions.terrains[terrainId]?.ascii ?? ".";
        }
      }
      lines.push(line);
    }
    return lines;
  };

  const formatVitals = (entityId: EntityId): string => {
    const entity = engine.entities.get(entityId);
    if (!entity) return "";
    const energy = entity.state["energy"];
    const hunger = entity.state["hunger"];
    const health = entity.state["health"];
    const extras: string[] = [];
    if (typeof energy === "number") extras.push(`energy ${energy.toFixed(2)}`);
    if (typeof hunger === "number") extras.push(`hunger ${hunger.toFixed(2)}`);
    if (typeof health === "number") extras.push(`health ${health.toFixed(2)}`);
    return extras.length ? ` (${extras.join(", ")})` : "";
  };

  const renderPanelLines = (): string[] => {
    const time = engine.getTime();
    const idx = selected.y * engine.world.width + selected.x;
    const terrainId = getTerrainIdAt(selected.x, selected.y);
    const floraId = engine.world.floraAt[idx] as EntityId;
    const faunaId = engine.world.faunaAt[idx] as EntityId;
    const floraEnt = floraId ? engine.entities.get(floraId) : undefined;
    const faunaEnt = faunaId ? engine.entities.get(faunaId) : undefined;

    const floraName = floraEnt ? engine.definitions.flora[floraEnt.typeId]?.name ?? floraEnt.typeId : "None";
    const faunaName = faunaEnt ? engine.definitions.fauna[faunaEnt.typeId]?.name ?? faunaEnt.typeId : "None";

    return [
      `Tick: ${engine.world.tick}`,
      `Mode: ${mode.toUpperCase()}`,
      `Sun: ${time.phase} (${time.phaseTick})`,
      `Selected: (${selected.x}, ${selected.y})`,
      `Terrain: ${engine.definitions.terrains[terrainId]?.name ?? terrainId}`,
      `Flora: ${floraId ? `${floraName}${formatVitals(floraId)}` : floraName}`,
      `Fauna: ${faunaId ? `${faunaName}${formatVitals(faunaId)}` : faunaName}`,
      "",
      "Controls:",
      " play | pause | step",
      " fast | slow",
      " tile x y",
      " paint <conway|grass|sheep|wolf> x y",
      " erase x y",
      " save <path>",
      " load <path>",
      " quit"
    ];
  };

  const render = () => {
    const gridLines = renderGridLines();
    const panelLines = renderPanelLines();
    const gridWidth = gridLines[0]?.length ?? 0;
    const totalLines = Math.max(gridLines.length, panelLines.length);
    const output: string[] = [];

    for (let i = 0; i < totalLines; i += 1) {
      const gridLine = gridLines[i] ?? " ".repeat(gridWidth);
      const panelLine = panelLines[i] ?? "";
      output.push(`${gridLine}  | ${panelLine}`);
    }

    console.clear();
    console.log(output.join("\n"));
  };

  const setMode = (nextMode: Mode) => {
    mode = nextMode;
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    if (mode === "playing") {
      timer = setInterval(() => {
        engine.step(speedMs);
        render();
      }, speedMs);
    }
  };

  const stepOnce = () => {
    engine.step(speedMs);
    render();
  };

  const updateSpeed = (delta: number) => {
    speedMs = clamp(speedMs + delta, 100, 2000);
    if (mode === "playing") {
      setMode("playing");
    }
  };

  const updateSelection = (x: number, y: number) => {
    selected = {
      x: clamp(x, 0, engine.world.width - 1),
      y: clamp(y, 0, engine.world.height - 1)
    };
  };

  const eraseAt = (x: number, y: number) => {
    const idx = y * engine.world.width + x;
    const faunaId = engine.world.faunaAt[idx] as EntityId;
    const floraId = engine.world.floraAt[idx] as EntityId;
    if (faunaId) engine.despawn(faunaId);
    if (floraId) engine.despawn(floraId);
  };

  const paintAt = (typeId: string, x: number, y: number) => {
    const module = modules.get(typeId);
    if (!module) return;
    const layer = module.layer;
    const idx = y * engine.world.width + x;
    if (layer === "fauna") {
      const existingId = engine.world.faunaAt[idx] as EntityId;
      if (existingId) {
        const existing = engine.entities.get(existingId);
        if (existing?.typeId === typeId) {
          engine.despawn(existingId);
          return;
        }
        engine.despawn(existingId);
      }
      try {
        engine.spawn(typeId, "fauna", x, y, {});
      } catch {
        // ignore
      }
      return;
    }
    const existingId = engine.world.floraAt[idx] as EntityId;
    if (existingId) {
      const existing = engine.entities.get(existingId);
      if (existing?.typeId === typeId) {
        engine.despawn(existingId);
        return;
      }
      engine.despawn(existingId);
    }
    try {
      engine.spawn(typeId, "flora", x, y, {});
    } catch {
      // ignore
    }
  };

  const loadSave = async (path: string) => {
    const raw = await readFile(path, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid save");
    }
    const record = parsed as Record<string, unknown>;
    if (record["version"] !== 1) throw new Error("Unsupported save version");

    const worldRec = record["world"];
    if (typeof worldRec !== "object" || worldRec === null) throw new Error("Missing world");
    const w = worldRec as Record<string, unknown>;

    const savedWidth = typeof w["width"] === "number" ? w["width"] : width;
    const savedHeight = typeof w["height"] === "number" ? w["height"] : height;
    const terrainPalette = Array.isArray(w["terrainPalette"]) ? (w["terrainPalette"] as TerrainId[]) : palette;
    const terrainRle = Array.isArray(w["terrainRle"]) ? (w["terrainRle"] as number[]) : [];

    const newWorld = createWorldLayers({
      width: savedWidth,
      height: savedHeight,
      terrainPalette,
      defaultTerrainIndex: Math.max(0, terrainPalette.indexOf("land"))
    });
    decodeUint16RleInto(terrainRle, newWorld.terrain);
    newWorld.tick = typeof record["tick"] === "number" ? record["tick"] : 0;

    const newEngine = new EngineV2({
      definitions,
      timing,
      world: newWorld,
      seed: typeof record["seed"] === "number" ? record["seed"] : 12345,
      camera: { x: 0, y: 0, zoom: 1, viewportWidth: savedWidth, viewportHeight: savedHeight }
    });

    const rngState = typeof record["rngState"] === "number" ? record["rngState"] : newEngine.rng.getSeed();
    newEngine.rng.setState(rngState);

    for (const mod of modules.values()) newEngine.registerModule(mod);

    const entitiesRaw = record["entities"];
    if (Array.isArray(entitiesRaw)) {
      const entities: Entity[] = [];
      for (const entry of entitiesRaw) {
        if (typeof entry !== "object" || entry === null) continue;
        const e = entry as Record<string, unknown>;
        const id = typeof e["id"] === "number" ? e["id"] : undefined;
        const typeId = typeof e["typeId"] === "string" ? e["typeId"] : undefined;
        const layer = e["layer"] === "flora" || e["layer"] === "fauna" ? e["layer"] : undefined;
        const x = typeof e["x"] === "number" ? e["x"] : undefined;
        const y = typeof e["y"] === "number" ? e["y"] : undefined;
        const state =
          typeof e["state"] === "object" && e["state"] !== null ? (e["state"] as Record<string, unknown>) : {};
        if (id === undefined || !typeId || !layer || x === undefined || y === undefined) continue;
        entities.push({ id, typeId, layer, x, y, state });
      }
      newEngine.loadEntities(entities);
    }

    engine = newEngine;
    selected = { x: 2, y: 2 };
    render();
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("line", (line) => {
    const [command, arg1, arg2, arg3] = line.trim().split(/\s+/);

    switch (command) {
      case "play":
        setMode("playing");
        break;
      case "pause":
        setMode("paused");
        break;
      case "step":
        stepOnce();
        break;
      case "fast":
        updateSpeed(-150);
        break;
      case "slow":
        updateSpeed(150);
        break;
      case "tile": {
        const x = Number.parseInt(arg1 ?? "", 10);
        const y = Number.parseInt(arg2 ?? "", 10);
        if (!Number.isNaN(x) && !Number.isNaN(y)) {
          updateSelection(x, y);
        }
        render();
        break;
      }
      case "paint": {
        const typeId = arg1 ?? "";
        const x = Number.parseInt(arg2 ?? "", 10);
        const y = Number.parseInt(arg3 ?? "", 10);
        if (typeId && !Number.isNaN(x) && !Number.isNaN(y)) {
          paintAt(typeId, clamp(x, 0, engine.world.width - 1), clamp(y, 0, engine.world.height - 1));
        }
        render();
        break;
      }
      case "erase": {
        const x = Number.parseInt(arg1 ?? "", 10);
        const y = Number.parseInt(arg2 ?? "", 10);
        if (!Number.isNaN(x) && !Number.isNaN(y)) {
          eraseAt(clamp(x, 0, engine.world.width - 1), clamp(y, 0, engine.world.height - 1));
        }
        render();
        break;
      }
      case "save": {
        const path = arg1 ?? "save.json";
        const save = createSaveV1(engine);
        writeFile(path, JSON.stringify(save), "utf8")
          .then(() => render())
          .catch((err) => {
            console.error(err);
            render();
          });
        break;
      }
      case "load": {
        const path = arg1 ?? "save.json";
        loadSave(path).catch((err) => {
          console.error(err);
        });
        break;
      }
      case "quit":
      case "exit":
      case "q":
        rl.close();
        break;
      default:
        render();
        break;
    }
  });

  rl.on("close", () => {
    setMode("paused");
    process.exit(0);
  });

  render();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
