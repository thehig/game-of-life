import {
  DefinitionSet,
  FaunaDefinition,
  FaunaState,
  FloraDefinition,
  FloraState,
  RuleSet,
  SoilState,
  Tile,
  World
} from "../types.js";
import { getIndex, isInBounds } from "../world.js";

const movementOffsets = [
  [0, 0],
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0]
] as const;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const soilDecayRate = 0.92;
const herbivoreSoilBoost = 0.3;
const carnivoreSoilToxicity = 0.25;
const omnivoreSoilBoost = 0.18;

const decaySoil = (soil?: SoilState): SoilState => {
  const current = soil ?? { fertilityBoost: 0, toxicity: 0 };
  return {
    fertilityBoost: clamp(current.fertilityBoost * soilDecayRate, 0, 1),
    toxicity: clamp(current.toxicity * soilDecayRate, 0, 1)
  };
};

const applyDecomposition = (soil: SoilState, faunaDef: FaunaDefinition): SoilState => {
  if (faunaDef.diet === "herbivore") {
    return {
      ...soil,
      fertilityBoost: clamp(soil.fertilityBoost + herbivoreSoilBoost, 0, 1)
    };
  }
  if (faunaDef.diet === "carnivore") {
    return {
      ...soil,
      toxicity: clamp(soil.toxicity + carnivoreSoilToxicity, 0, 1)
    };
  }
  return {
    ...soil,
    fertilityBoost: clamp(soil.fertilityBoost + omnivoreSoilBoost, 0, 1)
  };
};

const updateFloraState = (
  flora: FloraState,
  floraDef: FloraDefinition,
  fertility: number,
  shade: number,
  isDay: boolean,
  soil: SoilState
): FloraState => {
  const sunlightFactor = isDay ? 1 : 0;
  const shadePenalty = 1 - clamp(shade, 0, 1) * 0.5;
  const adjustedFertility = clamp(fertility + soil.fertilityBoost - soil.toxicity, 0, 1);
  const growthBoost = floraDef.growthPerTick * adjustedFertility * shadePenalty * sunlightFactor;
  const nutrition = clamp(flora.nutrition + growthBoost, 0, floraDef.maxNutrition);
  const growth = clamp(flora.growth + growthBoost - floraDef.sunlightCost * sunlightFactor, 0, 1);

  return {
    id: flora.id,
    nutrition,
    age: flora.age + 1,
    growth
  };
};

const updateFaunaVitals = (
  fauna: FaunaState,
  faunaDef: FaunaDefinition
): FaunaState | undefined => {
  const hunger = clamp(fauna.hunger + faunaDef.hungerRate, 0, 1);
  const energy = clamp(fauna.energy - faunaDef.metabolism, 0, 1);
  const health = hunger >= 1 ? fauna.health - faunaDef.metabolism : fauna.health;

  if (health <= 0) {
    return undefined;
  }

  return {
    id: fauna.id,
    hunger,
    energy,
    health,
    age: fauna.age + 1
  };
};

const scoreHerbivoreTarget = (
  tile: Tile,
  faunaDef: FaunaDefinition,
  definitions: DefinitionSet
): number => {
  if (!tile.flora) {
    return 0;
  }
  const floraDef = definitions.flora[tile.flora.id];
  if (!floraDef) {
    return 0;
  }
  if (!floraDef.edibleBy.includes(faunaDef.diet)) {
    return 0;
  }
  return tile.flora.nutrition;
};

const scoreCarnivoreTarget = (tile: Tile, definitions: DefinitionSet): number => {
  if (!tile.fauna) {
    return 0;
  }
  const preyDef = definitions.fauna[tile.fauna.id];
  if (!preyDef) {
    return 0;
  }
  const diet = preyDef.diet;
  if (diet === "herbivore") {
    return 2;
  }
  if (diet === "carnivore") {
    return 1;
  }
  return 0;
};

type Intent = {
  sourceIndex: number;
  destIndex: number;
  score: number;
  fauna: FaunaState;
  faunaDef: FaunaDefinition;
};

type Resolution = {
  intent: Intent;
  didEat: boolean;
};

const selectDestination = (
  world: World,
  sourceX: number,
  sourceY: number,
  faunaDef: FaunaDefinition,
  definitions: DefinitionSet
): { destIndex: number; score: number } => {
  let bestIndex = getIndex(world, sourceX, sourceY);
  let bestScore = 0;

  for (const [dx, dy] of movementOffsets) {
    const x = sourceX + dx;
    const y = sourceY + dy;
    if (!isInBounds(world, x, y)) {
      continue;
    }
    const tile = world.tiles[getIndex(world, x, y)];
    const terrain = definitions.terrains[tile.terrainId];
    if (!terrain.passable) {
      continue;
    }

    let score = 0;
    if (faunaDef.diet === "herbivore") {
      score = scoreHerbivoreTarget(tile, faunaDef, definitions);
    } else if (faunaDef.diet === "carnivore") {
      score = scoreCarnivoreTarget(tile, definitions);
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = getIndex(world, x, y);
    }
  }

  return { destIndex: bestIndex, score: bestScore };
};

const resolveIntents = (
  intents: Intent[],
  definitions: DefinitionSet
): Map<number, Resolution> => {
  const byDest = new Map<number, Intent[]>();

  for (const intent of intents) {
    const list = byDest.get(intent.destIndex);
    if (list) {
      list.push(intent);
    } else {
      byDest.set(intent.destIndex, [intent]);
    }
  }

  const resolved = new Map<number, Resolution>();

  for (const [destIndex, group] of byDest.entries()) {
    const sorted = [...group].sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.sourceIndex - b.sourceIndex;
    });

    const winner = sorted[0];
    const didEat =
      winner.faunaDef.diet === "carnivore" &&
      sorted.slice(1).some((intent) => {
        const diet = definitions.fauna[intent.fauna.id].diet;
        return diet === "herbivore" || diet === "carnivore";
      });

    resolved.set(destIndex, {
      intent: winner,
      didEat
    });
  }

  return resolved;
};

const applyFaunaToTile = (
  tile: Tile,
  fauna: FaunaState,
  faunaDef: FaunaDefinition,
  didEat: boolean,
  definitions: DefinitionSet
): { tile: Tile; fauna: FaunaState } => {
  let updatedTile = { ...tile };
  let updatedFauna = { ...fauna };

  if (updatedTile.flora) {
    const floraDef = definitions.flora[updatedTile.flora.id];
    if (floraDef.trampleLoss > 0) {
      updatedTile = {
        ...updatedTile,
        flora: {
          ...updatedTile.flora,
          nutrition: clamp(updatedTile.flora.nutrition - floraDef.trampleLoss, 0, floraDef.maxNutrition)
        }
      };
    }
  }

  if (faunaDef.diet === "herbivore" && updatedTile.flora) {
    const floraDef = definitions.flora[updatedTile.flora.id];
    if (floraDef && floraDef.edibleBy.includes(faunaDef.diet)) {
      const eatAmount = Math.min(updatedTile.flora.nutrition, faunaDef.eatRate);
      updatedTile = {
        ...updatedTile,
        flora: {
          ...updatedTile.flora,
          nutrition: clamp(updatedTile.flora.nutrition - eatAmount, 0, floraDef.maxNutrition)
        }
      };
      updatedFauna = {
        ...updatedFauna,
        hunger: clamp(updatedFauna.hunger - eatAmount, 0, 1)
      };
    }
  }

  if (faunaDef.diet === "carnivore" && didEat) {
    updatedFauna = {
      ...updatedFauna,
      hunger: clamp(updatedFauna.hunger - faunaDef.eatRate, 0, 1)
    };
  }

  updatedTile = {
    ...updatedTile,
    fauna: updatedFauna
  };

  return { tile: updatedTile, fauna: updatedFauna };
};

const applyShade = (world: World, definitions: DefinitionSet): World => {
  const tiles = world.tiles.map((tile) => ({
    ...tile,
    shade: 0
  }));

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const index = getIndex(world, x, y);
      const tile = world.tiles[index];
      if (!tile.flora) {
        continue;
      }

      const floraDef = definitions.flora[tile.flora.id];
      if (!floraDef || floraDef.shadeRadius <= 0) {
        continue;
      }
      const radius = Math.max(1, Math.round(floraDef.shadeRadius * tile.flora.growth));
      const growth = clamp(tile.flora.growth, 0, 1);

      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (!isInBounds(world, nx, ny)) {
            continue;
          }
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > radius) {
            continue;
          }
          const shadeValue = clamp(growth * (1 - distance / (radius + 1)), 0, 1);
          const targetIndex = getIndex(world, nx, ny);
          const target = tiles[targetIndex];

          if (shadeValue > target.shade) {
            tiles[targetIndex] = {
              ...target,
              shade: shadeValue
            };
          }
        }
      }
    }
  }

  return {
    ...world,
    tiles
  };
};

export const ecosystemRules: RuleSet = {
  id: "ecosystem",
  name: "Ecosystem",
  step: (world, context) => {
    const isDay = context.time.phase === "day";
    const nextTiles: Tile[] = [];

    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const index = getIndex(world, x, y);
        const tile = world.tiles[index];
        const terrain = context.definitions.terrains[tile.terrainId];
        const soil = decaySoil(tile.soil);
        let flora: FloraState | undefined;
        if (tile.flora) {
          const floraDef = context.definitions.flora[tile.flora.id];
          if (!floraDef) {
            throw new Error(`Missing flora definition: ${tile.flora.id}`);
          }
          flora = updateFloraState(tile.flora, floraDef, terrain.fertility, tile.shade, isDay, soil);
        }

        nextTiles.push({
          terrainId: tile.terrainId,
          flora,
          fauna: undefined,
          shade: 0,
          soil
        });
      }
    }

    const intents: Intent[] = [];

    for (let y = 0; y < world.height; y += 1) {
      for (let x = 0; x < world.width; x += 1) {
        const index = getIndex(world, x, y);
        const tile = world.tiles[index];

        if (!tile.fauna) {
          continue;
        }

        const faunaDef = context.definitions.fauna[tile.fauna.id];
        if (!faunaDef) {
          throw new Error(`Missing fauna definition: ${tile.fauna.id}`);
        }
        const updated = updateFaunaVitals(tile.fauna, faunaDef);
        if (!updated) {
          const target = nextTiles[index];
          nextTiles[index] = {
            ...target,
            soil: applyDecomposition(target.soil, faunaDef)
          };
          continue;
        }

        const selection = selectDestination(world, x, y, faunaDef, context.definitions);

        intents.push({
          sourceIndex: index,
          destIndex: selection.destIndex,
          score: selection.score,
          fauna: updated,
          faunaDef
        });
      }
    }

    const resolved = resolveIntents(intents, context.definitions);
    const occupied = new Set<number>();
    const winners = new Set<Intent>();

    for (const [destIndex, resolution] of resolved.entries()) {
      const { intent } = resolution;
      const tile = nextTiles[destIndex];
      const applied = applyFaunaToTile(tile, intent.fauna, intent.faunaDef, resolution.didEat, context.definitions);
      nextTiles[destIndex] = applied.tile;
      occupied.add(destIndex);
      winners.add(intent);
    }

    for (const intent of intents) {
      if (winners.has(intent)) {
        continue;
      }
      if (occupied.has(intent.sourceIndex)) {
        continue;
      }
      const tile = nextTiles[intent.sourceIndex];
      const applied = applyFaunaToTile(tile, intent.fauna, intent.faunaDef, false, context.definitions);
      nextTiles[intent.sourceIndex] = applied.tile;
      occupied.add(intent.sourceIndex);
    }

    const updatedWorld: World = {
      width: world.width,
      height: world.height,
      tick: world.tick + 1,
      tiles: nextTiles
    };

    return applyShade(updatedWorld, context.definitions);
  }
};
