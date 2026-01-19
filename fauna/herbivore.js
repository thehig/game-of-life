const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const createHerbivoreState = (overrides = {}) => ({
  energy: 0.4,
  hunger: 0.2,
  diet: ["grass"],
  canEatLeaves: false,
  minLeafHeight: 3,
  ...overrides
});

export const canHerbivoreEat = (state, food) => {
  if (food.type === "grass") return true;
  if (food.type === "tree") return false;
  if (food.type === "tree_leaves") {
    if (!state.canEatLeaves) return false;
    const height = food.treeHeight ?? 0;
    return height >= state.minLeafHeight;
  }
  return false;
};

export const eatHerbivore = (state, food) => {
  if (!canHerbivoreEat(state, food)) return { ...state, ate: false };
  const energyGain = food.energy ?? 0.2;
  const hungerRelief = food.satiety ?? 0.3;
  return {
    ...state,
    ate: true,
    energy: clamp(state.energy + energyGain, 0, 1),
    hunger: clamp(state.hunger - hungerRelief, 0, 1)
  };
};

export const tickHerbivore = (state, delta = 1) => {
  const hunger = clamp(state.hunger + 0.05 * delta, 0, 1);
  const energy = clamp(state.energy - 0.03 * delta, 0, 1);
  return {
    ...state,
    hunger,
    energy,
    isStarving: hunger >= 1 || energy <= 0
  };
};
