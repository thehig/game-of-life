import {
  DefinitionSet,
  DietType,
  FaunaDefinition,
  FloraDefinition,
  SimulationTiming,
  TerrainDefinition
} from "./types.js";

type RecordValue = Record<string, unknown>;

const dietTypes: DietType[] = ["herbivore", "carnivore", "omnivore"];

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;

const requireRecord = (value: unknown, context: string): RecordValue => {
  if (!isRecord(value)) {
    throw new Error(`Expected object for ${context}`);
  }
  return value;
};

const requireString = (record: RecordValue, key: string, context: string): string => {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string for ${context}.${key}`);
  }
  return value;
};

const requireNumber = (record: RecordValue, key: string, context: string): number => {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected number for ${context}.${key}`);
  }
  return value;
};

const requireBoolean = (record: RecordValue, key: string, context: string): boolean => {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean for ${context}.${key}`);
  }
  return value;
};

const requireDiet = (record: RecordValue, key: string, context: string): DietType => {
  const value = requireString(record, key, context);
  if (!dietTypes.includes(value as DietType)) {
    throw new Error(`Unknown diet '${value}' in ${context}.${key}`);
  }
  return value as DietType;
};

const requireDietArray = (record: RecordValue, key: string, context: string): DietType[] => {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new Error(`Expected array for ${context}.${key}`);
  }
  const diets: DietType[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new Error(`Expected string in ${context}.${key}`);
    }
    if (!dietTypes.includes(entry as DietType)) {
      throw new Error(`Unknown diet '${entry}' in ${context}.${key}`);
    }
    diets.push(entry as DietType);
  }
  return diets;
};

const ensureIdMatchesKey = (record: RecordValue, key: string, context: string): void => {
  if (record.id === undefined) {
    return;
  }
  const idValue = requireString(record, "id", context);
  if (idValue !== key) {
    throw new Error(`Mismatched id '${idValue}' for ${context}, expected '${key}'`);
  }
};

const parseTerrain = (record: RecordValue, id: string): TerrainDefinition => {
  const context = `terrains.${id}`;
  ensureIdMatchesKey(record, id, context);

  return {
    id,
    name: requireString(record, "name", context),
    ascii: requireString(record, "ascii", context),
    color: requireString(record, "color", context),
    fertility: requireNumber(record, "fertility", context),
    passable: requireBoolean(record, "passable", context)
  };
};

const parseFlora = (record: RecordValue, id: string): FloraDefinition => {
  const context = `flora.${id}`;
  ensureIdMatchesKey(record, id, context);

  return {
    id,
    name: requireString(record, "name", context),
    ascii: requireString(record, "ascii", context),
    color: requireString(record, "color", context),
    growthPerTick: requireNumber(record, "growthPerTick", context),
    maxNutrition: requireNumber(record, "maxNutrition", context),
    trampleLoss: requireNumber(record, "trampleLoss", context),
    edibleBy: requireDietArray(record, "edibleBy", context),
    shadeRadius: requireNumber(record, "shadeRadius", context),
    sunlightCost: requireNumber(record, "sunlightCost", context)
  };
};

const parseFauna = (record: RecordValue, id: string): FaunaDefinition => {
  const context = `fauna.${id}`;
  ensureIdMatchesKey(record, id, context);

  return {
    id,
    name: requireString(record, "name", context),
    ascii: requireString(record, "ascii", context),
    color: requireString(record, "color", context),
    diet: requireDiet(record, "diet", context),
    speed: requireNumber(record, "speed", context),
    maxHealth: requireNumber(record, "maxHealth", context),
    metabolism: requireNumber(record, "metabolism", context),
    hungerRate: requireNumber(record, "hungerRate", context),
    eatRate: requireNumber(record, "eatRate", context)
  };
};

const parseDefinitionMap = <T>(
  value: unknown,
  label: string,
  parser: (record: RecordValue, id: string) => T
): Record<string, T> => {
  const container = requireRecord(value, label);
  const entries: Record<string, T> = {};

  for (const [id, raw] of Object.entries(container)) {
    const record = requireRecord(raw, `${label}.${id}`);
    entries[id] = parser(record, id);
  }

  return entries;
};

export const parseDefinitions = (data: unknown): DefinitionSet => {
  const root = requireRecord(data, "definitions");

  return {
    terrains: parseDefinitionMap(root.terrains, "terrains", parseTerrain),
    flora: parseDefinitionMap(root.flora, "flora", parseFlora),
    fauna: parseDefinitionMap(root.fauna, "fauna", parseFauna)
  };
};

export const parseTiming = (data: unknown): SimulationTiming => {
  const root = requireRecord(data, "timing");
  return {
    dayLength: requireNumber(root, "dayLength", "timing"),
    nightLength: requireNumber(root, "nightLength", "timing")
  };
};
