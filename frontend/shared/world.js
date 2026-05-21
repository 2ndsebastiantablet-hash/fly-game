import { createDefaultWorldGeometries } from "./world-builders.js";

export const MAP_IDS = Object.freeze({
  neighborhood: "neighborhood",
  forest: "forest",
  city: "city",
  haven: "haven",
});

export const FLYS_WORLD_MAPS = Object.freeze([
  Object.freeze({ id: MAP_IDS.neighborhood, label: "Neighborhood" }),
  Object.freeze({ id: MAP_IDS.forest, label: "Forest" }),
  Object.freeze({ id: MAP_IDS.city, label: "City" }),
  Object.freeze({ id: MAP_IDS.haven, label: "Haven" }),
]);

export const WORLD_CONSTANTS = Object.freeze({
  chunkSize: 80,
  halfChunk: 40,
  roadHalfWidth: 6,
  sidewalkWidth: 4,
  neighborhoodChunkRadius: 7,
  forestOuterChunkRadius: 13,
  cityChunkRadius: 3,
});

export const CITY_DIRECTIONS = Object.freeze([
  Object.freeze({ name: "east", x: 1, z: 0 }),
  Object.freeze({ name: "west", x: -1, z: 0 }),
  Object.freeze({ name: "south", x: 0, z: 1 }),
  Object.freeze({ name: "north", x: 0, z: -1 }),
]);

export function hash2(x, z) {
  let seed = Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  seed = (seed ^ (seed >>> 13)) >>> 0;
  seed = Math.imul(seed, 1274126177) >>> 0;
  return seed >>> 0;
}

export const CITY_DIRECTION = Object.freeze({ ...CITY_DIRECTIONS[hash2(91, 17) % CITY_DIRECTIONS.length] });
export const CITY_AXIS_CENTER = WORLD_CONSTANTS.forestOuterChunkRadius + WORLD_CONSTANTS.cityChunkRadius + 3;
export const CITY_CENTER_CHUNK = Object.freeze({
  x: CITY_DIRECTION.x * CITY_AXIS_CENTER,
  z: CITY_DIRECTION.z * CITY_AXIS_CENTER,
});

export const HAVEN_LAYOUT = Object.freeze({
  origin: Object.freeze({ x: 0, y: 165, z: -2600 }),
  bounds: Object.freeze({ minX: -340, maxX: 340, minY: 122, maxY: 250, minZ: -2840, maxZ: -2360 }),
  spawn: Object.freeze({ x: 0, y: 171, z: -2600, yaw: 0, pitch: -0.06, roll: 0 }),
  cloudPortal: Object.freeze({ x: -86, y: 43, z: -118, radius: 18 }),
});

export const WORLD_SPAWN_STATE = Object.freeze({ x: 0, y: 3.8, z: 0, yaw: 0, pitch: -0.1, roll: 0 });
export const HAVEN_SPAWN_STATE = Object.freeze({ ...HAVEN_LAYOUT.spawn });

export const ATMOSPHERE_PROFILES = Object.freeze({
  neighborhood: Object.freeze({
    background: 0xa7cdfd,
    fog: 0xa7cdfd,
    fogNear: 120,
    fogFar: 360,
    hemi: 1.55,
    sun: 2.1,
    fill: 0.35,
    shadow: 0.12,
    cloudsVisible: true,
  }),
  city: Object.freeze({
    background: 0xb8c3d1,
    fog: 0xb6c1cf,
    fogNear: 110,
    fogFar: 300,
    hemi: 1.25,
    sun: 1.72,
    fill: 0.28,
    shadow: 0.16,
    cloudsVisible: true,
  }),
  cityConnector: Object.freeze({
    background: 0x6b7078,
    fog: 0x60656d,
    fogNear: 70,
    fogFar: 210,
    hemi: 0.7,
    sun: 0.65,
    fill: 0.12,
    shadow: 0.18,
    cloudsVisible: false,
  }),
  forest: Object.freeze({
    background: 0x0b130d,
    fog: 0x0d1710,
    fogNear: 26,
    fogFar: 120,
    hemi: 0.36,
    sun: 0.18,
    fill: 0.06,
    shadow: 0.18,
    cloudsVisible: false,
  }),
  haven: Object.freeze({
    background: 0xd7cbff,
    fog: 0xdccfff,
    fogNear: 130,
    fogFar: 520,
    hemi: 1.38,
    sun: 1.35,
    fill: 0.62,
    shadow: 0.08,
    cloudsVisible: false,
  }),
  outside: Object.freeze({
    background: 0x050707,
    fog: 0x070a08,
    fogNear: 16,
    fogFar: 90,
    hemi: 0.18,
    sun: 0.05,
    fill: 0.02,
    shadow: 0.2,
    cloudsVisible: false,
  }),
});

export function getChunkCoord(value) {
  return Math.floor((value + WORLD_CONSTANTS.chunkSize / 2) / WORLD_CONSTANTS.chunkSize);
}

export function getChunkRingDistance(cx, cz) {
  return Math.max(Math.abs(cx), Math.abs(cz));
}

export function getCityAxisChunk(cx, cz) {
  return CITY_DIRECTION.x !== 0 ? cx * CITY_DIRECTION.x : cz * CITY_DIRECTION.z;
}

export function getCityLateralChunk(cx, cz) {
  return CITY_DIRECTION.x !== 0 ? cz : cx;
}

export function isCityChunk(cx, cz) {
  return (
    Math.abs(getCityAxisChunk(cx, cz) - CITY_AXIS_CENTER) <= WORLD_CONSTANTS.cityChunkRadius &&
    Math.abs(getCityLateralChunk(cx, cz)) <= WORLD_CONSTANTS.cityChunkRadius + 1
  );
}

export function isCityConnectorChunk(cx, cz) {
  const axis = getCityAxisChunk(cx, cz);
  const lateral = getCityLateralChunk(cx, cz);
  return axis >= WORLD_CONSTANTS.neighborhoodChunkRadius &&
    axis < CITY_AXIS_CENTER - WORLD_CONSTANTS.cityChunkRadius &&
    Math.abs(lateral) <= 0;
}

export function getChunkRegion(cx, cz) {
  if (isCityChunk(cx, cz)) {
    return "city";
  }
  if (isCityConnectorChunk(cx, cz)) {
    return "cityConnector";
  }
  const ringDistance = getChunkRingDistance(cx, cz);
  if (ringDistance <= WORLD_CONSTANTS.neighborhoodChunkRadius) {
    return "neighborhood";
  }
  if (ringDistance <= WORLD_CONSTANTS.forestOuterChunkRadius) {
    return "forest";
  }
  return "outside";
}

export function getRegionFallbackLabel(region) {
  if (region === "haven") {
    return "Haven";
  }
  if (region === "forest") {
    return "Skyshroud Forest";
  }
  if (region === "city") {
    return "City";
  }
  if (region === "cityConnector") {
    return "Commuter Tunnel";
  }
  if (region === "outside") {
    return "World Boundary";
  }
  return "Neighborhood";
}

export function isWorldPositionInHaven(position) {
  return position.x >= HAVEN_LAYOUT.bounds.minX &&
    position.x <= HAVEN_LAYOUT.bounds.maxX &&
    position.y >= HAVEN_LAYOUT.bounds.minY &&
    position.y <= HAVEN_LAYOUT.bounds.maxY &&
    position.z >= HAVEN_LAYOUT.bounds.minZ &&
    position.z <= HAVEN_LAYOUT.bounds.maxZ;
}

export function getMapSelectionId(position) {
  if (isWorldPositionInHaven(position)) {
    return MAP_IDS.haven;
  }
  const region = getChunkRegion(getChunkCoord(position.x), getChunkCoord(position.z));
  if (region === "city" || region === "cityConnector") {
    return MAP_IDS.city;
  }
  if (region === "forest") {
    return MAP_IDS.forest;
  }
  return MAP_IDS.neighborhood;
}

export function getMapTeleportState(mapId) {
  if (mapId === MAP_IDS.haven) {
    return { ...HAVEN_SPAWN_STATE };
  }

  if (mapId === MAP_IDS.forest) {
    const axisChunks = -(WORLD_CONSTANTS.neighborhoodChunkRadius + 4);
    const lateralChunks = 2;
    const x = CITY_DIRECTION.x !== 0
      ? CITY_DIRECTION.x * axisChunks * WORLD_CONSTANTS.chunkSize
      : lateralChunks * WORLD_CONSTANTS.chunkSize;
    const z = CITY_DIRECTION.x !== 0
      ? lateralChunks * WORLD_CONSTANTS.chunkSize
      : CITY_DIRECTION.z * axisChunks * WORLD_CONSTANTS.chunkSize;
    return { x, y: 18, z, yaw: 0, pitch: -0.18, roll: 0 };
  }

  if (mapId === MAP_IDS.city) {
    return {
      x: CITY_CENTER_CHUNK.x * WORLD_CONSTANTS.chunkSize,
      y: 8,
      z: CITY_CENTER_CHUNK.z * WORLD_CONSTANTS.chunkSize,
      yaw: 0,
      pitch: -0.12,
      roll: 0,
    };
  }

  return { ...WORLD_SPAWN_STATE };
}

export function getMapLabel(mapId) {
  return FLYS_WORLD_MAPS.find((map) => map.id === mapId)?.label || "Neighborhood";
}

export function createSharedWorldRuntime(THREE, scene) {
  const root = new THREE.Group();
  root.name = "FlysWorldSharedWorldRoot";
  scene.add(root);
  const geometries = createDefaultWorldGeometries(THREE);

  const profile = ATMOSPHERE_PROFILES.neighborhood;
  scene.background = new THREE.Color(profile.background);
  scene.fog = new THREE.Fog(profile.fog, profile.fogNear, profile.fogFar);

  return {
    root,
    geometries,
    maps: FLYS_WORLD_MAPS,
    constants: WORLD_CONSTANTS,
    getChunkRegion,
    getChunkCoord,
    getMapSelectionId,
    getMapTeleportState,
  };
}
