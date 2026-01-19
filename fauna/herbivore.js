export const createHerbivoreState = (overrides = {}) => ({
  energy: 0,
  hunger: 0,
  diet: ["grass"],
  ...overrides
});
