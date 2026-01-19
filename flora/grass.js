const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clamp01 = (value) => clamp(value, 0, 1);

export const grassModel = {
  id: "grass"
};

export const createGrassConfig = (overrides = {}) => ({
  maxHeight: 1,
  spreadHeight: 0.6,
  baseGrowthRate: 0.04,
  nightPenalty: 0.35,
  shadePenalty: 0.5,
  energyRate: 0.03,
  maintenanceCost: 0.005,
  spreadEnergyCost: 0.2,
  spreadDensity: 0.6,
  ringBandHeight: 0.35,
  ...overrides
});

export const createGrassState = (overrides = {}) => ({
  height: 0,
  energy: 0.3,
  age: 0,
  seed: 7,
  ...overrides
});

export const getEffectiveLight = (env, config) => {
  const sunlight = clamp01(env.sunlight ?? 1);
  const dayFactor = env.isDay === false ? config.nightPenalty : 1;
  const shadeFactor = env.isShaded ? config.shadePenalty : 1;
  return clamp01(sunlight * dayFactor * shadeFactor);
};

export const growGrass = (state, env, config = createGrassConfig()) => {
  const effectiveLight = getEffectiveLight(env, config);
  const heightFactor = 1 - state.height / config.maxHeight;
  const growthDelta = config.baseGrowthRate * effectiveLight * Math.max(0, heightFactor);
  const energyDelta = config.energyRate * effectiveLight - config.maintenanceCost;
  return {
    ...state,
    height: clamp(state.height + growthDelta, 0, config.maxHeight),
    energy: clamp(state.energy + energyDelta, 0, 1),
    age: state.age + 1
  };
};

export const shouldSpread = (state, config = createGrassConfig()) =>
  state.height >= config.spreadHeight && state.energy >= config.spreadEnergyCost;

export const getRingOffsets = (radius) => {
  if (radius <= 0) return [];
  const offsets = [];
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      const isEdge = Math.max(Math.abs(dx), Math.abs(dy)) === radius;
      if (isEdge && !(dx === 0 && dy === 0)) {
        offsets.push({ x: dx, y: dy });
      }
    }
  }
  return offsets;
};

export const calculateSpreadTargets = (state, config = createGrassConfig()) => {
  if (!shouldSpread(state, config)) return [];
  const radius = Math.max(1, Math.floor(state.height / config.ringBandHeight));
  const ring = getRingOffsets(radius);
  const density = clamp01(config.spreadDensity);
  const threshold = Math.floor(density * 100);
  const seed = Math.floor(state.seed ?? 1);
  const selected = [];

  for (let i = 0; i < ring.length; i += 1) {
    const roll = (seed * 31 + i * 17) % 100;
    if (roll < threshold) {
      selected.push(ring[i]);
    }
  }

  if (!selected.length && ring.length) {
    selected.push(ring[seed % ring.length]);
  }

  return selected;
};

export const spreadGrass = (state, config = createGrassConfig()) => {
  const targets = calculateSpreadTargets(state, config);
  if (!targets.length) return { state, targets };
  return {
    state: { ...state, energy: clamp(state.energy - config.spreadEnergyCost, 0, 1) },
    targets
  };
};

export const advanceGrass = (state, env, config = createGrassConfig()) => {
  const grown = growGrass(state, env, config);
  const spread = spreadGrass(grown, config);
  return { state: spread.state, targets: spread.targets };
};
