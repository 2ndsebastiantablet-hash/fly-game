import { getChunkCoord, getMapTeleportState, hash2, WORLD_CONSTANTS } from "./world.js";
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
    roughness: options.roughness ?? 0.94,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent || false,
    opacity: options.opacity ?? 1,
    side: options.side || THREE.FrontSide,
  });
}

export function createVrForestWorld(THREE, parent, options = {}) {
  const geometries = options.geometries;
  const root = new THREE.Group();
  root.name = "VRRealForestChunks";
  parent.add(root);

  const materials = {
    groundA: material(THREE, 0x162214),
    groundB: material(THREE, 0x1b2817),
    bark: material(THREE, 0x7a5439),
    foliageA: material(THREE, 0x1d4520),
    foliageB: material(THREE, 0x16391b),
    foliageC: material(THREE, 0x102c16),
    plantA: material(THREE, 0x284a22),
    plantB: material(THREE, 0x355a28),
    plantC: material(THREE, 0x456b31),
    flower: material(THREE, 0xff7f8a),
    canopy: material(THREE, 0x112715, { transparent: true, opacity: 0.96, side: THREE.DoubleSide }),
    ash: material(THREE, 0x2a2b28),
    ember: material(THREE, 0xff8c4a, { emissive: 0xff5a18, emissiveIntensity: 0.85 }),
    cloth: material(THREE, 0x6a6662),
    clothDark: material(THREE, 0x2f3436),
    blood: material(THREE, 0x5f0d12),
    bone: material(THREE, 0xe5dfcf),
  };

  const chunks = new Map();
  const actors = [];
  let objectCount = 0;

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

  function createForestTree(chunk, rand, x, z, scale = 1) {
    const foliage = pick(rand, [materials.foliageA, materials.foliageB, materials.foliageC]);
    const trunkHeight = (30 + rand() * 20) * scale;
    const trunkRadius = (0.45 + rand() * 0.18) * scale;
    const canopyRadius = (11.4 + rand() * 5.2) * scale;
    createCylinder(chunk.group, materials.bark, x, trunkHeight / 2, z, trunkRadius, trunkHeight, { cast: false });
    createSphere(chunk.group, foliage, x, trunkHeight + canopyRadius * 0.02, z, canopyRadius * 1.14, { cast: false });
    createSphere(chunk.group, foliage, x - canopyRadius * 0.42, trunkHeight - canopyRadius * 0.02, z + canopyRadius * 0.18, canopyRadius * 1.02, { cast: false });
    createSphere(chunk.group, foliage, x + canopyRadius * 0.44, trunkHeight + canopyRadius * 0.01, z - canopyRadius * 0.2, canopyRadius * 1.04, { cast: false });
    createSphere(chunk.group, foliage, x, trunkHeight + canopyRadius * 0.24, z - canopyRadius * 0.08, canopyRadius * 0.98, { cast: false });
    chunk.treeAnchors.push(new THREE.Vector3(x, trunkHeight * 0.72, z));
  }

  function createForestBush(parentGroup, rand, x, z, scale = 1) {
    const mat = pick(rand, [materials.plantA, materials.plantB, materials.foliageA, materials.foliageB]);
    const radius = (0.65 + rand() * 0.55) * scale;
    createSphere(parentGroup, mat, x, 0.42 * scale, z, radius, { cast: false });
    createSphere(parentGroup, mat, x - radius * 0.4, 0.34 * scale, z + radius * 0.2, radius * 0.68, { cast: false });
    createSphere(parentGroup, mat, x + radius * 0.32, 0.36 * scale, z - radius * 0.26, radius * 0.62, { cast: false });
  }

  function createForestPlantPatch(parentGroup, rand, x, z, radius, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = rand() * Math.PI * 2;
      const distance = rand() * radius;
      const px = x + Math.cos(angle) * distance;
      const pz = z + Math.sin(angle) * distance;
      const stemHeight = 0.16 + rand() * 0.42;
      const mat = pick(rand, [materials.plantA, materials.plantB, materials.plantC]);
      createCylinder(parentGroup, mat, px, stemHeight * 0.5, pz, 0.025 + rand() * 0.025, stemHeight, { cast: false });
      createSphere(parentGroup, mat, px, stemHeight + 0.08, pz, 0.18 + rand() * 0.32, { cast: false });
      if (rand() > 0.68) {
        createSphere(parentGroup, materials.flower, px, stemHeight + 0.22, pz, 0.06 + rand() * 0.05, { cast: false });
      }
    }
  }

  function createCanopySheet(parentGroup, x, z, width, depth, y, tiltX = 0, tiltZ = 0) {
    const canopy = createBox(parentGroup, materials.canopy, x, y, z, width, 0.32, depth, { cast: false, receive: false });
    canopy.rotation.x = tiltX;
    canopy.rotation.z = tiltZ;
  }

  function createLeafDrift(chunk, rand, x, z, spread = 8) {
    const leaves = [];
    for (let index = 0; index < 8; index += 1) {
      const leaf = new THREE.Mesh(geometries.plane, materials.plantC);
      objectCount += 1;
      leaf.scale.setScalar(0.12 + rand() * 0.14);
      chunk.group.add(leaf);
      leaves.push({
        mesh: leaf,
        offset: new THREE.Vector3((rand() - 0.5) * spread, 2 + rand() * 7, (rand() - 0.5) * spread),
        phase: rand() * Math.PI * 2,
        drift: 0.5 + rand() * 0.8,
      });
    }
    actors.push({
      update(delta, time) {
        for (const leaf of leaves) {
          leaf.offset.y -= delta * 0.5;
          if (leaf.offset.y < 0.15) leaf.offset.y = 5 + rand() * 7;
          leaf.mesh.position.set(
            x + leaf.offset.x + Math.sin(time * leaf.drift + leaf.phase) * 0.9,
            leaf.offset.y,
            z + leaf.offset.z + Math.cos(time * leaf.drift + leaf.phase) * 0.8
          );
          leaf.mesh.rotation.set(Math.sin(time * 2.2 + leaf.phase) * 0.5, time * leaf.drift + leaf.phase, Math.cos(time * 2.8 + leaf.phase) * 0.7);
        }
      },
    });
  }

  function createCampfire(parentGroup, rand, x, z) {
    createPatch(parentGroup, materials.ash, x, z, 2.8, 2.4, 0.028);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      createSphere(parentGroup, materials.bone, x + Math.cos(angle) * 0.62, 0.16, z + Math.sin(angle) * 0.54, 0.12 + rand() * 0.05, { cast: false });
    }
    createCylinder(parentGroup, materials.bark, x - 0.26, 0.2, z, 0.08, 1.3, { rx: Math.PI / 2, ry: 0.6, cast: false });
    createCylinder(parentGroup, materials.bark, x + 0.24, 0.2, z + 0.06, 0.08, 1.2, { rx: Math.PI / 2, ry: -0.7, cast: false });
    for (let ember = 0; ember < 4; ember += 1) {
      createSphere(parentGroup, materials.ember, x + (rand() - 0.5) * 0.38, 0.14 + rand() * 0.08, z + (rand() - 0.5) * 0.34, 0.05 + rand() * 0.03, { cast: false });
    }
  }

  function createChunk(cx, cz) {
    const rand = createRng(hash2(cx, cz));
    const chunk = {
      cx,
      cz,
      type: "Skyshroud Forest",
      group: new THREE.Group(),
      treeAnchors: [],
    };
    chunk.group.position.set(cx * WORLD_CONSTANTS.chunkSize, 0, cz * WORLD_CONSTANTS.chunkSize);
    root.add(chunk.group);
    createPatch(chunk.group, rand() > 0.5 ? materials.groundA : materials.groundB, 0, 0, WORLD_CONSTANTS.chunkSize, WORLD_CONSTANTS.chunkSize, 0);

    for (let index = 0; index < 7; index += 1) {
      createPatch(chunk.group, rand() > 0.5 ? materials.groundA : materials.groundB, (rand() - 0.5) * 44, (rand() - 0.5) * 44, 8 + rand() * 16, 8 + rand() * 16, 0.014);
    }

    const treePositions = [];
    const targetTrees = 24 + Math.floor(rand() * 6);
    for (let attempt = 0; attempt < targetTrees * 12 && treePositions.length < targetTrees; attempt += 1) {
      const tx = (rand() - 0.5) * 66;
      const tz = (rand() - 0.5) * 66;
      if (treePositions.every((entry) => (entry.x - tx) ** 2 + (entry.z - tz) ** 2 > 4.8 ** 2)) {
        treePositions.push({ x: tx, z: tz });
      }
    }
    for (const tree of treePositions) {
      createForestTree(chunk, rand, tree.x, tree.z, 1.02 + rand() * 0.48);
    }
    for (let index = 0; index < 20; index += 1) {
      createForestBush(chunk.group, rand, (rand() - 0.5) * 60, (rand() - 0.5) * 60, 0.7 + rand() * 0.8);
    }
    for (let index = 0; index < 16; index += 1) {
      createForestPlantPatch(chunk.group, rand, (rand() - 0.5) * 60, (rand() - 0.5) * 60, 1 + rand() * 1.4, 6 + Math.floor(rand() * 5));
    }
    for (let index = 0; index < 4; index += 1) {
      createCylinder(chunk.group, materials.bark, (rand() - 0.5) * 48, 0.42, (rand() - 0.5) * 48, 0.18 + rand() * 0.12, 2.8 + rand() * 2.6, { rx: Math.PI / 2, ry: rand() * Math.PI * 2, cast: false });
    }
    createCanopySheet(chunk.group, 0, 0, 128, 128, 32 + rand() * 3, 0.01, -0.02);
    createCanopySheet(chunk.group, -22, -18, 108, 106, 36 + rand() * 3, 0.03, -0.08);
    createCanopySheet(chunk.group, 24, 16, 106, 108, 38 + rand() * 3, -0.04, 0.05);
    createLeafDrift(chunk, rand, (rand() - 0.5) * 22, (rand() - 0.5) * 22, 7 + rand() * 5);

    const dreadRoll = rand();
    if (dreadRoll > 0.75) createCylinder(chunk.group, materials.bark, (rand() - 0.5) * 38, 0.34, (rand() - 0.5) * 38, 0.22, 5 + rand() * 4, { rx: Math.PI / 2, ry: rand() * Math.PI * 2, cast: false });
    if (dreadRoll > 0.84) createBox(chunk.group, rand() > 0.5 ? materials.cloth : materials.clothDark, (rand() - 0.5) * 34, 0.08, (rand() - 0.5) * 34, 1.2, 0.08, 0.9, { cast: false, ry: rand() * Math.PI });
    if (dreadRoll > 0.9) createCampfire(chunk.group, rand, (rand() - 0.5) * 28, (rand() - 0.5) * 28);
    if (dreadRoll > 0.965) createPatch(chunk.group, materials.blood, (rand() - 0.5) * 24, (rand() - 0.5) * 24, 1.3, 0.9, 0.031);
    chunks.set(`${cx},${cz}`, chunk);
  }

  const spawn = getMapTeleportState("forest");
  const centerX = getChunkCoord(spawn.x);
  const centerZ = getChunkCoord(spawn.z);
  const radius = options.radius ?? 1;
  for (let dz = -radius; dz <= radius; dz += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      createChunk(centerX + dx, centerZ + dz);
    }
  }

  return {
    root,
    mapName: "Forest",
    spawn,
    bounds: {
      minX: (centerX - radius - 0.5) * WORLD_CONSTANTS.chunkSize,
      maxX: (centerX + radius + 0.5) * WORLD_CONSTANTS.chunkSize,
      minY: 0.7,
      maxY: 95,
      minZ: (centerZ - radius - 0.5) * WORLD_CONSTANTS.chunkSize,
      maxZ: (centerZ + radius + 0.5) * WORLD_CONSTANTS.chunkSize,
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
