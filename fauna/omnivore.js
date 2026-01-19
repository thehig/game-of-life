export const createOmnivoreState = (overrides = {}) => ({
  energy: 0,
  hunger: 0,
  diet: ["grass", "herbivore", "tree_leaves"],
  ...overrides
});
