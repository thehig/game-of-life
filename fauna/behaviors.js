const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const vectorToward = (from, to) => ({
  dx: Math.sign(to.x - from.x),
  dy: Math.sign(to.y - from.y)
});

const vectorAway = (from, threat) => ({
  dx: Math.sign(from.x - threat.x),
  dy: Math.sign(from.y - threat.y)
});

export const createHerdState = (overrides = {}) => ({
  cohesion: 0.6,
  spacing: 2,
  threatRadius: 4,
  ...overrides
});

export const getHerdCenter = (positions) => {
  if (!positions.length) return null;
  const totals = positions.reduce(
    (acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y }),
    { x: 0, y: 0 }
  );
  return { x: totals.x / positions.length, y: totals.y / positions.length };
};

export const chooseHerdMove = (selfPosition, herdPositions, predators, herdState) => {
  const center = getHerdCenter(herdPositions);
  if (!center) return { kind: "hold", vector: { dx: 0, dy: 0 } };
  const nearestThreat = predators.find((predator) => distance(predator.position, center) <= herdState.threatRadius);
  if (nearestThreat) {
    return { kind: "flee", vector: vectorAway(selfPosition, nearestThreat.position) };
  }
  const distToCenter = distance(selfPosition, center);
  if (distToCenter <= herdState.spacing) {
    return { kind: "hold", vector: { dx: 0, dy: 0 } };
  }
  return { kind: "cohere", vector: vectorToward(selfPosition, center) };
};

export const createPackState = (overrides = {}) => ({
  aggression: 0.7,
  focusDistance: 6,
  ...overrides
});

export const choosePackTarget = (packState, preyList) => {
  if (!preyList.length) return null;
  return preyList.reduce((best, prey) => {
    const distanceScore = clamp(packState.focusDistance - prey.distance, 0, packState.focusDistance);
    const energyScore = 1 - (prey.energy ?? 0.5);
    const score = distanceScore + energyScore;
    if (!best || score > best.score) {
      return { prey, score };
    }
    return best;
  }, null).prey;
};

export const createGuardState = (overrides = {}) => ({
  alertRadius: 6,
  ...overrides
});

export const guardHerd = (guardianPosition, herdPositions, predators, guardState) => {
  const center = getHerdCenter(herdPositions);
  if (!center) return { kind: "hold", vector: { dx: 0, dy: 0 } };
  const threat = predators.find((predator) => distance(predator.position, center) <= guardState.alertRadius);
  if (threat) {
    return { kind: "intercept", targetId: threat.id, vector: vectorToward(guardianPosition, threat.position) };
  }
  return { kind: "patrol", vector: vectorToward(guardianPosition, center) };
};

export const createSnakeState = (overrides = {}) => ({
  segments: [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -2, y: 0 }],
  maxLength: 5,
  direction: { x: 1, y: 0 },
  ...overrides
});

export const moveSnake = (state, direction, grow = false) => {
  const head = state.segments[0];
  const nextDirection = direction ?? state.direction;
  const nextHead = { x: head.x + nextDirection.x, y: head.y + nextDirection.y };
  const nextSegments = [nextHead, ...state.segments];
  let trail = null;
  if (!grow && nextSegments.length > 1) {
    trail = nextSegments.pop();
  } else if (nextSegments.length > state.maxLength) {
    trail = nextSegments.pop();
  }
  return {
    ...state,
    segments: nextSegments,
    direction: nextDirection,
    trail
  };
};

export const growSnake = (state, amount = 1) => ({
  ...state,
  maxLength: state.maxLength + Math.max(0, amount)
});

export const createBodyShape = (width, height) => {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const offsets = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      offsets.push({ x, y });
    }
  }
  return { width: w, height: h, offsets };
};

export const getOccupiedCells = (position, shape) =>
  shape.offsets.map((offset) => ({
    x: position.x + offset.x,
    y: position.y + offset.y
  }));

export const moveBody = (position, vector) => ({
  x: position.x + vector.dx,
  y: position.y + vector.dy
});
