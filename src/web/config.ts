import { parseDefinitions, parseTiming } from "../engine/config.js";
import { DefinitionSet, SimulationTiming } from "../engine/types.js";

export const loadDefinitionsFromUrl = async (url: string): Promise<DefinitionSet> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load definitions: ${response.status}`);
  }
  const data: unknown = await response.json();
  return parseDefinitions(data);
};

export const loadTimingFromUrl = async (url: string): Promise<SimulationTiming> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load timing: ${response.status}`);
  }
  const data: unknown = await response.json();
  return parseTiming(data);
};
