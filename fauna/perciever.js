const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeMap = (value) => {
  if (value instanceof Map) return value;
  if (value && typeof value === "object") {
    return new Map(Object.entries(value));
  }
  return new Map();
};

export const createPercieverState = (overrides = {}) => ({
  range: 1,
  ...overrides,
  tags: normalizeMap(overrides.tags),
  behaviors: normalizeMap(overrides.behaviors)
});

export const observeEntities = (perciever, selfPosition, entities) => {
  const range = clamp(perciever.range ?? 0, 0, Number.POSITIVE_INFINITY);
  const tags = normalizeMap(perciever.tags);
  const behaviors = normalizeMap(perciever.behaviors);
  const observations = [];

  for (const entity of entities) {
    const dx = entity.position.x - selfPosition.x;
    const dy = entity.position.y - selfPosition.y;
    const distance = Math.hypot(dx, dy);
    if (distance > range) continue;
    observations.push({
      id: entity.id,
      type: entity.type,
      position: entity.position,
      distance,
      tags: Array.from(tags.get(entity.type) ?? []),
      behaviors: Array.from(behaviors.get(entity.type) ?? [])
    });
  }

  return observations;
};
