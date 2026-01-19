import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDefinitionsFromFile, loadTimingFromFile } from "../src/engine/config.node.js";
import { DefinitionSet, SimulationTiming } from "../src/engine/types.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const definitionsPath = resolve(rootDir, "config", "definitions.json");
const timingPath = resolve(rootDir, "config", "timing.json");

export const loadDefinitionsFixture = async (): Promise<DefinitionSet> =>
  loadDefinitionsFromFile(definitionsPath);

export const loadTimingFixture = async (): Promise<SimulationTiming> => loadTimingFromFile(timingPath);
