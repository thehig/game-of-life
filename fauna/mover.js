const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeSet = (value, fallback) => {
  if (value instanceof Set) return value;
  if (Array.isArray(value)) return new Set(value);
  return new Set(fallback);
};

export const createMovementProfile = (overrides = {}) => {
  const base = {
    baseCost: 1,
    speedCost: 0.25,
    mediaCosts: {
      land: 1,
      grass: 1.1,
      sand: 1.4,
      water: 2.2,
      mud: 3.5,
      shade: 1
    },
    allowedMedia: new Set(["land", "grass", "sand", "shade"]),
    requiresShade: false
  };
  const allowedMedia = normalizeSet(overrides.allowedMedia ?? base.allowedMedia, base.allowedMedia);
  return {
    ...base,
    ...overrides,
    allowedMedia
  };
};

export const createMoverState = (overrides = {}) => ({
  position: { x: 0, y: 0 },
  energy: 0,
  speed: 0,
  medium: "land",
  ...overrides
});

export const canTraverseMedium = (profile, medium) => {
  const allowed = normalizeSet(profile.allowedMedia, []);
  return allowed.has(medium);
};

export const isShadePath = (path) => {
  if (!Array.isArray(path) || path.length === 0) return false;
  return path.every((node) => node.isShaded);
};

export const calculateMoveCost = ({ distance, speed, medium, profile }) => {
  const mediaCost = profile.mediaCosts[medium] ?? profile.mediaCosts.default ?? 1;
  const speedMultiplier = 1 + speed * profile.speedCost;
  return distance * profile.baseCost * mediaCost * speedMultiplier;
};

export const attemptMove = (state, toPosition, env, profile) => {
  const medium = env.medium ?? state.medium;
  if (!canTraverseMedium(profile, medium)) {
    return { moved: false, cost: 0, state };
  }
  if (profile.requiresShade && !isShadePath(env.path)) {
    return { moved: false, cost: 0, state };
  }
  const dx = toPosition.x - state.position.x;
  const dy = toPosition.y - state.position.y;
  const distance = Math.hypot(dx, dy);
  const speed = env.speed ?? state.speed;
  const cost = calculateMoveCost({ distance, speed, medium, profile });
  if (cost > state.energy) {
    return { moved: false, cost, state };
  }
  const nextEnergy = clamp(state.energy - cost, 0, Number.POSITIVE_INFINITY);
  return {
    moved: true,
    cost,
    state: { ...state, position: { ...toPosition }, energy: nextEnergy, medium }
  };
};
