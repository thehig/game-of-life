const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clamp01 = (value) => clamp(value, 0, 1);

export const treeModel = {
  id: "tree"
};

export const treeSpecies = {
  fastWeak: {
    id: "fastWeak",
    growthRate: 0.02,
    maxHeight: 10,
    strength: 0.35,
    shadePerHeight: 0.35,
    deathAge: 60,
    corpseDecayRate: 0.08
  },
  slowStrong: {
    id: "slowStrong",
    growthRate: 0.008,
    maxHeight: 18,
    strength: 0.85,
    shadePerHeight: 0.6,
    deathAge: 140,
    corpseDecayRate: 0.04
  }
};

export const createTreeState = (overrides = {}) => ({
  height: 0,
  age: 0,
  isAlive: true,
  speciesId: "fastWeak",
  corpse: null,
  ...overrides
});

export const getTreeSpecies = (state, overrides) => {
  if (overrides) return overrides;
  return treeSpecies[state.speciesId] ?? treeSpecies.fastWeak;
};

export const getShadeRadius = (height, species) => {
  const radius = height * species.shadePerHeight;
  return Math.max(0, radius);
};

export const growTree = (state, env, speciesOverride, years = 1) => {
  const species = getTreeSpecies(state, speciesOverride);
  if (!state.isAlive) return state;
  const sunlight = clamp01(env.sunlight ?? 1);
  const shadeFactor = env.isShaded ? 0.6 : 1;
  const heightFactor = 1 - state.height / species.maxHeight;
  const growthDelta = species.growthRate * sunlight * shadeFactor * Math.max(0, heightFactor) * years;
  const height = clamp(state.height + growthDelta, 0, species.maxHeight);
  const age = state.age + years;
  const isAlive = age < species.deathAge;
  return { ...state, height, age, isAlive };
};

export const createTreeCorpse = (state, speciesOverride) => {
  const species = getTreeSpecies(state, speciesOverride);
  const height = Math.max(0, state.height);
  return {
    length: height * (0.8 + species.strength * 0.4),
    mass: height * (0.9 + species.strength * 0.5),
    age: 0,
    decayRate: species.corpseDecayRate
  };
};

export const killTree = (state, speciesOverride) => ({
  ...state,
  isAlive: false,
  corpse: createTreeCorpse(state, speciesOverride)
});

export const decayCorpse = (corpse, years = 1) => {
  const decay = corpse.mass * corpse.decayRate * years;
  const nextMass = Math.max(0, corpse.mass - decay);
  const soilGain = decay * 0.6;
  const grassGain = decay * 0.4;
  return {
    corpse: { ...corpse, mass: nextMass, age: corpse.age + years },
    soilGain,
    grassGain
  };
};
