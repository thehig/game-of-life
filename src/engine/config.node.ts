import { readFile } from "node:fs/promises";
import { DefinitionSet, SimulationTiming } from "./types.js";
import { parseDefinitions, parseTiming } from "./config.js";

export const loadDefinitionsFromFile = async (path: string): Promise<DefinitionSet> => {
  const raw = await readFile(path, "utf8");
  const data: unknown = JSON.parse(raw);
  return parseDefinitions(data);
};

export const loadTimingFromFile = async (path: string): Promise<SimulationTiming> => {
  const raw = await readFile(path, "utf8");
  const data: unknown = JSON.parse(raw);
  return parseTiming(data);
};
