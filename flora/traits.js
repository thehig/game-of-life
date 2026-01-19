import { getRingOffsets } from "./grass.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clamp01 = (value) => clamp(value, 0, 1);

export const seasonalGrowthMultiplier = (seasonalProfile, season) => {
  const profile = seasonalProfile ?? "evergreen";
  const seasonal = {
    spring: profile === "dormant" ? 0.6 : 1.2,
    summer: profile === "dormant" ? 0.3 : 1,
    fall: profile === "dormant" ? 0.4 : 0.7,
    winter: profile === "evergreen" ? 0.6 : profile === "dormant" ? 0.1 : 0.2
  };
  return seasonal[season] ?? 1;
};

export const createFlowerProfile = (overrides = {}) => ({
  budRate: 0.4,
  bloomThreshold: 3,
  nectarPerBloom: 0.6,
  nectarCap: 6,
  seedPerVisit: 2,
  nectarPerVisit: 0.4,
  ...overrides
});

export const createFlowerState = (overrides = {}) => ({
  buds: 0,
  blooms: 0,
  nectar: 0,
  seeds: 0,
  age: 0,
  ...overrides
});

export const pollinateFlower = (state, visits, profile) => {
  const cappedVisits = Math.max(0, visits);
  const seedGain = cappedVisits * profile.seedPerVisit;
  const nectarUse = cappedVisits * profile.nectarPerVisit;
  return {
    ...state,
    seeds: state.seeds + seedGain,
    nectar: clamp(state.nectar - nectarUse, 0, profile.nectarCap)
  };
};

export const advanceFlower = (state, env, profile = createFlowerProfile()) => {
  const sunlight = clamp01(env.sunlight ?? 1);
  const seasonFactor = seasonalGrowthMultiplier(env.seasonalProfile, env.season);
  const budGain = sunlight * seasonFactor * profile.budRate;
  let buds = state.buds + budGain;
  let blooms = state.blooms;

  if (buds >= profile.bloomThreshold) {
    const newBlooms = Math.floor(buds / profile.bloomThreshold);
    buds -= newBlooms * profile.bloomThreshold;
    blooms += newBlooms;
  }

  const nectar = clamp(blooms * profile.nectarPerBloom * sunlight, 0, profile.nectarCap);
  let next = { ...state, buds, blooms, nectar, age: state.age + 1 };

  if ((env.pollinatorVisits ?? 0) > 0) {
    next = pollinateFlower(next, env.pollinatorVisits, profile);
  }

  return next;
};

export const createVineProfile = (overrides = {}) => ({
  climbRate: 0.6,
  maxHeight: 8,
  gripStrength: 0.4,
  ...overrides
});

export const createVineState = (overrides = {}) => ({
  height: 0,
  grip: 0,
  ...overrides
});

export const climbSupport = (state, supportHeight, profile = createVineProfile()) => {
  const target = Math.min(profile.maxHeight, supportHeight);
  const height = clamp(state.height + profile.climbRate, 0, target);
  const grip = clamp01(state.grip + profile.gripStrength * 0.1);
  return { ...state, height, grip };
};

export const createFungusProfile = (overrides = {}) => ({
  sporeRadius: 2,
  spreadDensity: 0.5,
  moistureSensitivity: 0.8,
  ...overrides
});

export const createFungusState = (overrides = {}) => ({
  biomass: 0.4,
  moisture: 0.6,
  sporeBank: 0,
  ...overrides
});

export const spreadSpores = (state, env, profile = createFungusProfile()) => {
  const moisture = clamp01(env.moisture ?? state.moisture ?? 0.5);
  const ring = getRingOffsets(profile.sporeRadius);
  const density = clamp01(profile.spreadDensity * (1 - profile.moistureSensitivity + moisture));
  const threshold = Math.floor(density * 100);
  const targets = [];
  for (let i = 0; i < ring.length; i += 1) {
    const roll = (i * 19 + Math.floor(moisture * 100)) % 100;
    if (roll < threshold) targets.push(ring[i]);
  }
  return {
    state: { ...state, sporeBank: state.sporeBank + targets.length },
    targets
  };
};

export const createCactusProfile = (overrides = {}) => ({
  waterCapacity: 1,
  droughtTolerance: 0.8,
  ...overrides
});

export const createCactusState = (overrides = {}) => ({
  waterStorage: 0.6,
  health: 1,
  ...overrides
});

export const surviveDrought = (state, env, profile = createCactusProfile()) => {
  const moisture = clamp01(env.moisture ?? 0);
  const drain = (1 - moisture) * (1 - profile.droughtTolerance) * 0.2;
  const waterStorage = clamp(state.waterStorage - drain, 0, profile.waterCapacity);
  const healthPenalty = waterStorage === 0 ? 0.05 : 0;
  return {
    ...state,
    waterStorage,
    health: clamp01(state.health - healthPenalty)
  };
};
