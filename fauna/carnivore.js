const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const createCarnivoreState = (overrides = {}) => ({
  energy: 0.5,
  hunger: 0.2,
  diet: ["herbivore"],
  efficiency: 0.9,
  ...overrides
});

export const canCarnivoreEat = (food) => food.type === "herbivore";

export const eatCarnivore = (state, food) => {
  if (!canCarnivoreEat(food)) return { ...state, ate: false };
  const energyGain = (food.energy ?? 0.4) * state.efficiency;
  return {
    ...state,
    ate: true,
    energy: clamp(state.energy + energyGain, 0, 1),
    hunger: clamp(state.hunger - (food.satiety ?? 0.4), 0, 1)
  };
};
