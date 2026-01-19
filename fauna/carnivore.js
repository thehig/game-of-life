export const createCarnivoreState = (overrides = {}) => ({
  energy: 0,
  hunger: 0,
  diet: ["herbivore"],
  ...overrides
});
