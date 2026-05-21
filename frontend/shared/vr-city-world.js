import { CITY_CENTER_CHUNK, WORLD_CONSTANTS, hash2 } from "./world.js";
import {
  createBoxMesh,
  createCylinderMesh,
  createPatchMesh,
} from "./world-builders.js";

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

function material(THREE, color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.9,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent || false,
    opacity: options.opacity ?? 1,
  });
}

export function createVrCityWorld(THREE, parent, options = {}) {
  const geometries = options.geometries;
  const root = new THREE.Group();
  root.name = "VRRealCityChunks";
  parent.add(root);

  const chunkSize = WORLD_CONSTANTS.chunkSize;
  const halfChunk = WORLD_CONSTANTS.halfChunk;
  const roadHalfWidth = WORLD_CONSTANTS.roadHalfWidth;
  const sidewalkWidth = WORLD_CONSTANTS.sidewalkWidth;
  const walkEdge = halfChunk - roadHalfWidth - sidewalkWidth / 2;
  const chunks = new Map();
  const actors = [];
  let objectCount = 0;

  const materials = {
    asphalt: material(THREE, 0x595f66),
    road: material(THREE, 0x424a52, { roughness: 0.98 }),
    sidewalk: material(THREE, 0xbec5bf),
    trim: material(THREE, 0xf2eee7),
    wallDark: material(THREE, 0x424b59),
    roofVent: material(THREE, 0x3c4652),
    glass: material(THREE, 0xaed6ff, { emissive: 0x295680, emissiveIntensity: 0.22, roughness: 0.22 }),
    door: material(THREE, 0x694833),
    lampPole: material(THREE, 0x4e555d),
    lampBulb: material(THREE, 0xfff4c5, { emissive: 0xffe89a, emissiveIntensity: 0.75 }),
    dumpster: material(THREE, 0x5c666d),
    trashA: material(THREE, 0xb9b4ad),
    trashB: material(THREE, 0x807d7a),
    skin: material(THREE, 0xe1b994),
    suit: material(THREE, 0x262d38),
    casual: material(THREE, 0x3f7fbe),
    pants: material(THREE, 0x394253),
    bus: material(THREE, 0xe0b94b),
    truck: material(THREE, 0x4c9a72),
    limo: material(THREE, 0x17171a),
    carGlass: material(THREE, 0xaed4ff, { transparent: true, opacity: 0.7, emissive: 0x24384e, emissiveIntensity: 0.18 }),
    tire: material(THREE, 0x17191c),
    signBank: material(THREE, 0x1c3559, { emissive: 0x0b2444, emissiveIntensity: 0.12 }),
    signHotel: material(THREE, 0x713d7c, { emissive: 0x2b1231, emissiveIntensity: 0.14 }),
    signShop: material(THREE, 0xb74448, { emissive: 0x3a1012, emissiveIntensity: 0.12 }),
    cityWalls: [
      material(THREE, 0xc6ccd6),
      material(THREE, 0xaab6c4),
      material(THREE, 0xd9c7bd),
      material(THREE, 0xc7d0c0),
      material(THREE, 0x9da4b3),
    ],
    accents: [
      material(THREE, 0xd86a56),
      material(THREE, 0x4674c8),
      material(THREE, 0xe0b94b),
      material(THREE, 0x4c9a72),
    ],
    cars: [
      material(THREE, 0xd94f43),
      material(THREE, 0x4b75d3),
      material(THREE, 0xe0b54c),
      material(THREE, 0xf2f2f2),
    ],
  };

  function createPatch(parentGroup, mat, x, z, width, depth, y = 0.02) {
    objectCount += 1;
    return createPatchMesh(THREE, geometries, parentGroup, mat, x, z, width, depth, y);
  }

  function createBox(parentGroup, mat, x, y, z, width, height, depth, meshOptions = {}) {
    objectCount += 1;
    return createBoxMesh(THREE, geometries, parentGroup, mat, x, y, z, width, height, depth, meshOptions);
  }

  function createCylinder(parentGroup, mat, x, y, z, radius, height, meshOptions = {}) {
    objectCount += 1;
    return createCylinderMesh(THREE, geometries, parentGroup, mat, x, y, z, radius, height, meshOptions);
  }

  function createSphere(parentGroup, mat, x, y, z, radius) {
    objectCount += 1;
    const mesh = new THREE.Mesh(geometries.sphere, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(radius * 2);
    parentGroup.add(mesh);
    return mesh;
  }

  function createRoadStripe(parentGroup, x, z, width, depth, rotationY = 0) {
    const stripe = createPatch(parentGroup, materials.trim, x, z, width, depth, 0.03);
    stripe.rotation.y = rotationY;
  }

  function createLamp(parentGroup, x, z) {
    createCylinder(parentGroup, materials.lampPole, x, 2.2, z, 0.08, 4.4, { cast: false });
    createBox(parentGroup, materials.lampPole, x, 4.35, z + 0.36, 0.12, 0.12, 0.8, { cast: false });
    createSphere(parentGroup, materials.lampBulb, x, 4.12, z + 0.78, 0.18);
  }

  function addCornerTrim(parentGroup, x, y, z, width, height, depth, thickness = 0.18) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        createBox(parentGroup, materials.wallDark, x + sx * width * 0.5, y, z + sz * depth * 0.5, thickness, height, thickness, { cast: false });
      }
    }
  }

  function addRoofVents(parentGroup, x, y, z, width, depth, rand, count = 2) {
    for (let index = 0; index < count; index += 1) {
      createBox(parentGroup, materials.roofVent, x + (rand() - 0.5) * width * 0.48, y, z + (rand() - 0.5) * depth * 0.48, 1.4 + rand() * 1.2, 0.55 + rand() * 0.35, 1 + rand() * 1.1, { cast: false });
    }
  }

  function createBench(parentGroup, x, z, rotationY = 0) {
    const bench = new THREE.Group();
    bench.position.set(x, 0, z);
    bench.rotation.y = rotationY;
    parentGroup.add(bench);
    createBox(bench, materials.trim, 0, 0.62, 0, 2.4, 0.18, 0.46);
    createBox(bench, materials.wallDark, -0.85, 0.34, 0, 0.14, 0.68, 0.42);
    createBox(bench, materials.wallDark, 0.85, 0.34, 0, 0.14, 0.68, 0.42);
  }

  function createUrbanTower(chunk, rand, x, z, towerOptions = {}) {
    const width = towerOptions.width || (12 + rand() * 7);
    const depth = towerOptions.depth || (12 + rand() * 7);
    const floors = towerOptions.floors || (7 + Math.floor(rand() * 8));
    const floorHeight = 3.2;
    const height = floors * floorHeight;
    const wall = pick(rand, materials.cityWalls);
    const glass = materials.glass;
    createBox(chunk.group, wall, x, height / 2, z, width, height, depth);
    createBox(chunk.group, pick(rand, materials.accents), x, height + 0.45, z, width + 0.8, 0.9, depth + 0.8);
    addCornerTrim(chunk.group, x, height / 2, z, width + 0.18, height, depth + 0.18, 0.18);
    addRoofVents(chunk.group, x, height + 1.08, z, width, depth, rand, 1 + Math.floor(rand() * 2));
    const columns = Math.max(2, Math.floor((width - 4) / 3.6));
    for (let floor = 0; floor < floors; floor += 1) {
      const y = 1.8 + floor * floorHeight;
      for (let column = 0; column < columns; column += 1) {
        const offset = -width * 0.34 + (column / Math.max(1, columns - 1)) * (width * 0.68);
        createBox(chunk.group, glass, x + offset, y, z + depth / 2 + 0.12, 1.8, 1.5, 0.14);
        createBox(chunk.group, glass, x + offset, y, z - depth / 2 - 0.12, 1.8, 1.5, 0.14);
      }
    }
  }

  function createStorefrontRow(chunk, rand, x, z, rotationY = 0) {
    const row = new THREE.Group();
    row.position.set(x, 0, z);
    row.rotation.y = rotationY;
    chunk.group.add(row);
    const units = 3 + Math.floor(rand() * 2);
    const totalWidth = units * 6.2;
    createBox(row, pick(rand, materials.cityWalls), 0, 3.2, 0, totalWidth, 6.4, 10);
    createBox(row, pick(rand, materials.accents), 0, 6.7, 0, totalWidth + 0.8, 0.6, 10.8);
    addCornerTrim(row, 0, 3.2, 0, totalWidth + 0.1, 6.4, 10.1, 0.16);
    for (let index = 0; index < units; index += 1) {
      const px = -totalWidth / 2 + 3.1 + index * 6.2;
      createBox(row, materials.glass, px, 2.2, 5.05, 4.2, 2.8, 0.14);
      createBox(row, materials.door, px, 1.4, 5.08, 1.2, 2.8, 0.14);
      createBox(row, materials.signShop, px, 5.45, 5.1, 3.9, 0.72, 0.13);
    }
  }

  function createBankBuilding(chunk, rand, x, z) {
    createBox(chunk.group, pick(rand, materials.cityWalls), x, 4.6, z, 24, 9.2, 16);
    createBox(chunk.group, materials.trim, x, 9.45, z, 24.8, 0.6, 16.8);
    createBox(chunk.group, materials.glass, x, 2.9, z + 8.05, 10.5, 3.4, 0.14);
    createBox(chunk.group, materials.signBank, x, 7.5, z + 8.08, 9.5, 1.25, 0.14);
    for (const columnX of [-7, -3.5, 0, 3.5, 7]) {
      createCylinder(chunk.group, materials.trim, x + columnX, 3.8, z + 7.4, 0.34, 7.2);
    }
    addCornerTrim(chunk.group, x, 4.6, z, 24.2, 9.2, 16.2, 0.18);
    addRoofVents(chunk.group, x, 10.15, z, 18, 10, rand, 2);
  }

  function createHotelBuilding(chunk, rand, x, z) {
    createBox(chunk.group, pick(rand, materials.cityWalls), x, 8.2, z, 20, 16.4, 14);
    createBox(chunk.group, pick(rand, materials.accents), x, 17.2, z, 20.8, 0.7, 14.8);
    createBox(chunk.group, materials.signHotel, x, 13.9, z + 7.16, 8.8, 1.4, 0.14);
    addCornerTrim(chunk.group, x, 8.2, z, 20.2, 16.4, 14.2, 0.18);
    addRoofVents(chunk.group, x, 17.85, z, 14, 9, rand, 2);
    for (let floor = 0; floor < 5; floor += 1) {
      const y = 2.2 + floor * 2.9;
      for (let column = -3; column <= 3; column += 1) {
        createBox(chunk.group, materials.glass, x + column * 2.5, y, z + 7.12, 1.5, 1.35, 0.12);
      }
    }
  }

  function createCar(parentGroup, x, z, rotationY, rand, vehicle = "car") {
    const car = new THREE.Group();
    car.position.set(x, 0, z);
    car.rotation.y = rotationY;
    parentGroup.add(car);
    const isBus = vehicle === "bus";
    const isTruck = vehicle === "truck";
    const isLimo = vehicle === "limo";
    const body = isBus ? materials.bus : isTruck ? materials.truck : isLimo ? materials.limo : pick(rand, materials.cars);
    createBox(car, body, 0, isBus || isTruck ? 1.18 : 0.62, 0, isBus ? 7.6 : isTruck ? 7.2 : isLimo ? 7.4 : 3.6, isBus || isTruck ? 2.15 : 0.72, isBus || isTruck ? 2.2 : 1.9);
    createBox(car, materials.carGlass, -0.2, isBus || isTruck ? 2 : 1.02, 0, isBus ? 6.1 : isTruck ? 1.7 : isLimo ? 5 : 1.9, 0.55, isBus || isTruck ? 1.9 : 1.45);
    for (const wheelX of [-2.8, 2.8]) createBox(car, materials.tire, wheelX, 0.42, 0, 0.18, 0.24, 2);
    return car;
  }

  function createTrafficVehicle(chunk, rand) {
    const lane = roadHalfWidth / 2 + 0.25;
    const path = [
      new THREE.Vector3(-halfChunk + lane, 0, -halfChunk + lane),
      new THREE.Vector3(halfChunk - lane, 0, -halfChunk + lane),
      new THREE.Vector3(halfChunk - lane, 0, halfChunk - lane),
      new THREE.Vector3(-halfChunk + lane, 0, halfChunk - lane),
    ];
    let segment = Math.floor(rand() * path.length);
    let progress = rand();
    const roll = rand();
    const vehicleType = roll < 0.16 ? "bus" : roll < 0.34 ? "truck" : roll < 0.42 ? "limo" : "car";
    const vehicle = createCar(chunk.group, path[segment].x, path[segment].z, 0, rand, vehicleType);
    const speed = 8 + rand() * 7;
    actors.push({
      update(delta) {
        const from = path[segment];
        const to = path[(segment + 1) % path.length];
        progress += (speed * delta) / from.distanceTo(to);
        while (progress >= 1) {
          progress -= 1;
          segment = (segment + 1) % path.length;
        }
        vehicle.position.lerpVectors(from, to, progress);
        vehicle.rotation.y = Math.atan2(to.z - from.z, to.x - from.x);
      },
    });
  }

  function createWalker(chunk, rand, variant = "casual") {
    const group = new THREE.Group();
    chunk.group.add(group);
    const shirt = variant === "suit" ? materials.suit : materials.casual;
    createBox(group, shirt, 0, 1.65, 0, 0.92, 1.45, 0.52);
    createSphere(group, materials.skin, 0, 2.68, 0, 0.34);
    const leftLeg = createBox(group, materials.pants, -0.18, 0.72, 0, 0.22, 1.25, 0.22);
    const rightLeg = createBox(group, materials.pants, 0.18, 0.72, 0, 0.22, 1.25, 0.22);
    const path = [
      new THREE.Vector3(-walkEdge, 0, -walkEdge),
      new THREE.Vector3(walkEdge, 0, -walkEdge),
      new THREE.Vector3(walkEdge, 0, walkEdge),
      new THREE.Vector3(-walkEdge, 0, walkEdge),
    ];
    let segment = Math.floor(rand() * path.length);
    let progress = rand();
    const speed = 2.4 + rand() * 1.8;
    actors.push({
      update(delta, time) {
        const from = path[segment];
        const to = path[(segment + 1) % path.length];
        progress += (speed * delta) / from.distanceTo(to);
        while (progress >= 1) {
          progress -= 1;
          segment = (segment + 1) % path.length;
        }
        group.position.lerpVectors(from, to, progress);
        group.lookAt(to.x, group.position.y + 1.2, to.z);
        const swing = Math.sin(time * speed * 8) * 0.55;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
      },
    });
  }

  function createHomelessPerson(chunk, rand, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rand() * Math.PI * 2;
    chunk.group.add(group);
    createBox(group, materials.trashB, 0, 0.44, 0, 1.1, 0.5, 0.78);
    createSphere(group, materials.skin, 0, 0.94, 0.08, 0.24);
    createBox(group, materials.trashA, 0, 0.08, -0.3, 1.25, 0.06, 0.95);
  }

  function createDumpster(parentGroup, x, z, rotationY = 0) {
    const dumpster = new THREE.Group();
    dumpster.position.set(x, 0, z);
    dumpster.rotation.y = rotationY;
    parentGroup.add(dumpster);
    createBox(dumpster, materials.dumpster, 0, 0.95, 0, 2.6, 1.8, 1.5);
    createBox(dumpster, materials.trim, 0, 1.95, 0, 2.7, 0.12, 1.6, { rz: -0.08 });
  }

  function createStreetTrash(parentGroup, rand, x, z, spread = 1.4) {
    for (let index = 0; index < 5; index += 1) {
      createBox(parentGroup, rand() > 0.5 ? materials.trashA : materials.trashB, x + (rand() - 0.5) * spread, 0.04 + rand() * 0.06, z + (rand() - 0.5) * spread, 0.18 + rand() * 0.5, 0.03 + rand() * 0.06, 0.14 + rand() * 0.38, { cast: false, ry: rand() * Math.PI });
    }
  }

  function createCityChunkBase(chunk) {
    createPatch(chunk.group, materials.asphalt, 0, 0, chunkSize, chunkSize, 0);
    createPatch(chunk.group, materials.road, -halfChunk + roadHalfWidth / 2, 0, roadHalfWidth, chunkSize, 0.015);
    createPatch(chunk.group, materials.road, halfChunk - roadHalfWidth / 2, 0, roadHalfWidth, chunkSize, 0.015);
    createPatch(chunk.group, materials.road, 0, -halfChunk + roadHalfWidth / 2, chunkSize, roadHalfWidth, 0.015);
    createPatch(chunk.group, materials.road, 0, halfChunk - roadHalfWidth / 2, chunkSize, roadHalfWidth, 0.015);
    createPatch(chunk.group, materials.sidewalk, -halfChunk + roadHalfWidth + sidewalkWidth / 2, 0, sidewalkWidth, chunkSize - roadHalfWidth * 2, 0.02);
    createPatch(chunk.group, materials.sidewalk, halfChunk - roadHalfWidth - sidewalkWidth / 2, 0, sidewalkWidth, chunkSize - roadHalfWidth * 2, 0.02);
    createPatch(chunk.group, materials.sidewalk, 0, -halfChunk + roadHalfWidth + sidewalkWidth / 2, chunkSize - roadHalfWidth * 2, sidewalkWidth, 0.02);
    createPatch(chunk.group, materials.sidewalk, 0, halfChunk - roadHalfWidth - sidewalkWidth / 2, chunkSize - roadHalfWidth * 2, sidewalkWidth, 0.02);
    for (const z of [-roadHalfWidth / 2, roadHalfWidth / 2]) {
      for (let x = -30; x <= 30; x += 12) createRoadStripe(chunk.group, x, z, 4.2, 0.24);
    }
    for (const [x, z] of [[-walkEdge, -walkEdge], [walkEdge, -walkEdge], [-walkEdge, walkEdge], [walkEdge, walkEdge]]) createLamp(chunk.group, x, z);
  }

  function createChunk(cx, cz) {
    const rand = createRng(hash2(cx, cz));
    const chunk = { cx, cz, group: new THREE.Group(), type: "Downtown Towers" };
    chunk.group.position.set(cx * chunkSize, 0, cz * chunkSize);
    root.add(chunk.group);
    const roll = rand();
    createCityChunkBase(chunk);
    if (roll < 0.24) {
      createUrbanTower(chunk, rand, -16, -14, { width: 16 + rand() * 4, depth: 15 + rand() * 4, floors: 10 + Math.floor(rand() * 5) });
      createUrbanTower(chunk, rand, 15, 15, { width: 13 + rand() * 4, depth: 13 + rand() * 4, floors: 8 + Math.floor(rand() * 5) });
      createPatch(chunk.group, materials.sidewalk, 0, 0, 18, 18, 0.03);
      createBench(chunk.group, -10, 0, Math.PI / 2);
      createStreetTrash(chunk.group, rand, 3, -9, 2);
    } else if (roll < 0.42) {
      createBankBuilding(chunk, rand, -12, -10);
      createUrbanTower(chunk, rand, 17, 12, { width: 14, depth: 14, floors: 9 + Math.floor(rand() * 4) });
      createCar(chunk.group, 0, -17, 0, rand, "limo");
      createDumpster(chunk.group, 19, -19, Math.PI / 2);
    } else if (roll < 0.58) {
      createHotelBuilding(chunk, rand, -14, -8);
      createStorefrontRow(chunk, rand, 14, 12, Math.PI);
      createCar(chunk.group, 0, 17, 0, rand, "bus");
    } else if (roll < 0.78) {
      createUrbanTower(chunk, rand, -16, -12, { width: 16, depth: 14, floors: 8 + Math.floor(rand() * 3) });
      createUrbanTower(chunk, rand, 14, 14, { width: 12 + rand() * 3, depth: 12 + rand() * 3, floors: 7 + Math.floor(rand() * 3) });
      createDumpster(chunk.group, -19, 18, 0);
    } else {
      createStorefrontRow(chunk, rand, -14, -10, 0);
      createStorefrontRow(chunk, rand, 14, 12, Math.PI);
      createUrbanTower(chunk, rand, 16, -14, { width: 12, depth: 12, floors: 7 + Math.floor(rand() * 4) });
      createCar(chunk.group, -16, 17, 0, rand, "truck");
    }
    const walkerCount = roll < 0.24 ? 10 : roll > 0.78 ? 12 : 8;
    for (let index = 0; index < walkerCount; index += 1) createWalker(chunk, rand, roll < 0.42 ? "suit" : "casual");
    for (let index = 0; index < (roll > 0.58 ? 2 : 1); index += 1) createHomelessPerson(chunk, rand, -walkEdge + 2 + rand() * 4, -18 + rand() * 4);
    const trafficCount = roll < 0.24 ? 8 : roll > 0.78 ? 7 : 6;
    for (let index = 0; index < trafficCount; index += 1) createTrafficVehicle(chunk, rand);
    chunks.set(`${cx},${cz}`, chunk);
  }

  const centerX = CITY_CENTER_CHUNK.x;
  const centerZ = CITY_CENTER_CHUNK.z;
  const radius = options.radius ?? 1;
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      createChunk(centerX + dx, centerZ + dz);
    }
  }
  const spawn = {
    x: centerX * chunkSize,
    y: 8,
    z: centerZ * chunkSize,
    yaw: 0,
    pitch: -0.12,
    roll: 0,
  };

  return {
    root,
    mapName: "City",
    spawn,
    bounds: {
      minX: (centerX - radius - 0.5) * chunkSize,
      maxX: (centerX + radius + 0.5) * chunkSize,
      minY: 0.7,
      maxY: 135,
      minZ: (centerZ - radius - 0.5) * chunkSize,
      maxZ: (centerZ + radius + 0.5) * chunkSize,
    },
    chunks,
    get objectCount() {
      return objectCount;
    },
    get actorCount() {
      return actors.length;
    },
    update(delta, time) {
      for (const actor of actors) actor.update(delta, time);
    },
    dispose() {
      parent.remove(root);
    },
  };
}
