import { createMovementProfile } from "./mover.js";
import {
  createBodyShape,
  createGuardState,
  createHerdState,
  createPackState,
  createSnakeState
} from "./behaviors.js";

const landMover = createMovementProfile({
  allowedMedia: ["land", "grass", "sand", "shade"],
  mediaCosts: { land: 1, grass: 1.1, sand: 1.4, shade: 1 }
});

const swimmer = createMovementProfile({
  allowedMedia: ["water", "land", "mud"],
  mediaCosts: { water: 0.8, land: 1.6, mud: 2.4 }
});

const flyer = createMovementProfile({
  allowedMedia: ["air", "land"],
  mediaCosts: { air: 0.6, land: 1.2 }
});

const amphibious = createMovementProfile({
  allowedMedia: ["land", "water", "mud"],
  mediaCosts: { land: 1, water: 1.1, mud: 1.5 }
});

export const faunaSamples = [
  {
    id: "sheep",
    kind: "herbivore",
    diet: ["grass", "clover"],
    size: { width: 1, height: 1 },
    movementProfile: landMover,
    behaviors: { herd: createHerdState({ cohesion: 0.7 }) }
  },
  {
    id: "wolf",
    kind: "carnivore",
    diet: ["sheep", "deer", "rabbit"],
    size: { width: 1, height: 1 },
    movementProfile: landMover,
    behaviors: { pack: createPackState({ aggression: 0.85 }) }
  },
  {
    id: "sheepdog",
    kind: "guardian",
    diet: ["meat"],
    size: { width: 1, height: 1 },
    movementProfile: landMover,
    behaviors: { guard: createGuardState({ alertRadius: 7 }) }
  },
  {
    id: "rabbit",
    kind: "herbivore",
    diet: ["grass", "clover"],
    size: { width: 1, height: 1 },
    movementProfile: landMover,
    behaviors: { burrow: true, jitter: 0.3 }
  },
  {
    id: "deer",
    kind: "herbivore",
    diet: ["grass", "berry_bush"],
    size: { width: 1, height: 1 },
    movementProfile: landMover,
    behaviors: { herd: createHerdState({ cohesion: 0.5 }), leap: 0.8 }
  },
  {
    id: "boar",
    kind: "omnivore",
    diet: ["grass", "mushroom"],
    size: { width: 1, height: 1 },
    movementProfile: landMover,
    behaviors: { charge: 0.9, territorial: true }
  },
  {
    id: "bear",
    kind: "omnivore",
    diet: ["berry_bush", "fish", "rabbit"],
    size: { width: 2, height: 2 },
    bodyShape: createBodyShape(2, 2),
    movementProfile: landMover,
    behaviors: { hibernate: true, intimidation: 0.8 }
  },
  {
    id: "fox",
    kind: "omnivore",
    diet: ["rabbit", "berry_bush"],
    size: { width: 1, height: 1 },
    movementProfile: landMover,
    behaviors: { stealth: 0.6, scavenger: true }
  },
  {
    id: "owl",
    kind: "carnivore",
    diet: ["rabbit", "mouse"],
    size: { width: 1, height: 1 },
    movementProfile: flyer,
    behaviors: { nocturnal: true, silentFlight: true }
  },
  {
    id: "hawk",
    kind: "carnivore",
    diet: ["rabbit", "snake"],
    size: { width: 1, height: 1 },
    movementProfile: flyer,
    behaviors: { dive: 0.9, visionRange: 6 }
  },
  {
    id: "snake",
    kind: "carnivore",
    diet: ["rabbit", "frog"],
    size: { width: 1, height: 1 },
    movementProfile: landMover,
    behaviors: { serpentine: createSnakeState({ maxLength: 7 }), venom: 0.4 }
  },
  {
    id: "horse",
    kind: "herbivore",
    diet: ["grass"],
    size: { width: 2, height: 3 },
    bodyShape: createBodyShape(2, 3),
    movementProfile: landMover,
    behaviors: { herd: createHerdState({ cohesion: 0.6 }), sprint: 0.9 }
  },
  {
    id: "trex",
    kind: "carnivore",
    diet: ["deer", "horse"],
    size: { width: 3, height: 8 },
    bodyShape: createBodyShape(3, 8),
    movementProfile: landMover,
    behaviors: { apex: true, intimidation: 0.95 }
  },
  {
    id: "fish",
    kind: "omnivore",
    diet: ["algae", "insect"],
    size: { width: 1, height: 1 },
    movementProfile: swimmer,
    behaviors: { school: true, swimSpeed: 0.8 }
  },
  {
    id: "frog",
    kind: "insectivore",
    diet: ["insect"],
    size: { width: 1, height: 1 },
    movementProfile: amphibious,
    behaviors: { amphibious: true, jump: 0.6 }
  },
  {
    id: "turtle",
    kind: "herbivore",
    diet: ["grass", "algae"],
    size: { width: 2, height: 2 },
    bodyShape: createBodyShape(2, 2),
    movementProfile: amphibious,
    behaviors: { armor: 0.9, slow: true }
  },
  {
    id: "ant",
    kind: "omnivore",
    diet: ["fungus", "berry_bush"],
    size: { width: 1, height: 1 },
    movementProfile: landMover,
    behaviors: { swarm: true, carryStrength: 0.6 }
  },
  {
    id: "bee",
    kind: "pollinator",
    diet: ["nectar"],
    size: { width: 1, height: 1 },
    movementProfile: flyer,
    behaviors: { pollinate: true, hive: true }
  }
];

export const getFaunaSample = (id) => faunaSamples.find((sample) => sample.id === id) ?? null;
