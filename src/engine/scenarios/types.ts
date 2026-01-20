import { EngineV2 } from "../engine.v2.js";

export type ScenarioRuntime = {
  id: string;
  name: string;
  description: string;
  update?: (engine: EngineV2) => void;
};

export type ScenarioDefinition = {
  id: string;
  name: string;
  description: string;
  setup: (engine: EngineV2) => ScenarioRuntime;
};
