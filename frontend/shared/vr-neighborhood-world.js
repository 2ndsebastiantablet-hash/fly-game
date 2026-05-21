import {
  WORLD_CONSTANTS,
  getChunkRegion,
  hash2,
} from "./world.js";
import {
  createBoxMesh,
  createConeMesh,
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

function shuffle(rand, list) {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function makeMaterial(THREE, color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.92,
    metalness: options.metalness ?? 0,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent || false,
    opacity: options.opacity ?? 1,
    side: options.side || THREE.FrontSide,
  });
}

function createVrNeighborhoodMaterials(THREE) {
  const materials = {
    grassA: makeMaterial(THREE, 0x7fbf63),
    grassB: makeMaterial(THREE, 0x74b15c),
    road: makeMaterial(THREE, 0x424a52, { roughness: 0.98 }),
    sidewalk: makeMaterial(THREE, 0xbec5bf, { roughness: 0.97 }),
    path: makeMaterial(THREE, 0xcaa97c),
    bark: makeMaterial(THREE, 0x7a5439),
    foliageA: makeMaterial(THREE, 0x5ea453),
    foliageB: makeMaterial(THREE, 0x6cb663),
    foliageC: makeMaterial(THREE, 0x497f43),
    hedge: makeMaterial(THREE, 0x4b8b45),
    water: makeMaterial(THREE, 0x71bbd7, { roughness: 0.28, metalness: 0.08 }),
    window: makeMaterial(THREE, 0x9ac4ff, { emissive: 0x365272, emissiveIntensity: 0.24, roughness: 0.22 }),
    carGlass: makeMaterial(THREE, 0xaed4ff, { emissive: 0x24384e, emissiveIntensity: 0.18, roughness: 0.24, transparent: true, opacity: 0.7 }),
    door: makeMaterial(THREE, 0x694833, { roughness: 0.96 }),
    trim: makeMaterial(THREE, 0xf2eee7, { roughness: 0.88 }),
    fence: makeMaterial(THREE, 0xe8e0d6),
    benchWood: makeMaterial(THREE, 0x8b6640),
    benchMetal: makeMaterial(THREE, 0x5c666d, { roughness: 0.82 }),
    mailbox: makeMaterial(THREE, 0x276eb5, { roughness: 0.78 }),
    flower: makeMaterial(THREE, 0xff7f8a),
    lampPole: makeMaterial(THREE, 0x4e555d, { roughness: 0.8 }),
    lampBulb: makeMaterial(THREE, 0xfff4c5, { emissive: 0xffe89a, emissiveIntensity: 0.75 }),
    playSet: makeMaterial(THREE, 0xd7574a, { roughness: 0.85 }),
    playAccent: makeMaterial(THREE, 0x3f77cf, { roughness: 0.75 }),
    asphaltLot: makeMaterial(THREE, 0x595f66, { roughness: 0.94 }),
    wallDark: makeMaterial(THREE, 0x424b59, { roughness: 0.88 }),
    roofVent: makeMaterial(THREE, 0x3c4652, { roughness: 0.86 }),
  };

  return {
    ...materials,
    houseWalls: [
      makeMaterial(THREE, 0xefdfcf),
      makeMaterial(THREE, 0xe4efdb),
      makeMaterial(THREE, 0xd8e5f4),
      makeMaterial(THREE, 0xf2d5cf),
    ],
    roofMaterials: [
      makeMaterial(THREE, 0x9b5348),
      makeMaterial(THREE, 0x5f6976),
      makeMaterial(THREE, 0x6b4739),
      makeMaterial(THREE, 0x496b52),
    ],
    cityWalls: [
      makeMaterial(THREE, 0xc6ccd6),
      makeMaterial(THREE, 0xaab6c4),
      makeMaterial(THREE, 0xd9c7bd),
      makeMaterial(THREE, 0xc7d0c0),
    ],
    carMaterials: [
      makeMaterial(THREE, 0xd94f43, { roughness: 0.78 }),
      makeMaterial(THREE, 0x4b75d3, { roughness: 0.78 }),
      makeMaterial(THREE, 0xe0b54c, { roughness: 0.78 }),
      makeMaterial(THREE, 0xf2f2f2, { roughness: 0.78 }),
    ],
    shirtMaterials: [
      makeMaterial(THREE, 0x3f7fbe),
      makeMaterial(THREE, 0xe87f5a),
      makeMaterial(THREE, 0x5f9f5b),
      makeMaterial(THREE, 0x8b62c3),
    ],
    pantsMaterials: [
      makeMaterial(THREE, 0x394253),
      makeMaterial(THREE, 0x54514d),
      makeMaterial(THREE, 0x5b4d67),
    ],
    skinMaterials: [
      makeMaterial(THREE, 0xf1d2ba),
      makeMaterial(THREE, 0xe1b994),
      makeMaterial(THREE, 0x9b6445),
      makeMaterial(THREE, 0x6f4732),
    ],
  };
}

export function createVrNeighborhoodWorld(THREE, parent, options = {}) {
  const constants = WORLD_CONSTANTS;
  const chunkSize = constants.chunkSize;
  const halfChunk = constants.halfChunk;
  const roadHalfWidth = constants.roadHalfWidth;
  const sidewalkWidth = constants.sidewalkWidth;
  const buildInset = roadHalfWidth + sidewalkWidth + 2;
  const walkEdge = halfChunk - roadHalfWidth - sidewalkWidth / 2;
  const geometries = options.geometries;
  const materials = createVrNeighborhoodMaterials(THREE);
  const root = new THREE.Group();
  root.name = "VRRealNeighborhoodChunks";
  parent.add(root);

  const chunks = new Map();
  const actors = [];
  let objectCount = 0;

  function createBox(parentGroup, material, x, y, z, width, height, depth, meshOptions = {}) {
    objectCount += 1;
    return createBoxMesh(THREE, geometries, parentGroup, material, x, y, z, width, height, depth, meshOptions);
  }

  function createCylinder(parentGroup, material, x, y, z, radius, height, meshOptions = {}) {
    objectCount += 1;
    return createCylinderMesh(THREE, geometries, parentGroup, material, x, y, z, radius, height, meshOptions);
  }

  function createCone(parentGroup, material, x, y, z, width, height, depth, meshOptions = {}) {
    objectCount += 1;
    return createConeMesh(THREE, geometries, parentGroup, material, x, y, z, width, height, depth, meshOptions);
  }

  function createPatch(parentGroup, material, x, z, width, depth, y = 0.02) {
    objectCount += 1;
    return createPatchMesh(THREE, geometries, parentGroup, material, x, z, width, depth, y);
  }

  function createSphere(parentGroup, material, x, y, z, radius, meshOptions = {}) {
    objectCount += 1;
    const mesh = new THREE.Mesh(geometries.sphere, material);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(radius * 2);
    mesh.castShadow = meshOptions.cast !== false;
    mesh.receiveShadow = meshOptions.receive !== false;
    parentGroup.add(mesh);
    return mesh;
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
      createBox(
        parentGroup,
        materials.roofVent,
        x + (rand() - 0.5) * width * 0.48,
        y,
        z + (rand() - 0.5) * depth * 0.48,
        1.4 + rand() * 1.2,
        0.55 + rand() * 0.35,
        1 + rand() * 1.1,
        { cast: false }
      );
    }
  }

  function createLamp(parentGroup, x, z) {
    createCylinder(parentGroup, materials.lampPole, x, 2.2, z, 0.08, 4.4, { cast: false });
    createBox(parentGroup, materials.lampPole, x, 4.35, z + 0.36, 0.12, 0.12, 0.8, { cast: false });
    createSphere(parentGroup, materials.lampBulb, x, 4.12, z + 0.78, 0.18, { cast: false, receive: false });
  }

  function createBench(parentGroup, x, z, rotationY = 0) {
    const bench = new THREE.Group();
    bench.position.set(x, 0, z);
    bench.rotation.y = rotationY;
    parentGroup.add(bench);
    createBox(bench, materials.benchWood, 0, 0.62, 0, 2.4, 0.18, 0.46, { cast: false });
    createBox(bench, materials.benchWood, 0, 1.05, -0.22, 2.4, 0.18, 0.22, { cast: false });
    createBox(bench, materials.benchMetal, -0.85, 0.34, 0, 0.14, 0.68, 0.42, { cast: false });
    createBox(bench, materials.benchMetal, 0.85, 0.34, 0, 0.14, 0.68, 0.42, { cast: false });
  }

  function createFenceRect(parentGroup, x, z, width, depth) {
    const railHeight = 0.55;
    const postSize = 0.28;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    createBox(parentGroup, materials.fence, x, railHeight, z - halfDepth, width, 0.16, 0.12, { cast: false });
    createBox(parentGroup, materials.fence, x, railHeight, z + halfDepth, width, 0.16, 0.12, { cast: false });
    createBox(parentGroup, materials.fence, x - halfWidth, railHeight, z, 0.12, 0.16, depth, { cast: false });
    createBox(parentGroup, materials.fence, x + halfWidth, railHeight, z, 0.12, 0.16, depth, { cast: false });
    for (const px of [-halfWidth, halfWidth]) {
      for (const pz of [-halfDepth, halfDepth]) {
        createBox(parentGroup, materials.fence, x + px, 0.62, z + pz, postSize, 1.24, postSize, { cast: false });
      }
    }
  }

  function createMailbox(parentGroup, x, z, facing) {
    const mailbox = new THREE.Group();
    mailbox.position.set(x, 0, z);
    mailbox.rotation.y = facing;
    parentGroup.add(mailbox);
    createBox(mailbox, materials.benchMetal, 0, 0.55, 0, 0.12, 1.1, 0.12);
    createBox(mailbox, materials.mailbox, 0, 1.05, 0, 0.55, 0.35, 0.4);
    createBox(mailbox, materials.trim, 0.23, 1.03, 0, 0.06, 0.28, 0.05);
  }

  function createFlowerPatch(parentGroup, x, z, radius, count, rand) {
    for (let index = 0; index < count; index += 1) {
      const angle = rand() * Math.PI * 2;
      const distance = rand() * radius;
      const fx = x + Math.cos(angle) * distance;
      const fz = z + Math.sin(angle) * distance;
      createCylinder(parentGroup, materials.hedge, fx, 0.15, fz, 0.03, 0.3, { cast: false });
      createSphere(parentGroup, materials.flower, fx, 0.38, fz, 0.08, { cast: false, receive: false });
    }
  }

  function createCar(parentGroup, x, z, rotationY, rand) {
    const car = new THREE.Group();
    car.position.set(x, 0, z);
    car.rotation.y = rotationY;
    parentGroup.add(car);
    createBox(car, pick(rand, materials.carMaterials), 0, 0.55, 0, 3.6, 0.7, 1.8);
    createBox(car, materials.carGlass, -0.15, 0.98, 0, 1.9, 0.55, 1.45, { receive: false });
    for (const wheelX of [-1.15, 1.15]) {
      for (const wheelZ of [-0.92, 0.92]) {
        createBox(car, materials.wallDark, wheelX, 0.42, wheelZ, 0.28, 0.28, 0.12);
      }
    }
    return car;
  }

  function createTrafficCar(chunk, rand) {
    const lane = roadHalfWidth / 2;
    const path = [
      new THREE.Vector3(-halfChunk + lane, 0, -halfChunk + lane),
      new THREE.Vector3(halfChunk - lane, 0, -halfChunk + lane),
      new THREE.Vector3(halfChunk - lane, 0, halfChunk - lane),
      new THREE.Vector3(-halfChunk + lane, 0, halfChunk - lane),
    ];
    let segment = Math.floor(rand() * path.length);
    let progress = rand();
    const speed = 7 + rand() * 5;
    const car = createCar(chunk.group, path[segment].x, path[segment].z, 0, rand);
    actors.push({
      update(delta) {
        const from = path[segment];
        const to = path[(segment + 1) % path.length];
        progress += (speed * delta) / from.distanceTo(to);
        while (progress >= 1) {
          progress -= 1;
          segment = (segment + 1) % path.length;
        }
        car.position.lerpVectors(from, to, progress);
        car.rotation.y = Math.atan2(to.z - from.z, to.x - from.x);
      },
    });
  }

  function createWalker(chunk, rand) {
    const group = new THREE.Group();
    chunk.group.add(group);
    const shirt = pick(rand, materials.shirtMaterials);
    const pants = pick(rand, materials.pantsMaterials);
    const skin = pick(rand, materials.skinMaterials);
    createBox(group, shirt, 0, 1.65, 0, 0.92, 1.45, 0.52);
    createSphere(group, skin, 0, 2.68, 0, 0.34);
    const leftLeg = createBox(group, pants, -0.18, 0.72, 0, 0.22, 1.25, 0.22);
    const rightLeg = createBox(group, pants, 0.18, 0.72, 0, 0.22, 1.25, 0.22);
    createBox(group, skin, -0.6, 1.65, 0, 0.16, 1.02, 0.16);
    createBox(group, skin, 0.6, 1.65, 0, 0.16, 1.02, 0.16);

    const path = [
      new THREE.Vector3(-walkEdge, 0, -walkEdge),
      new THREE.Vector3(walkEdge, 0, -walkEdge),
      new THREE.Vector3(walkEdge, 0, walkEdge),
      new THREE.Vector3(-walkEdge, 0, walkEdge),
    ];
    let segment = Math.floor(rand() * path.length);
    let progress = rand();
    const speed = 2.1 + rand() * 1.3;
    const phase = rand() * Math.PI * 2;
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
        group.position.y = 0.06 + Math.abs(Math.sin(time * speed * 4 + phase)) * 0.05;
        group.lookAt(to.x, group.position.y + 1.2, to.z);
        const swing = Math.sin(time * speed * 8 + phase) * 0.55;
        leftLeg.rotation.x = swing;
        rightLeg.rotation.x = -swing;
      },
    });
  }

  function createTree(chunk, rand, x, z, scale = 1) {
    const foliage = pick(rand, [materials.foliageA, materials.foliageB, materials.foliageC]);
    const trunkHeight = (4.5 + rand() * 2.6) * scale;
    const trunkRadius = (0.35 + rand() * 0.08) * scale;
    const canopyRadius = (2.5 + rand() * 0.9) * scale;
    createCylinder(chunk.group, materials.bark, x, trunkHeight / 2, z, trunkRadius, trunkHeight);
    createSphere(chunk.group, foliage, x, trunkHeight + canopyRadius * 0.3, z, canopyRadius);
    createSphere(chunk.group, foliage, x - canopyRadius * 0.34, trunkHeight + canopyRadius * 0.1, z + 0.5, canopyRadius * 0.72);
    createSphere(chunk.group, foliage, x + canopyRadius * 0.28, trunkHeight + canopyRadius * 0.12, z - 0.35, canopyRadius * 0.68);
    chunk.treeAnchors.push(new THREE.Vector3(x, trunkHeight * 0.18 + 1.2, z));
  }

  function createHouse(chunk, rand, x, z) {
    const width = 10 + rand() * 6;
    const depth = 9 + rand() * 5;
    const height = 6 + rand() * 5;
    const roofHeight = 2.8 + rand() * 2.2;
    const wallMaterial = pick(rand, materials.houseWalls);
    const roofMaterial = pick(rand, materials.roofMaterials);
    const frontDirection = Math.abs(z) > Math.abs(x) ? (z > 0 ? "north" : "south") : (x > 0 ? "east" : "west");
    createBox(chunk.group, wallMaterial, x, height / 2, z, width, height, depth);
    createCone(chunk.group, roofMaterial, x, height + roofHeight / 2, z, width * 0.82, roofHeight, depth * 0.82, { ry: Math.PI / 4 });
    addCornerTrim(chunk.group, x, height / 2, z, width + 0.1, height, depth + 0.1, 0.12);
    if (rand() > 0.55) {
      createBox(chunk.group, materials.bark, x + width * 0.18, height + roofHeight * 0.62, z - depth * 0.18, 0.9, 2.4, 0.9);
    } else if (rand() > 0.45) {
      createBox(chunk.group, materials.roofVent, x - width * 0.18, height + roofHeight * 0.85, z + depth * 0.12, 1.1, 0.55, 0.9, { cast: false });
    }

    const windowY = height * 0.64;
    const doorHeight = 2.2;
    if (frontDirection === "south") {
      createBox(chunk.group, materials.door, x, doorHeight / 2, z - depth / 2 - 0.08, 1.55, doorHeight, 0.18);
      createBox(chunk.group, materials.window, x - width * 0.22, windowY, z - depth / 2 - 0.06, 1.6, 1.1, 0.14);
      createBox(chunk.group, materials.window, x + width * 0.22, windowY, z - depth / 2 - 0.06, 1.6, 1.1, 0.14);
      createPatch(chunk.group, materials.path, x, z - depth / 2 - 6, 2.5, 12, 0.03);
      createMailbox(chunk.group, x + 1.7, -walkEdge + 1.5, 0);
    } else if (frontDirection === "north") {
      createBox(chunk.group, materials.door, x, doorHeight / 2, z + depth / 2 + 0.08, 1.55, doorHeight, 0.18);
      createBox(chunk.group, materials.window, x - width * 0.22, windowY, z + depth / 2 + 0.06, 1.6, 1.1, 0.14);
      createBox(chunk.group, materials.window, x + width * 0.22, windowY, z + depth / 2 + 0.06, 1.6, 1.1, 0.14);
      createPatch(chunk.group, materials.path, x, z + depth / 2 + 6, 2.5, 12, 0.03);
      createMailbox(chunk.group, x - 1.8, walkEdge - 1.5, Math.PI);
    } else if (frontDirection === "east") {
      createBox(chunk.group, materials.door, x + width / 2 + 0.08, doorHeight / 2, z, 0.18, doorHeight, 1.55);
      createBox(chunk.group, materials.window, x + width / 2 + 0.06, windowY, z - depth * 0.22, 0.14, 1.1, 1.6);
      createBox(chunk.group, materials.window, x + width / 2 + 0.06, windowY, z + depth * 0.22, 0.14, 1.1, 1.6);
      createPatch(chunk.group, materials.path, x + width / 2 + 6, z, 12, 2.5, 0.03);
      createMailbox(chunk.group, walkEdge - 1.5, z + 1.3, -Math.PI / 2);
    } else {
      createBox(chunk.group, materials.door, x - width / 2 - 0.08, doorHeight / 2, z, 0.18, doorHeight, 1.55);
      createBox(chunk.group, materials.window, x - width / 2 - 0.06, windowY, z - depth * 0.22, 0.14, 1.1, 1.6);
      createBox(chunk.group, materials.window, x - width / 2 - 0.06, windowY, z + depth * 0.22, 0.14, 1.1, 1.6);
      createPatch(chunk.group, materials.path, x - width / 2 - 6, z, 12, 2.5, 0.03);
      createMailbox(chunk.group, -walkEdge + 1.5, z - 1.4, Math.PI / 2);
    }
    if (rand() > 0.45) {
      createFenceRect(chunk.group, x, z, width + 6, depth + 6);
    }
    createFlowerPatch(chunk.group, x + (rand() - 0.5) * 5, z + (rand() - 0.5) * 5, 2.6, 6 + Math.floor(rand() * 4), rand);
    for (let index = 0; index < 1 + Math.floor(rand() * 2); index += 1) {
      const tx = x + (rand() > 0.5 ? 1 : -1) * (width * 0.55 + 2 + rand() * 3);
      const tz = z + (rand() > 0.5 ? 1 : -1) * (depth * 0.55 + 2 + rand() * 3);
      if (Math.abs(tx) < halfChunk - 4 && Math.abs(tz) < halfChunk - 4) {
        createTree(chunk, rand, tx, tz, 0.75 + rand() * 0.45);
      }
    }
  }

  function createPlayground(parentGroup, x, z) {
    const play = new THREE.Group();
    play.position.set(x, 0, z);
    parentGroup.add(play);
    createPatch(play, materials.path, 0, 0, 12, 10, 0.03);
    for (const px of [-3.2, -1.8]) {
      for (const pz of [-1.3, 1.3]) {
        createCylinder(play, materials.playSet, px, 1.7, pz, 0.12, 3.4);
      }
    }
    createBox(play, materials.playAccent, -2.5, 3.22, 0, 2.1, 0.14, 2.8);
    createBox(play, materials.playSet, 3.45, 1.9, -0.9, 2.8, 0.12, 1.2, { rz: -0.7 });
  }

  function createPond(parentGroup, x, z, width, depth) {
    const pond = new THREE.Mesh(geometries.cylinder, materials.water);
    objectCount += 1;
    pond.position.set(x, 0.12, z);
    pond.scale.set(width, 0.2, depth);
    parentGroup.add(pond);
  }

  function createGazebo(parentGroup, x, z) {
    const gazebo = new THREE.Group();
    gazebo.position.set(x, 0, z);
    parentGroup.add(gazebo);
    createPatch(gazebo, materials.path, 0, 0, 8.5, 8.5, 0.03);
    for (const [px, pz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) {
      createCylinder(gazebo, materials.trim, px, 1.8, pz, 0.12, 3.6);
    }
    createBox(gazebo, materials.trim, 0, 3.3, 0, 5.6, 0.18, 5.6);
    createCone(gazebo, materials.roofMaterials[1], 0, 4.7, 0, 4.8, 2.3, 4.8, { ry: Math.PI / 4 });
  }

  function createApartmentBlock(chunk, rand, x, z) {
    const width = 18 + rand() * 4;
    const depth = 14 + rand() * 4;
    const floors = 3 + Math.floor(rand() * 2);
    const height = floors * 3.2;
    const wallMaterial = pick(rand, materials.cityWalls);
    createBox(chunk.group, wallMaterial, x, height / 2, z, width, height, depth);
    createBox(chunk.group, pick(rand, materials.roofMaterials), x, height + 0.55, z, width + 1.2, 1.1, depth + 1.2);
    addCornerTrim(chunk.group, x, height / 2, z, width + 0.1, height, depth + 0.1, 0.14);
    for (let floor = 0; floor < floors; floor += 1) {
      const y = 1.8 + floor * 2.6;
      for (let column = -2; column <= 2; column += 1) {
        createBox(chunk.group, materials.window, x + column * 3.2, y, z + depth / 2 + 0.08, 1.7, 1.2, 0.14);
        createBox(chunk.group, materials.window, x + column * 3.2, y, z - depth / 2 - 0.08, 1.7, 1.2, 0.14);
      }
    }
    createPatch(chunk.group, materials.path, x, z + depth / 2 + 6, 6, 12, 0.03);
    createFenceRect(chunk.group, x, z, width + 8, depth + 12);
  }

  function createCornerShop(chunk, rand, x, z, rotationY = 0) {
    const shop = new THREE.Group();
    shop.position.set(x, 0, z);
    shop.rotation.y = rotationY;
    chunk.group.add(shop);
    createBox(shop, pick(rand, materials.houseWalls), 0, 3.1, 0, 16, 6.2, 12);
    createBox(shop, pick(rand, materials.roofMaterials), 0, 6.55, 0, 16.8, 0.9, 12.8);
    for (const wx of [-4.4, 0, 4.4]) {
      createBox(shop, materials.window, wx, 2.4, 6.08, 3.6, 2.6, 0.16);
    }
    createBox(shop, materials.playAccent, 0, 4.15, 5.65, 14.5, 0.28, 1.1, { rz: -0.12 });
    createBox(shop, materials.door, 0, 1.45, 6.15, 1.6, 2.9, 0.16);
    addCornerTrim(shop, 0, 3.1, 0, 16.1, 6.2, 12.1, 0.14);
    createPatch(shop, materials.sidewalk, 0, 9.2, 18, 5.2, 0.03);
  }

  function createChunkBase(chunk, rand) {
    createPatch(chunk.group, rand() > 0.5 ? materials.grassA : materials.grassB, 0, 0, chunkSize, chunkSize, 0);
    createPatch(chunk.group, materials.road, -halfChunk + roadHalfWidth / 2, 0, roadHalfWidth, chunkSize, 0.015);
    createPatch(chunk.group, materials.road, halfChunk - roadHalfWidth / 2, 0, roadHalfWidth, chunkSize, 0.015);
    createPatch(chunk.group, materials.road, 0, -halfChunk + roadHalfWidth / 2, chunkSize, roadHalfWidth, 0.015);
    createPatch(chunk.group, materials.road, 0, halfChunk - roadHalfWidth / 2, chunkSize, roadHalfWidth, 0.015);
    createPatch(chunk.group, materials.sidewalk, -halfChunk + roadHalfWidth + sidewalkWidth / 2, 0, sidewalkWidth, chunkSize - roadHalfWidth * 2, 0.02);
    createPatch(chunk.group, materials.sidewalk, halfChunk - roadHalfWidth - sidewalkWidth / 2, 0, sidewalkWidth, chunkSize - roadHalfWidth * 2, 0.02);
    createPatch(chunk.group, materials.sidewalk, 0, -halfChunk + roadHalfWidth + sidewalkWidth / 2, chunkSize - roadHalfWidth * 2, sidewalkWidth, 0.02);
    createPatch(chunk.group, materials.sidewalk, 0, halfChunk - roadHalfWidth - sidewalkWidth / 2, chunkSize - roadHalfWidth * 2, sidewalkWidth, 0.02);
    for (const [x, z] of [[-walkEdge, -walkEdge], [walkEdge, -walkEdge], [-walkEdge, walkEdge], [walkEdge, walkEdge]]) {
      createLamp(chunk.group, x, z);
    }
  }

  function fillResidentialChunk(chunk, rand) {
    chunk.type = "Residential Block";
    const lots = shuffle(rand, [[-16, -16], [17, -15], [-18, 17], [16, 16]]);
    const houses = rand() > 0.48 ? 4 : 3;
    for (let index = 0; index < houses; index += 1) {
      const [baseX, baseZ] = lots[index];
      createHouse(chunk, rand, baseX + (rand() - 0.5) * 3.2, baseZ + (rand() - 0.5) * 3.2);
    }
    if (rand() > 0.38) {
      createBench(chunk.group, 0, -walkEdge + 1.5, Math.PI);
      createBench(chunk.group, walkEdge - 1.5, 0, -Math.PI / 2);
    }
    if (rand() > 0.52) {
      createCar(chunk.group, -walkEdge + 3.5, (rand() - 0.5) * 14, Math.PI / 2, rand);
    }
    for (let index = 0; index < 2 + Math.floor(rand() * 3); index += 1) {
      const tx = THREE.MathUtils.clamp((rand() - 0.5) * 52, -halfChunk + 6, halfChunk - 6);
      const tz = THREE.MathUtils.clamp((rand() - 0.5) * 52, -halfChunk + 6, halfChunk - 6);
      if (Math.abs(tx) > buildInset || Math.abs(tz) > buildInset) {
        createTree(chunk, rand, tx, tz, 0.7 + rand() * 0.55);
      }
    }
  }

  function fillParkChunk(chunk, rand) {
    chunk.type = "Park Loop";
    createPatch(chunk.group, materials.path, 0, 0, 12, 42, 0.025);
    createPatch(chunk.group, materials.path, 0, 0, 42, 12, 0.025);
    createPlayground(chunk.group, -10, 9);
    createPond(chunk.group, 12, -10, 6.8, 5.2);
    createGazebo(chunk.group, 11, 13);
    createBench(chunk.group, -17, -3, Math.PI / 2);
    createBench(chunk.group, 18, 5, -Math.PI / 2);
    createBench(chunk.group, 0, 17, 0);
    for (let index = 0; index < 10; index += 1) {
      const tx = (rand() - 0.5) * 50;
      const tz = (rand() - 0.5) * 50;
      if (Math.abs(tx) > 8 || Math.abs(tz) > 8) {
        createTree(chunk, rand, tx, tz, 0.78 + rand() * 0.55);
      }
    }
    for (let index = 0; index < 3; index += 1) {
      createFlowerPatch(chunk.group, (rand() - 0.5) * 20, (rand() - 0.5) * 20, 2.8, 10, rand);
    }
  }

  function fillCivicChunk(chunk, rand) {
    chunk.type = "Civic Corner";
    createPatch(chunk.group, materials.asphaltLot, 7, -6, 26, 20, 0.025);
    createPatch(chunk.group, materials.sidewalk, -14, 12, 18, 9, 0.03);
    createBox(chunk.group, pick(rand, materials.cityWalls), -12, 5.8, -4, 20, 11.6, 14);
    createBox(chunk.group, materials.trim, -12, 9.8, 3.3, 18, 0.4, 0.45);
    createBox(chunk.group, materials.window, -12, 6.6, 3.2, 16, 4.2, 0.18);
    createBox(chunk.group, pick(rand, materials.roofMaterials), -12, 12.8, -4, 21.2, 1.5, 15.2);
    addCornerTrim(chunk.group, -12, 5.8, -4, 20.1, 11.6, 14.1, 0.16);
    addRoofVents(chunk.group, -12, 13.8, -4, 16, 10, rand, 2);
    createBench(chunk.group, -10, 14.8, 0);
    createBench(chunk.group, 2, 14.8, 0);
    createCar(chunk.group, 8, -11, 0, rand);
    createCar(chunk.group, 8, -3.8, 0, rand);
    createCar(chunk.group, 8, 3.2, 0, rand);
  }

  function fillApartmentChunk(chunk, rand) {
    chunk.type = "Apartment Court";
    createApartmentBlock(chunk, rand, -5, -4);
    createPond(chunk.group, 14, 10, 10, 6);
    createPatch(chunk.group, materials.asphaltLot, 13, -12, 18, 16, 0.025);
    createCar(chunk.group, 8, -15, 0, rand);
    createCar(chunk.group, 15, -15, 0, rand);
    createCar(chunk.group, 20, -9, Math.PI / 2, rand);
    for (let index = 0; index < 7; index += 1) {
      const tx = (rand() - 0.5) * 50;
      const tz = (rand() - 0.5) * 50;
      if (tx > 5 || tz > 2) {
        createTree(chunk, rand, tx, tz, 0.7 + rand() * 0.45);
      }
    }
  }

  function fillMarketChunk(chunk, rand) {
    chunk.type = "Neighborhood Shops";
    createCornerShop(chunk, rand, -13, -7, 0);
    createCornerShop(chunk, rand, 15, 10, Math.PI);
    createPatch(chunk.group, materials.asphaltLot, 0, -16, 22, 14, 0.025);
    createPatch(chunk.group, materials.sidewalk, 0, 16, 24, 8, 0.03);
    createBench(chunk.group, 10, 16, 0);
    createCar(chunk.group, -6, -17, 0, rand);
    createCar(chunk.group, 1, -17, 0, rand);
    createCar(chunk.group, 8, -17, 0, rand);
    createFlowerPatch(chunk.group, 14, 18, 2.5, 8, rand);
  }

  function populateLife(chunk, rand) {
    const walkers = chunk.type === "Park Loop"
      ? 3
      : chunk.type === "Civic Corner" || chunk.type === "Neighborhood Shops"
        ? 4
        : chunk.type === "Apartment Court"
          ? 3
          : 2 + Math.floor(rand() * 2);
    for (let index = 0; index < walkers; index += 1) {
      createWalker(chunk, rand);
    }
    const trafficCount = chunk.type === "Park Loop"
      ? 1
      : chunk.type === "Neighborhood Shops" || chunk.type === "Civic Corner"
        ? 3
        : 2;
    for (let index = 0; index < trafficCount; index += 1) {
      createTrafficCar(chunk, rand);
    }
  }

  function createChunk(cx, cz) {
    const rand = createRng(hash2(cx, cz));
    const chunk = {
      cx,
      cz,
      region: getChunkRegion(cx, cz),
      type: "Residential Block",
      group: new THREE.Group(),
      treeAnchors: [],
    };
    chunk.group.position.set(cx * chunkSize, 0, cz * chunkSize);
    root.add(chunk.group);
    createChunkBase(chunk, rand);
    const roll = rand();
    if (roll < 0.16) {
      fillParkChunk(chunk, rand);
    } else if (roll < 0.28) {
      fillCivicChunk(chunk, rand);
    } else if (roll < 0.42) {
      fillApartmentChunk(chunk, rand);
    } else if (roll < 0.56) {
      fillMarketChunk(chunk, rand);
    } else {
      fillResidentialChunk(chunk, rand);
    }
    populateLife(chunk, rand);
    chunks.set(`${cx},${cz}`, chunk);
  }

  const radius = options.radius ?? 2;
  const centerX = options.centerX ?? 0;
  const centerZ = options.centerZ ?? 0;
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      createChunk(centerX + dx, centerZ + dz);
    }
  }

  return {
    root,
    mapName: "Neighborhood",
    chunks,
    get objectCount() {
      return objectCount;
    },
    get actorCount() {
      return actors.length;
    },
    update(delta, time) {
      for (const actor of actors) {
        actor.update(delta, time);
      }
    },
  };
}
