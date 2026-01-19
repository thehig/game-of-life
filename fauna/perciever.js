export const createPercieverState = (overrides = {}) => ({
  tags: new Map(),
  behaviors: new Map(),
  range: 1,
  ...overrides
});
