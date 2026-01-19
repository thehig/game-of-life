export const treeModel = {
  id: "tree"
};

export const createTreeState = (overrides = {}) => ({
  height: 0,
  age: 0,
  isAlive: true,
  ...overrides
});
