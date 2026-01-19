import { CameraState, WorldLayers } from "./types.js";

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const clampCameraToWorld = (camera: CameraState, world: WorldLayers): CameraState => {
  const maxX = Math.max(0, world.width - Math.max(1, camera.viewportWidth));
  const maxY = Math.max(0, world.height - Math.max(1, camera.viewportHeight));
  return {
    ...camera,
    x: clamp(camera.x, 0, maxX),
    y: clamp(camera.y, 0, maxY),
    zoom: clamp(camera.zoom, 0.25, 6)
  };
};

