import readline from "node:readline";
import { createConwaySimulation, inspectTile, renderAscii, stepSimulation } from "../engine/index.js";
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

  let simulation = createConwaySimulation({
    width,
    height,
    definitions,
    timing,
    terrainId: "land"
  });
  let mode: Mode = "paused";
  let speedMs = 600;
  let selected = { x: 2, y: 2 };
  let timer: NodeJS.Timeout | undefined;

  const renderPanelLines = (): string[] => {
    const details = inspectTile(simulation, selected.x, selected.y);
    const floraLine = details.flora
      ? `${details.flora.definition.name} (nutrition ${details.flora.state.nutrition.toFixed(2)})`
      : "None";
    const faunaLine = details.fauna
      ? `${details.fauna.definition.name} (health ${details.fauna.state.health.toFixed(
          2
        )}, hunger ${details.fauna.state.hunger.toFixed(2)})`
      : "None";

    return [
      `Tick: ${simulation.world.tick}`,
      `Mode: ${mode.toUpperCase()}`,
      `Sun: ${details.time.phase} (${details.time.phaseTick})`,
      `Selected: (${details.position.x}, ${details.position.y})`,
      `Terrain: ${details.terrain.name}`,
      `Flora: ${floraLine}`,
      `Fauna: ${faunaLine}`,
      `Shade: ${details.shade.toFixed(2)}`,
      "",
      "Controls:",
      " play | pause | step",
      " fast | slow",
      " tile x y",
      " quit"
    ];
  };

  const render = () => {
    const gridLines = renderAscii(simulation.world, simulation.definitions).split("\n");
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
    speedMs = clamp(speedMs + delta, 100, 2000);
    if (mode === "playing") {
      setMode("playing");
    }
  };

  const updateSelection = (x: number, y: number) => {
    selected = {
      x: clamp(x, 0, simulation.world.width - 1),
      y: clamp(y, 0, simulation.world.height - 1)
    };
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("line", (line) => {
    const [command, arg1, arg2] = line.trim().split(/\s+/);

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
