export const createMoverState = (overrides = {}) => ({
  position: { x: 0, y: 0 },
  energy: 0,
  speed: 0,
  medium: "land",
  ...overrides
});
