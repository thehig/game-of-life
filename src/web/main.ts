import {
  createDemoSimulation,
  getSimulationTime,
  inspectTile,
  stepSimulation
} from "../engine/index.js";

type Mode = "paused" | "playing";

const cellSize = 18;
const worldWidth = 32;
const worldHeight = 18;

let simulation = createDemoSimulation(worldWidth, worldHeight);
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

const resizeCanvas = () => {
  canvas.width = simulation.world.width * cellSize;
  canvas.height = simulation.world.height * cellSize;
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

const getTileColor = (x: number, y: number): string => {
  const tile = simulation.world.tiles[y * simulation.world.width + x];
  let color = simulation.definitions.terrains[tile.terrainId].color;

  if (tile.flora) {
    const floraDef = simulation.definitions.flora[tile.flora.id];
    const growthFactor = 0.7 + tile.flora.growth * 0.6;
    color = adjustColor(floraDef.color, growthFactor);
  }

  if (tile.fauna) {
    color = simulation.definitions.fauna[tile.fauna.id].color;
  }

  if (tile.shade > 0) {
    color = adjustColor(color, 1 - tile.shade * 0.4);
  }

  return color;
};

const renderWorld = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < simulation.world.height; y += 1) {
    for (let x = 0; x < simulation.world.width; x += 1) {
      context.fillStyle = getTileColor(x, y);
      context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      context.strokeStyle = "rgba(0, 0, 0, 0.15)";
      context.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  context.strokeStyle = "#f5f5f5";
  context.lineWidth = 2;
  context.strokeRect(
    selected.x * cellSize + 1,
    selected.y * cellSize + 1,
    cellSize - 2,
    cellSize - 2
  );
};

const renderPanel = () => {
  const details = inspectTile(simulation, selected.x, selected.y);
  const time = getSimulationTime(simulation.world.tick, simulation.timing);

  tickEl.textContent = simulation.world.tick.toString();
  phaseEl.textContent = `${time.phase} (${time.phaseTick})`;
  speedEl.textContent = speedMs.toString();
  positionEl.textContent = `(${selected.x}, ${selected.y})`;
  terrainEl.textContent = details.terrain.name;
  floraEl.textContent = details.flora
    ? `${details.flora.definition.name} (nutrition ${details.flora.state.nutrition.toFixed(2)})`
    : "None";
  faunaEl.textContent = details.fauna
    ? `${details.fauna.definition.name} (health ${details.fauna.state.health.toFixed(
        2
      )}, hunger ${details.fauna.state.hunger.toFixed(2)})`
    : "None";
  shadeEl.textContent = details.shade.toFixed(2);
};

const render = () => {
  renderWorld();
  renderPanel();
};

const setMode = (nextMode: Mode) => {
  mode = nextMode;
  if (timer) {
    window.clearInterval(timer);
    timer = undefined;
  }
  if (mode === "playing") {
    timer = window.setInterval(() => {
      simulation = stepSimulation(simulation);
      render();
    }, speedMs);
  }
};

const stepOnce = () => {
  simulation = stepSimulation(simulation);
  render();
};

const updateSpeed = (delta: number) => {
  speedMs = clamp(speedMs + delta, 120, 2000);
  if (mode === "playing") {
    setMode("playing");
  }
  renderPanel();
};

const selectTileFromEvent = (event: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.floor(((event.clientX - rect.left) * scaleX) / cellSize);
  const y = Math.floor(((event.clientY - rect.top) * scaleY) / cellSize);

  selected = {
    x: clamp(x, 0, simulation.world.width - 1),
    y: clamp(y, 0, simulation.world.height - 1)
  };

  render();
};

playButton.addEventListener("click", () => setMode("playing"));
pauseButton.addEventListener("click", () => setMode("paused"));
stepButton.addEventListener("click", () => stepOnce());
fastButton.addEventListener("click", () => updateSpeed(-150));
slowButton.addEventListener("click", () => updateSpeed(150));
canvas.addEventListener("click", selectTileFromEvent);

resizeCanvas();
render();
