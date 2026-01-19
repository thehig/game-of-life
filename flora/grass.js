export const grassModel = {
  id: "grass"
};

export const createGrassState = (overrides = {}) => ({
  height: 0,
  energy: 0,
  sunlight: 1,
  isShaded: false,
  ...overrides
});
