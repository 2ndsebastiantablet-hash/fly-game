export function createBoxMesh(THREE, geometries, parent, material, x, y, z, width, height, depth, options = {}) {
  const mesh = new THREE.Mesh(geometries.box, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  mesh.rotation.set(options.rx || 0, options.ry || 0, options.rz || 0);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

export function createCylinderMesh(THREE, geometries, parent, material, x, y, z, radius, height, options = {}) {
  const mesh = new THREE.Mesh(geometries.cylinder, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(radius * 2, height, radius * 2);
  mesh.rotation.set(options.rx || 0, options.ry || 0, options.rz || 0);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

export function createConeMesh(THREE, geometries, parent, material, x, y, z, width, height, depth, options = {}) {
  const geometry = options.round ? geometries.coneRound : geometries.coneSquare;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  mesh.rotation.set(options.rx || 0, options.ry || 0, options.rz || 0);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

export function createPatchMesh(THREE, geometries, parent, material, x, z, width, depth, y = 0.02) {
  const mesh = new THREE.Mesh(geometries.plane, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.scale.set(width, depth, 1);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createRingPatchMesh(THREE, parent, material, x, z, innerRadius, outerRadius, y = 0.02, segments = 40) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(innerRadius, outerRadius, segments),
    material
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createGroundHolePatchMesh(THREE, parent, material, x, z, width, depth, holeX, holeZ, holeRadius) {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.5, -depth * 0.5);
  shape.lineTo(width * 0.5, -depth * 0.5);
  shape.lineTo(width * 0.5, depth * 0.5);
  shape.lineTo(-width * 0.5, depth * 0.5);
  shape.lineTo(-width * 0.5, -depth * 0.5);

  const hole = new THREE.Path();
  hole.absellipse(holeX, holeZ, holeRadius, holeRadius, 0, Math.PI * 2, true, 0);
  shape.holes.push(hole);

  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0, z);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createDefaultWorldGeometries(THREE) {
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(0.5, 12, 8),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    coneSquare: new THREE.ConeGeometry(0.72, 1, 4),
    coneRound: new THREE.ConeGeometry(0.6, 1, 8),
    plane: new THREE.PlaneGeometry(1, 1),
  };
}
