import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDefinitionsFromFile, loadTimingFromFile } from "../src/engine/config.node.js";
import { DefinitionSet, FaunaDefinition, FloraDefinition, SimulationTiming, TerrainDefinition } from "../src/engine/types.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const definitionsPath = resolve(rootDir, "config", "definitions.json");
const timingPath = resolve(rootDir, "config", "timing.json");

export const loadDefinitionsFixture = async (): Promise<DefinitionSet> =>
  loadDefinitionsFromFile(definitionsPath);

export const loadTimingFixture = async (): Promise<SimulationTiming> => loadTimingFromFile(timingPath);

export const getTerrainDef = (definitions: DefinitionSet, id: string): TerrainDefinition => {
  const def = definitions.terrains[id];
  if (!def) {
    throw new Error(`Missing terrain definition: ${id}`);
  }
  return def;
};

export const getFloraDef = (definitions: DefinitionSet, id: string): FloraDefinition => {
  const def = definitions.flora[id];
  if (!def) {
    throw new Error(`Missing flora definition: ${id}`);
  }
  return def;
};

export const getFaunaDef = (definitions: DefinitionSet, id: string): FaunaDefinition => {
  const def = definitions.fauna[id];
  if (!def) {
    throw new Error(`Missing fauna definition: ${id}`);
  }
  return def;
};
