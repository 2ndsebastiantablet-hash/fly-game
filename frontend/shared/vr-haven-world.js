import { HAVEN_LAYOUT } from "./world.js";
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

function material(THREE, color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.72,
    metalness: options.metalness ?? 0,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent || false,
    opacity: options.opacity ?? 1,
    side: options.side || THREE.FrontSide,
  });
}

export function createVrHavenWorld(THREE, parent, options = {}) {
  const geometries = options.geometries;
  const root = new THREE.Group();
  root.name = "VRRealHavenRealm";
  root.position.set(HAVEN_LAYOUT.origin.x, HAVEN_LAYOUT.origin.y, HAVEN_LAYOUT.origin.z);
  parent.add(root);

  const mats = {
    marble: material(THREE, 0xf2ede2, { roughness: 0.42 }),
    marblePink: material(THREE, 0xf3dce9, { roughness: 0.46 }),
    gold: material(THREE, 0xd8aa3f, { emissive: 0x8c5a11, emissiveIntensity: 0.24, roughness: 0.34, metalness: 0.18 }),
    cloud: material(THREE, 0xf6fbff, { emissive: 0x9eb6ff, emissiveIntensity: 0.1, roughness: 0.86 }),
    cloudGlow: material(THREE, 0xffffff, { transparent: true, opacity: 0.82, emissive: 0xbfd7ff, emissiveIntensity: 0.5 }),
    hedge: material(THREE, 0x5da95c, { roughness: 0.96 }),
    grass: material(THREE, 0x91d66e),
    symbol: material(THREE, 0x2c2b68, { emissive: 0x5a3eff, emissiveIntensity: 0.55 }),
    crystal: material(THREE, 0xcff6ff, { transparent: true, opacity: 0.72, emissive: 0x88cfff, emissiveIntensity: 0.9, roughness: 0.16 }),
    statue: material(THREE, 0xd8d3c9, { roughness: 0.62 }),
    darkTrim: material(THREE, 0x403061, { roughness: 0.66 }),
    blueLeaf: material(THREE, 0x7ebcff, { emissive: 0x2359a8, emissiveIntensity: 0.12 }),
    goldLeaf: material(THREE, 0xe0b64a, { emissive: 0x8c5f0d, emissiveIntensity: 0.14 }),
    whiteBark: material(THREE, 0xf4f0df),
    bridge: material(THREE, 0xcda34a, { roughness: 0.42, metalness: 0.08 }),
    hand: material(THREE, 0xf0d4bf),
    catwalk: material(THREE, 0x36323f, { roughness: 0.62, metalness: 0.08 }),
    wire: material(THREE, 0x17151e, { roughness: 0.5, metalness: 0.16 }),
    redSky: material(THREE, 0x5b1026, { transparent: true, opacity: 0.72, emissive: 0x4a0819, emissiveIntensity: 0.35 }),
    eyeWhite: material(THREE, 0xe6d9cd),
    eyeIris: material(THREE, 0xb92f2f, { emissive: 0x7f1016, emissiveIntensity: 0.42 }),
    flower: material(THREE, 0xff7f8a),
    water: material(THREE, 0x71bbd7, { roughness: 0.28, metalness: 0.08 }),
    plant: material(THREE, 0x355a28),
  };

  const chunks = new Map([["haven-realm", { type: "Haven Realm" }]]);
  const actors = [];
  let objectCount = 0;

  function createBox(parentGroup, mat, x, y, z, width, height, depth, meshOptions = {}) {
    objectCount += 1;
    return createBoxMesh(THREE, geometries, parentGroup, mat, x, y, z, width, height, depth, meshOptions);
  }

  function createCylinder(parentGroup, mat, x, y, z, radius, height, meshOptions = {}) {
    objectCount += 1;
    return createCylinderMesh(THREE, geometries, parentGroup, mat, x, y, z, radius, height, meshOptions);
  }

  function createCone(parentGroup, mat, x, y, z, width, height, depth, meshOptions = {}) {
    objectCount += 1;
    return createConeMesh(THREE, geometries, parentGroup, mat, x, y, z, width, height, depth, meshOptions);
  }

  function createPatch(parentGroup, mat, x, z, width, depth, y = 0.02) {
    objectCount += 1;
    return createPatchMesh(THREE, geometries, parentGroup, mat, x, z, width, depth, y);
  }

  function createSphere(parentGroup, mat, x, y, z, radius, meshOptions = {}) {
    objectCount += 1;
    const mesh = new THREE.Mesh(geometries.sphere, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(radius * 2);
    mesh.castShadow = meshOptions.cast !== false;
    mesh.receiveShadow = meshOptions.receive !== false;
    parentGroup.add(mesh);
    return mesh;
  }

  function createScaledSphere(parentGroup, mat, x, y, z, sx, sy, sz, meshOptions = {}) {
    const mesh = createSphere(parentGroup, mat, x, y, z, 0.5, meshOptions);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(meshOptions.rx || 0, meshOptions.ry || 0, meshOptions.rz || 0);
    return mesh;
  }

  function createColumn(parentGroup, x, z, height = 20, radius = 0.9) {
    createCylinder(parentGroup, mats.marble, x, height / 2, z, radius, height, { cast: false });
    createCylinder(parentGroup, mats.gold, x, height + 0.25, z, radius * 1.22, 0.5, { cast: false });
    createCylinder(parentGroup, mats.gold, x, 0.25, z, radius * 1.2, 0.5, { cast: false });
  }

  function createStatue(parentGroup, x, z, kind = "angel", scale = 1) {
    const statue = new THREE.Group();
    statue.position.set(x, 0.1, z);
    parentGroup.add(statue);
    createBox(statue, mats.gold, 0, 0.25 * scale, 0, 1.5 * scale, 0.5 * scale, 1.5 * scale, { cast: false });
    createBox(statue, mats.statue, 0, 1.25 * scale, 0, 0.7 * scale, 1.8 * scale, 0.55 * scale, { cast: false });
    createSphere(statue, mats.statue, 0, 2.45 * scale, 0, 0.42 * scale, { cast: false });
    if (kind === "angel") {
      createBox(statue, mats.statue, -0.7 * scale, 1.75 * scale, -0.12 * scale, 0.16 * scale, 1.3 * scale, 1.2 * scale, { rz: 0.42, cast: false });
      createBox(statue, mats.statue, 0.7 * scale, 1.75 * scale, -0.12 * scale, 0.16 * scale, 1.3 * scale, 1.2 * scale, { rz: -0.42, cast: false });
    } else if (kind === "demon") {
      createCone(statue, mats.darkTrim, -0.22 * scale, 2.95 * scale, 0, 0.16 * scale, 0.52 * scale, 0.16 * scale, { cast: false });
      createCone(statue, mats.darkTrim, 0.22 * scale, 2.95 * scale, 0, 0.16 * scale, 0.52 * scale, 0.16 * scale, { cast: false });
    } else if (kind === "dog") {
      createBox(statue, mats.statue, 0, 0.9 * scale, 0.38 * scale, 1.1 * scale, 0.62 * scale, 0.55 * scale, { cast: false });
      createSphere(statue, mats.statue, 0, 1.08 * scale, 0.9 * scale, 0.28 * scale, { cast: false });
    }
  }

  function createChandelier(parentGroup, x, y, z, radius = 4) {
    const chandelier = new THREE.Group();
    chandelier.position.set(x, y, z);
    parentGroup.add(chandelier);
    createCylinder(chandelier, mats.gold, 0, 1.6, 0, 0.08, 3.2, { cast: false });
    createCylinder(chandelier, mats.gold, 0, 0, 0, radius, 0.14, { cast: false });
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;
      const crystal = createCone(chandelier, mats.crystal, px, -0.75 - (index % 3) * 0.28, pz, 0.35, 1.4, 0.35, { cast: false });
      actors.push({
        update(delta, time) {
          crystal.rotation.y += delta * 0.8;
          crystal.position.y += Math.sin(time * 1.7 + index * 0.7) * 0.002;
        },
      });
      const glow = new THREE.PointLight(0xcff6ff, 0.55, 18, 1.8);
      glow.position.set(px, -0.75, pz);
      chandelier.add(glow);
    }
  }

  function createBallroom(parentGroup) {
    const room = new THREE.Group();
    room.name = "CloudBallroom";
    parentGroup.add(room);
    createPatch(room, mats.marble, 0, 0, 92, 74, 0.02);
    createBox(room, mats.cloud, 0, 22.5, 0, 96, 1.2, 78, { cast: false });
    createBox(room, mats.marble, -46, 10, 0, 2.2, 20, 74, { cast: false });
    createBox(room, mats.marble, 46, 10, 0, 2.2, 20, 74, { cast: false });
    createBox(room, mats.marble, 0, 10, -37, 92, 20, 2.2, { cast: false });
    createBox(room, mats.marble, -25, 10, 37, 34, 20, 2.2, { cast: false });
    createBox(room, mats.marble, 25, 10, 37, 34, 20, 2.2, { cast: false });
    createBox(room, mats.gold, 0, 17, 37.3, 15, 2.2, 1.4, { cast: false });
    for (const side of [-1, 1]) {
      for (let index = 0; index < 5; index += 1) {
        const z = -26 + index * 13;
        createBox(room, mats.crystal, side * 46.2, 10, z, 0.35, 10.5, 5.4, { cast: false });
        createBox(room, mats.gold, side * 45.6, 10, z, 0.35, 12, 0.22, { cast: false });
      }
    }
    for (let index = 0; index < 6; index += 1) {
      createColumn(room, -34 + index * 13.6, -28, 20, 0.8);
      createColumn(room, -34 + index * 13.6, 26, 20, 0.8);
    }
    createChandelier(room, -20, 19, -8, 3.6);
    createChandelier(room, 20, 19, -8, 3.6);
    createChandelier(room, 0, 20, 16, 4.2);
    createBox(room, mats.gold, 0, 2.2, -31.5, 12, 1.8, 5.5, { cast: false });
    createBox(room, mats.darkTrim, 0, 4.2, -33.2, 8.5, 3.8, 1.3, { cast: false });
    createBox(room, mats.crystal, 0, 7.2, -34.2, 6.2, 1.6, 0.3, { cast: false });
    ["angel", "dog", "demon", "person", "angel", "dog"].forEach((kind, index) => {
      const side = index % 2 === 0 ? -1 : 1;
      createStatue(room, side * 37, -20 + Math.floor(index / 2) * 18, kind, 1.18);
    });
    createBox(room, mats.gold, -4, 4.2, 39, 6, 8, 0.8, { cast: false });
    createBox(room, mats.gold, 4, 4.2, 39, 6, 8, 0.8, { cast: false });
  }

  function createGate(parentGroup, x, z, rotationY = 0) {
    const gate = new THREE.Group();
    gate.position.set(x, 0, z);
    gate.rotation.y = rotationY;
    parentGroup.add(gate);
    createBox(gate, mats.gold, -3.2, 4, 0, 0.6, 8, 0.6, { cast: false });
    createBox(gate, mats.gold, 3.2, 4, 0, 0.6, 8, 0.6, { cast: false });
    createBox(gate, mats.gold, 0, 8.2, 0, 7.2, 0.7, 0.7, { cast: false });
    createBox(gate, mats.symbol, 0, 6.2, -0.08, 2.4, 2.4, 0.2, { cast: false });
  }

  function createPedestal(parentGroup, x, z, artifact = mats.crystal) {
    createBox(parentGroup, mats.marble, x, 0.55, z, 2.1, 1.1, 2.1, { cast: false });
    createBox(parentGroup, mats.gold, x, 1.25, z, 1.4, 0.28, 1.4, { cast: false });
    createCone(parentGroup, artifact, x, 2.35, z, 0.7, 1.8, 0.7, { round: true, cast: false });
  }

  function createFountain(parentGroup, x, z) {
    createCylinder(parentGroup, mats.gold, x, 0.36, z, 2.8, 0.72, { cast: false });
    createCylinder(parentGroup, mats.marble, x, 0.82, z, 2.15, 0.42, { cast: false });
    createScaledSphere(parentGroup, mats.cloudGlow, x, 1.65, z, 1.6, 0.55, 1.6, { cast: false });
    createCylinder(parentGroup, mats.water, x, 2.35, z, 0.25, 2.2, { cast: false });
  }

  function createMaze(parentGroup) {
    const maze = new THREE.Group();
    maze.name = "HavenHedgeMaze";
    maze.position.set(0, 0, 118);
    parentGroup.add(maze);
    const rand = createRng(0x8172a);
    const cell = 12;
    const cols = 13;
    const rows = 13;
    const width = cols * cell;
    const depth = rows * cell;
    const halfW = width * 0.5;
    const halfD = depth * 0.5;
    createPatch(maze, mats.grass, 0, 0, width + 24, depth + 24, 0.03);
    createBox(maze, mats.cloudGlow, 0, 9.55, -halfD * 0.5 - 10, width + 34, 1.2, halfD - 21, { cast: false });
    createBox(maze, mats.cloudGlow, 0, 9.55, halfD * 0.5 + 10, width + 34, 1.2, halfD - 21, { cast: false });
    createBox(maze, mats.cloudGlow, -halfW * 0.5 - 10, 9.55, 0, halfW - 21, 1.2, 42, { cast: false });
    createBox(maze, mats.cloudGlow, halfW * 0.5 + 10, 9.55, 0, halfW - 21, 1.2, 42, { cast: false });

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const verticalWalls = Array.from({ length: rows }, () => Array(cols + 1).fill(true));
    const horizontalWalls = Array.from({ length: rows + 1 }, () => Array(cols).fill(true));
    const stack = [[Math.floor(cols / 2), 0]];
    visited[0][Math.floor(cols / 2)] = true;
    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors = [];
      for (const [dx, dy, wall] of [[1, 0, "right"], [-1, 0, "left"], [0, 1, "down"], [0, -1, "up"]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) neighbors.push([nx, ny, wall]);
      }
      if (!neighbors.length) {
        stack.pop();
        continue;
      }
      const [nx, ny, wall] = pick(rand, neighbors);
      if (wall === "right") verticalWalls[cy][cx + 1] = false;
      if (wall === "left") verticalWalls[cy][cx] = false;
      if (wall === "down") horizontalWalls[cy + 1][cx] = false;
      if (wall === "up") horizontalWalls[cy][cx] = false;
      visited[ny][nx] = true;
      stack.push([nx, ny]);
    }
    for (let index = 0; index < 24; index += 1) {
      const x = 1 + Math.floor(rand() * (cols - 2));
      const y = 1 + Math.floor(rand() * (rows - 2));
      if (rand() > 0.5) verticalWalls[y][x] = false;
      else horizontalWalls[y][x] = false;
    }
    horizontalWalls[0][Math.floor(cols / 2)] = false;
    horizontalWalls[rows][Math.floor(cols / 2)] = false;
    verticalWalls[Math.floor(rows / 2)][0] = false;
    verticalWalls[Math.floor(rows / 2)][cols] = false;
    const wallHeight = 8.8;
    for (let y = 0; y <= rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (horizontalWalls[y][x]) createBox(maze, mats.hedge, -halfW + x * cell + cell * 0.5, wallHeight * 0.5, -halfD + y * cell, cell + 1.3, wallHeight, 1.3, { cast: false });
      }
    }
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x <= cols; x += 1) {
        if (verticalWalls[y][x]) createBox(maze, mats.hedge, -halfW + x * cell, wallHeight * 0.5, -halfD + y * cell + cell * 0.5, 1.3, wallHeight, cell + 1.3, { cast: false });
      }
    }
    createGate(maze, 0, -halfD - 7, 0);
    createGate(maze, 0, halfD + 7, Math.PI);
    createGate(maze, -halfW - 7, 0, Math.PI / 2);
    createGate(maze, halfW + 7, 0, -Math.PI / 2);
    for (let index = 0; index < 12; index += 1) {
      const x = -halfW + (1 + Math.floor(rand() * (cols - 2))) * cell + cell * 0.5;
      const z = -halfD + (1 + Math.floor(rand() * (rows - 2))) * cell + cell * 0.5;
      if (index % 4 === 0) createFountain(maze, x, z);
      else if (index % 3 === 0) createStatue(maze, x, z, pick(rand, ["angel", "dog", "demon", "person"]), 0.78);
      else createPedestal(maze, x, z, index % 2 === 0 ? mats.crystal : mats.symbol);
    }
  }

  function createBridge(parentGroup, fromX, fromZ, toX, toZ, y = 0.72, width = 5.2, mat = mats.bridge) {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const x = (fromX + toX) * 0.5;
    const z = (fromZ + toZ) * 0.5;
    createBox(parentGroup, mat, x, y, z, width, 0.7, length, { ry: angle, cast: false });
    createBox(parentGroup, mats.gold, x + Math.cos(angle) * width * 0.5, y + 1.15, z - Math.sin(angle) * width * 0.5, 0.28, 1.9, length, { ry: angle, cast: false });
    createBox(parentGroup, mats.gold, x - Math.cos(angle) * width * 0.5, y + 1.15, z + Math.sin(angle) * width * 0.5, 0.28, 1.9, length, { ry: angle, cast: false });
  }

  function createHavenTree(parentGroup, x, z, height = 8) {
    createCylinder(parentGroup, mats.whiteBark, x, height * 0.42, z, 0.42, height * 0.84, { cast: false });
    const leaf = Math.abs(Math.floor(x + z)) % 2 === 0 ? mats.blueLeaf : mats.goldLeaf;
    createScaledSphere(parentGroup, leaf, x, height, z, 4.4, 2.2, 4.4, { cast: false });
    createScaledSphere(parentGroup, leaf, x + 1.8, height - 0.8, z - 1.3, 2.8, 1.6, 2.8, { cast: false });
  }

  function createFlower(parentGroup, x, z, scale = 1) {
    createCylinder(parentGroup, mats.plant, x, 1.5 * scale, z, 0.18 * scale, 3 * scale, { cast: false });
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      createScaledSphere(parentGroup, index % 2 ? mats.flower : mats.crystal, x + Math.cos(angle) * scale, 3.3 * scale, z + Math.sin(angle) * scale, 0.9 * scale, 0.28 * scale, 1.25 * scale, { ry: angle, cast: false });
    }
    createSphere(parentGroup, mats.gold, x, 3.3 * scale, z, 0.55 * scale, { cast: false });
  }

  function createPlanterHand(parentGroup, x, z, phase = 0) {
    const hand = new THREE.Group();
    hand.position.set(x, 4.2, z);
    parentGroup.add(hand);
    createBox(hand, mats.hand, 0, 0, 0, 1.6, 0.8, 2, { cast: false });
    for (let index = 0; index < 5; index += 1) {
      const finger = createBox(hand, mats.hand, -0.8 + index * 0.4, -0.58, 1.2, 0.22, 1.6, 0.24, { rx: 0.2, cast: false });
      finger.userData.phase = phase + index * 0.3;
    }
    const carriedPlant = new THREE.Group();
    carriedPlant.position.set(0, -1.35, 1.35);
    hand.add(carriedPlant);
    createCylinder(carriedPlant, mats.plant, 0, 0.34, 0, 0.06, 0.68, { cast: false });
    createSphere(carriedPlant, mats.flower, 0, 0.78, 0, 0.24, { cast: false });
    actors.push({
      update(delta, time) {
        const travel = time * 0.22 + phase;
        hand.position.x = x + Math.sin(travel) * 9;
        hand.position.z = z + Math.cos(travel * 0.8) * 6;
        const grabCycle = (Math.sin(time * 1.15 + phase) + 1) * 0.5;
        hand.position.y = 4.2 + Math.sin(time * 1.4 + phase) * 0.7 - grabCycle * 1.2;
        hand.rotation.z = Math.sin(time * 0.9 + phase) * 0.18;
        carriedPlant.visible = grabCycle > 0.42;
      },
    });
  }

  function createFloatingGarden(parentGroup) {
    const garden = new THREE.Group();
    garden.name = "HavenFloatingGardenPaths";
    garden.position.set(168, 5, 118);
    parentGroup.add(garden);
    createBox(garden, mats.cloudGlow, 50, 33, 16, 176, 1.2, 122, { cast: false });
    createBox(garden, mats.cloudGlow, -38, 15, 16, 1.2, 36, 122, { cast: false });
    createBox(garden, mats.cloudGlow, 138, 15, 16, 1.2, 36, 122, { cast: false });
    createBox(garden, mats.cloudGlow, 50, 15, -45, 176, 36, 1.2, { cast: false });
    createBox(garden, mats.cloudGlow, 50, 15, 77, 176, 36, 1.2, { cast: false });
    const islands = [
      { x: 0, z: 0, w: 34, d: 26, y: 0 },
      { x: 40, z: -24, w: 28, d: 22, y: 4 },
      { x: 74, z: 12, w: 32, d: 24, y: 8 },
      { x: 34, z: 42, w: 30, d: 20, y: 11 },
      { x: 96, z: 54, w: 38, d: 28, y: 16 },
    ];
    for (const island of islands) {
      createBox(garden, mats.cloud, island.x, island.y - 0.38, island.z, island.w, 1.2, island.d, { cast: false });
      createPatch(garden, mats.grass, island.x, island.z, island.w * 0.88, island.d * 0.82, island.y + 0.26);
      createPatch(garden, mats.cloud, island.x - island.w * 0.18, island.z + island.d * 0.14, island.w * 0.32, island.d * 0.22, island.y + 0.34);
      createHavenTree(garden, island.x + island.w * 0.22, island.z - island.d * 0.2, 7 + island.y * 0.08);
      createFlower(garden, island.x - island.w * 0.22, island.z - island.d * 0.2, 1.1 + island.y * 0.025);
    }
    for (let index = 0; index < islands.length - 1; index += 1) {
      createBridge(garden, islands[index].x, islands[index].z, islands[index + 1].x, islands[index + 1].z, (islands[index].y + islands[index + 1].y) * 0.5 + 0.68, 5.8);
    }
    createBridge(garden, -34, 0, -8, 0, 0.7, 7);
    createPlanterHand(garden, 10, -7, 0.4);
    createPlanterHand(garden, 72, 14, 1.7);
  }

  function createCatwalkNetwork(parentGroup) {
    const network = new THREE.Group();
    network.name = "HavenSkyBridgeNetwork";
    network.position.set(-172, 12, 118);
    parentGroup.add(network);
    createBox(network, mats.redSky, -42, 27, 0, 178, 1.2, 126, { cast: false });
    createBox(network, mats.redSky, -131, 12, 0, 1.2, 32, 126, { cast: false });
    createBox(network, mats.redSky, 47, 12, 0, 1.2, 32, 126, { cast: false });
    const platforms = [
      { x: 0, z: 0, w: 18, d: 18, y: 0 },
      { x: -38, z: -26, w: 15, d: 15, y: 3 },
      { x: -80, z: -6, w: 17, d: 17, y: 5 },
      { x: -44, z: 34, w: 14, d: 14, y: 7 },
      { x: 28, z: 32, w: 16, d: 16, y: 4 },
    ];
    for (const platform of platforms) {
      createBox(network, mats.catwalk, platform.x, platform.y, platform.z, platform.w, 0.8, platform.d, { cast: false });
      createBox(network, mats.wire, platform.x, platform.y + 2.4, platform.z - platform.d * 0.5, platform.w, 3.8, 0.18, { cast: false });
      createBox(network, mats.wire, platform.x, platform.y + 2.4, platform.z + platform.d * 0.5, platform.w, 3.8, 0.18, { cast: false });
    }
    for (let index = 0; index < platforms.length - 1; index += 1) {
      createBridge(network, platforms[index].x, platforms[index].z, platforms[index + 1].x, platforms[index + 1].z, (platforms[index].y + platforms[index + 1].y) * 0.5 + 0.75, 4.4, mats.catwalk);
    }
    for (const eye of [[-35, 20, -36, 1.2], [-82, 22, 30, 0.95], [28, 19, 45, 0.9], [-42, 30, 0, 3.2]]) {
      const [x, y, z, scale] = eye;
      createScaledSphere(network, mats.eyeWhite, x, y, z, 2.2 * scale, 1.2 * scale, 1.45 * scale, { cast: false });
      createSphere(network, mats.eyeIris, x, y, z + 1.1 * scale, 0.54 * scale, { cast: false });
    }
  }

  function createTower(parentGroup) {
    const tower = new THREE.Group();
    tower.name = "HavenObservatoryTower";
    tower.position.set(0, 0, 118);
    parentGroup.add(tower);
    createCylinder(tower, mats.marble, 0, 25, 0, 7.2, 50, { cast: false });
    createBox(tower, mats.darkTrim, 0, 3.8, -7.25, 5.2, 7.6, 0.5, { cast: false });
    createCylinder(tower, mats.gold, 0, 50.8, 0, 8.8, 1.4, { cast: false });
    createCylinder(tower, mats.cloud, 0, 56, 0, 15, 1.2, { cast: false });
    for (let step = 0; step < 30; step += 1) {
      const angle = step * 0.48;
      createBox(tower, mats.gold, Math.cos(angle) * 3.7, 1.5 + step * 1.72, Math.sin(angle) * 3.7, 4.2, 0.32, 2.1, { ry: -angle, cast: false });
    }
    const telescope = new THREE.Group();
    telescope.position.set(0, 59, 0);
    telescope.rotation.y = -0.55;
    tower.add(telescope);
    createCylinder(telescope, mats.darkTrim, 0, 1.2, 0, 1.3, 8.8, { rx: Math.PI / 2, cast: false });
    createCylinder(telescope, mats.gold, 0, 1.2, -4.8, 1.8, 0.8, { rx: Math.PI / 2, cast: false });
    createCylinder(telescope, mats.crystal, 0, 1.2, -5.35, 1.55, 0.24, { rx: Math.PI / 2, cast: false });
  }

  createBallroom(root);
  createMaze(root);
  createTower(root);
  createFloatingGarden(root);
  createCatwalkNetwork(root);
  createBridge(root, 85, 118, 151, 118, 0.7, 7.2);
  createBridge(root, -85, 118, -154, 118, 0.8, 6.2);
  const ambient = new THREE.PointLight(0xfff2c8, 1.4, 120, 1.6);
  ambient.position.set(0, 28, 50);
  root.add(ambient);
  const mazeGlow = new THREE.PointLight(0xb9d7ff, 1.2, 220, 1.9);
  mazeGlow.position.set(0, 35, 118);
  root.add(mazeGlow);

  return {
    root,
    mapName: "Haven",
    spawn: { ...HAVEN_LAYOUT.spawn },
    bounds: { ...HAVEN_LAYOUT.bounds },
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
