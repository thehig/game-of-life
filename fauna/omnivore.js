const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const defaultEdible = ["grass", "herbivore", "tree_leaves", "carnivore"];

export const createOmnivoreState = (overrides = {}) => ({
  energy: 0.5,
  hunger: 0.2,
  diet: [...defaultEdible],
  ...overrides
});

export const canOmnivoreEat = (state, food) => {
  if (food.edible === false) return false;
  if (food.edible === true) return true;
  return state.diet.includes(food.type);
};

export const eatOmnivore = (state, food) => {
  if (!canOmnivoreEat(state, food)) return { ...state, ate: false };
  const energyGain = food.energy ?? 0.3;
  return {
    ...state,
    ate: true,
    energy: clamp(state.energy + energyGain, 0, 1),
    hunger: clamp(state.hunger - (food.satiety ?? 0.3), 0, 1)
  };
};

export const chooseBestFood = (state, foods) => {
  const edible = foods.filter((food) => canOmnivoreEat(state, food));
  if (!edible.length) return null;
  return edible.reduce((best, current) => (current.energy ?? 0) > (best.energy ?? 0) ? current : best);
};
