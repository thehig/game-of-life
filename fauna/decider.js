const defaultPreferences = () => ({
  seekTags: [],
  avoidTags: [],
  eatTags: [],
  weights: { seek: 2, avoid: -3, eat: 5 }
});

export const createDeciderState = (overrides = {}) => ({
  intents: [],
  preferences: defaultPreferences(),
  ...overrides
});

const scoreEntity = (entity, preferences) => {
  let score = 0;
  for (const tag of entity.tags ?? []) {
    if (preferences.seekTags.includes(tag)) score += preferences.weights.seek;
    if (preferences.avoidTags.includes(tag)) score += preferences.weights.avoid;
    if (preferences.eatTags.includes(tag)) score += preferences.weights.eat;
  }
  return score;
};

const vectorToward = (selfPosition, targetPosition) => ({
  dx: Math.sign(targetPosition.x - selfPosition.x),
  dy: Math.sign(targetPosition.y - selfPosition.y)
});

export const decideAction = ({ selfPosition, perceived, preferences }) => {
  if (!perceived.length) return { kind: "idle" };

  const eatable = perceived
    .filter((entity) => (entity.tags ?? []).some((tag) => preferences.eatTags.includes(tag)))
    .sort((a, b) => a.distance - b.distance);
  if (eatable.length) {
    return { kind: "eat", targetId: eatable[0].id };
  }

  const scored = perceived
    .map((entity) => ({ entity, score: scoreEntity(entity, preferences) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score === 0) return { kind: "idle" };

  if (best.score > 0) {
    return {
      kind: "move",
      targetId: best.entity.id,
      vector: vectorToward(selfPosition, best.entity.position)
    };
  }

  return {
    kind: "flee",
    targetId: best.entity.id,
    vector: vectorToward(best.entity.position, selfPosition)
  };
};
