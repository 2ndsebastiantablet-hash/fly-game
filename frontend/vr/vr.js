import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const statusEl = document.querySelector("#vr-status");
const enterButton = document.querySelector("#vr-enter-button");
const nameInput = document.querySelector("#vr-name-input");
const codeInput = document.querySelector("#vr-code-input");

const configuredApiOrigin = String(window.FLYS_WORLD_CONFIG?.apiOrigin || "")
  .trim()
  .replace(/\/+$/, "");
const apiBase = `${configuredApiOrigin || window.location.origin}/api`;

const state = {
  renderer: null,
  scene: null,
  camera: null,
  playerRig: null,
  flyBody: null,
  menuGroup: null,
  panelCanvas: null,
  panelContext: null,
  panelTexture: null,
  buttons: [],
  controllers: [],
  raycasters: [],
  worldRoot: null,
  selectedButton: null,
  lobbies: [],
  joined: false,
  playerToken: "",
  heartbeatTimer: null,
  heartbeatInFlight: false,
  yaw: 0,
  lastFrameTime: 0,
  lastSnapTurnAt: 0,
  status: "VR menu ready. Use either trigger to select.",
};

function setStatus(message, isError = false) {
  state.status = message;
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#ffb7b7" : "";
  }
  redrawPanel();
}

function getDisplayName() {
  const savedName = window.localStorage.getItem("flys-world-vr-display-name") || "";
  const value = (nameInput?.value || savedName).trim().slice(0, 20);
  const nextName = value || `VR Fly ${Math.floor(1000 + Math.random() * 9000)}`;
  window.localStorage.setItem("flys-world-vr-display-name", nextName);
  if (nameInput) {
    nameInput.value = nextName;
  }
  return nextName;
}

function getDisplayNameLabel() {
  return (nameInput?.value || window.localStorage.getItem("flys-world-vr-display-name") || "VR Fly").trim().slice(0, 20) || "VR Fly";
}

function getPrivateCode() {
  return (codeInput?.value || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12);
}

function getControllerHand(controller, fallbackIndex = 0) {
  return controller?.userData.inputSource?.handedness || (fallbackIndex === 0 ? "left" : "right");
}

function getControllerGamepad(controller) {
  return controller?.userData.inputSource?.gamepad || null;
}

function getAxisValue(gamepad, primaryIndex, fallbackIndex) {
  const primary = gamepad?.axes?.[primaryIndex] || 0;
  if (Math.abs(primary) > 0.08) {
    return primary;
  }
  return gamepad?.axes?.[fallbackIndex] || 0;
}

async function apiRequest(path, body = null, method = "GET") {
  const options = {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${apiBase}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function makeCanvasTexture(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return { canvas, context, texture };
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawText(context, text, x, y, maxWidth) {
  const words = String(text).split(" ");
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, y);
      line = word;
      y += 28;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
}

function redrawPanel() {
  if (!state.panelContext || !state.panelTexture) {
    return;
  }

  const context = state.panelContext;
  context.clearRect(0, 0, 1024, 768);
  context.fillStyle = "#121729";
  context.fillRect(0, 0, 1024, 768);

  context.fillStyle = "#202b4d";
  for (let y = 0; y < 768; y += 32) {
    context.fillRect(0, y, 1024, 2);
  }
  for (let x = 0; x < 1024; x += 32) {
    context.fillRect(x, 0, 2, 768);
  }

  context.fillStyle = "#f1c856";
  context.font = "bold 36px Trebuchet MS, sans-serif";
  context.fillText("FLYS WORLD VR", 48, 64);

  context.fillStyle = "#ffffff";
  context.font = "bold 56px Trebuchet MS, sans-serif";
  context.fillText("Main Menu", 48, 122);

  context.fillStyle = "#cbd8ff";
  context.font = "24px Trebuchet MS, sans-serif";
  context.fillText(`Name: ${getDisplayNameLabel()}`, 52, 168);
  context.fillText(`Private Code: ${getPrivateCode() || "enter on flat screen before VR"}`, 52, 202);

  context.fillStyle = "#9fb1df";
  context.font = "22px Trebuchet MS, sans-serif";
  drawText(context, state.status, 52, 246, 900);

  state.buttons.forEach((button) => {
    const { rect } = button.userData;
    const selected = state.selectedButton === button;
    context.fillStyle = selected ? "#ffe68a" : "#30406f";
    roundRect(context, rect.x, rect.y, rect.w, rect.h, 18);
    context.fill();
    context.strokeStyle = selected ? "#ffffff" : "#7591db";
    context.lineWidth = selected ? 5 : 3;
    context.stroke();
    context.fillStyle = selected ? "#15120b" : "#f4f7ff";
    context.font = "bold 28px Trebuchet MS, sans-serif";
    context.fillText(button.userData.label, rect.x + 24, rect.y + 46);
  });

  if (state.lobbies.length) {
    context.fillStyle = "#dce8ff";
    context.font = "22px Trebuchet MS, sans-serif";
    state.lobbies.slice(0, 4).forEach((lobby, index) => {
      context.fillText(`${index + 1}. ${lobby.name} (${lobby.playerCount}/${lobby.maxPlayers})`, 555, 404 + index * 34);
    });
  }

  state.panelTexture.needsUpdate = true;
}

function createButton(label, action, rect, x, y) {
  const geometry = new THREE.PlaneGeometry(rect.w / 1024 * 3.6, rect.h / 768 * 2.7);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.01,
    side: THREE.DoubleSide,
  });
  const button = new THREE.Mesh(geometry, material);
  button.position.set(x, y, 0.012);
  button.userData = { label, action, rect };
  state.menuGroup.add(button);
  state.buttons.push(button);
  return button;
}

function setupMenuPanel() {
  const { context, texture } = makeCanvasTexture(1024, 768);
  state.panelContext = context;
  state.panelTexture = texture;

  state.menuGroup = new THREE.Group();
  state.menuGroup.position.set(0, 1.55, -2.35);
  state.scene.add(state.menuGroup);

  const panelMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.7), panelMaterial);
  state.menuGroup.add(panel);

  const buttonRects = [
    { label: "Create Public Server", action: "create-public", rect: { x: 52, y: 330, w: 420, h: 72 }, x: -0.92, y: 0.03 },
    { label: "Create Private Server", action: "create-private", rect: { x: 52, y: 420, w: 420, h: 72 }, x: -0.92, y: -0.28 },
    { label: "See Public Servers", action: "refresh-public", rect: { x: 52, y: 510, w: 420, h: 72 }, x: -0.92, y: -0.59 },
    { label: "Join First Public", action: "join-first-public", rect: { x: 552, y: 330, w: 420, h: 72 }, x: 0.84, y: 0.03 },
    { label: "Join With Code", action: "join-code", rect: { x: 552, y: 510, w: 420, h: 72 }, x: 0.84, y: -0.59 },
  ];
  buttonRects.forEach((config) => createButton(config.label, config.action, config.rect, config.x, config.y));
  redrawPanel();
}

function setupControllers() {
  for (let index = 0; index < 2; index += 1) {
    const controller = state.renderer.xr.getController(index);
    controller.userData.index = index;
    controller.addEventListener("connected", (event) => {
      controller.userData.inputSource = event.data;
    });
    controller.addEventListener("disconnected", () => {
      controller.userData.inputSource = null;
    });
    controller.addEventListener("selectstart", () => selectCurrentButton(controller));
    state.playerRig.add(controller);
    state.controllers.push(controller);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -3),
    ]);
    const line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0xf1c856 }));
    line.name = "VRRayPointer";
    controller.add(line);
    state.raycasters.push({ controller, raycaster: new THREE.Raycaster(), line });
  }
}

function updateRayPointers() {
  if (state.joined) {
    state.selectedButton = null;
    return;
  }
  state.selectedButton = null;
  for (const pointer of state.raycasters) {
    const tempMatrix = new THREE.Matrix4().identity().extractRotation(pointer.controller.matrixWorld);
    pointer.raycaster.ray.origin.setFromMatrixPosition(pointer.controller.matrixWorld);
    pointer.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    const hits = pointer.raycaster.intersectObjects(state.buttons, false);
    const hit = hits[0]?.object || null;
    pointer.line.material.color.set(hit ? 0xffffff : 0xf1c856);
    if (hit) {
      state.selectedButton = hit;
    }
  }
  redrawPanel();
}

function selectCurrentButton(controller) {
  if (state.joined) {
    return;
  }
  const pointer = state.raycasters.find((item) => item.controller === controller);
  if (!pointer) {
    return;
  }
  const tempMatrix = new THREE.Matrix4().identity().extractRotation(controller.matrixWorld);
  pointer.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  pointer.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  const hit = pointer.raycaster.intersectObjects(state.buttons, false)[0]?.object;
  if (hit) {
    runMenuAction(hit.userData.action);
  }
}

async function runMenuAction(action) {
  try {
    if (action === "refresh-public") {
      const data = await apiRequest("/public-lobbies");
      state.lobbies = data.lobbies || [];
      setStatus(state.lobbies.length ? `Found ${state.lobbies.length} public server(s).` : "No public servers are live yet.");
      return;
    }

    if (action === "join-first-public") {
      if (!state.lobbies.length) {
        const data = await apiRequest("/public-lobbies");
        state.lobbies = data.lobbies || [];
      }
      const lobby = state.lobbies.find((item) => item.playerCount < item.maxPlayers);
      if (!lobby) {
        setStatus("No joinable public server found.", true);
        return;
      }
      const snapshot = await apiRequest("/join-public", {
        lobbyId: lobby.id,
        displayName: getDisplayName(),
        color: "#69C9FF",
      }, "POST");
      startVrFlight(snapshot);
      return;
    }

    if (action === "join-code") {
      const code = getPrivateCode();
      if (!code) {
        setStatus("Type a private code on the flat VR start screen first.", true);
        return;
      }
      const snapshot = await apiRequest("/join-private", {
        code,
        displayName: getDisplayName(),
        color: "#69C9FF",
      }, "POST");
      startVrFlight(snapshot);
      return;
    }

    if (action === "create-public" || action === "create-private") {
      const visibility = action === "create-private" ? "private" : "public";
      const code = visibility === "private" ? (getPrivateCode() || `VR${Math.floor(1000 + Math.random() * 9000)}`) : "";
      if (codeInput && visibility === "private") {
        codeInput.value = code;
      }
      const snapshot = await apiRequest("/create-lobby", {
        displayName: getDisplayName(),
        lobbyName: `${getDisplayName()}'s VR Room`,
        visibility,
        code,
        color: "#69C9FF",
      }, "POST");
      startVrFlight(snapshot);
    }
  } catch (error) {
    setStatus(error?.message || String(error), true);
  }
}

function startVrFlight(snapshot) {
  state.joined = true;
  state.playerToken = snapshot.player?.token || "";
  state.menuGroup.visible = false;
  state.buttons.forEach((button) => {
    button.visible = false;
  });
  if (!state.flyBody) {
    state.flyBody = createFirstPersonFly();
    state.camera.add(state.flyBody);
  }
  state.playerRig.position.set(
    Number(snapshot.player?.state?.x) || 0,
    Number(snapshot.player?.state?.y) || 3.8,
    Number(snapshot.player?.state?.z) || 0
  );
  setStatus(`Joined ${snapshot.lobby?.name || "server"}. VR flying controls active.`);
  startHeartbeatLoop(true);
}

function buildVrPlayerState() {
  return {
    x: state.playerRig.position.x,
    y: state.playerRig.position.y,
    z: state.playerRig.position.z,
    yaw: state.yaw,
    pitch: 0,
    roll: 0,
  };
}

async function syncVrSession() {
  if (!state.joined || !state.playerToken || state.heartbeatInFlight) {
    return;
  }
  state.heartbeatInFlight = true;
  try {
    await apiRequest("/heartbeat", {
      playerToken: state.playerToken,
      state: buildVrPlayerState(),
      color: "#69C9FF",
    }, "POST");
  } catch (error) {
    setStatus(`VR server sync failed: ${error?.message || String(error)}`, true);
  } finally {
    state.heartbeatInFlight = false;
  }
}

function startHeartbeatLoop(runImmediately = false) {
  stopHeartbeatLoop();
  if (runImmediately) {
    syncVrSession();
  }
  state.heartbeatTimer = window.setInterval(syncVrSession, 900);
}

function stopHeartbeatLoop() {
  if (state.heartbeatTimer) {
    window.clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }
}

function createFirstPersonFly() {
  const group = new THREE.Group();
  group.position.set(0, -0.28, -0.62);

  const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x2c2735 });
  const wingMaterial = new THREE.MeshBasicMaterial({ color: 0xb8f2ff, transparent: true, opacity: 0.44, side: THREE.DoubleSide });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b72 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), bodyMaterial);
  body.scale.set(1, 0.75, 1.5);
  group.add(body);

  const leftWing = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), wingMaterial);
  leftWing.position.set(-0.12, 0.05, 0);
  leftWing.rotation.set(-0.45, 0.25, -0.35);
  group.add(leftWing);

  const rightWing = leftWing.clone();
  rightWing.position.x *= -1;
  rightWing.rotation.z *= -1;
  group.add(rightWing);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), eyeMaterial);
  leftEye.position.set(-0.045, 0.025, -0.09);
  group.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.x *= -1;
  group.add(rightEye);

  const antennaMaterial = new THREE.LineBasicMaterial({ color: 0xf1c856 });
  for (const side of [-1, 1]) {
    const antenna = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(side * 0.025, 0.06, -0.08),
        new THREE.Vector3(side * 0.09, 0.12, -0.18),
      ]),
      antennaMaterial
    );
    group.add(antenna);
  }

  return group;
}

const retroMaterials = new Map();

function makeRetroTexture(key, draw, width = 64, height = 64) {
  const cacheKey = `${key}:${width}x${height}`;
  if (retroMaterials.has(cacheKey)) {
    return retroMaterials.get(cacheKey);
  }
  const { context, texture } = makeCanvasTexture(width, height);
  draw(context, width, height);
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  retroMaterials.set(cacheKey, material);
  return material;
}

function makeFlatMaterial(color) {
  const key = `flat:${color}`;
  if (!retroMaterials.has(key)) {
    retroMaterials.set(key, new THREE.MeshBasicMaterial({ color }));
  }
  return retroMaterials.get(key);
}

function makeWallMaterial(key, base, trim, windowColor = "#9fb8d8", lit = false) {
  return makeRetroTexture(key, (context, width, height) => {
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);
    context.fillStyle = trim;
    for (let y = 0; y < height; y += 16) {
      context.fillRect(0, y, width, 2);
    }
    for (let x = 0; x < width; x += 16) {
      context.fillRect(x, 0, 2, height);
    }
    context.fillStyle = lit ? "#ffd56f" : windowColor;
    for (let y = 8; y < height - 6; y += 18) {
      for (let x = 7; x < width - 8; x += 18) {
        context.fillRect(x, y, 7, 8);
        context.fillStyle = "rgba(8, 12, 24, 0.35)";
        context.fillRect(x, y + 8, 7, 2);
        context.fillStyle = lit ? "#ffd56f" : windowColor;
      }
    }
  });
}

function makeMarbleMaterial(key, base = "#f4f1dc", trim = "#d6a840") {
  return makeRetroTexture(key, (context, width, height) => {
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(156, 145, 129, 0.34)";
    for (let i = 0; i < 22; i += 1) {
      const x = (i * 19) % width;
      const y = (i * 11) % height;
      context.fillRect(x, y, 9, 2);
      context.fillRect((x + 4) % width, (y + 4) % height, 2, 8);
    }
    context.fillStyle = trim;
    context.fillRect(0, 0, width, 4);
    context.fillRect(0, height - 4, width, 4);
    context.fillRect(0, 0, 4, height);
    context.fillRect(width - 4, 0, 4, height);
  });
}

function makeRoofMaterial(key, base = "#5a2f38", stripe = "#3a1c22") {
  return makeRetroTexture(key, (context, width, height) => {
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);
    context.fillStyle = stripe;
    for (let y = 0; y < height; y += 10) {
      context.fillRect(0, y, width, 3);
    }
    context.fillStyle = "rgba(255, 214, 118, 0.35)";
    context.fillRect(7, 8, 9, 3);
    context.fillRect(38, 31, 13, 3);
  });
}

function makeGroundMaterial(key, base, stripe) {
  return makeRetroTexture(key, (context, width, height) => {
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);
    context.fillStyle = stripe;
    for (let y = 0; y < height; y += 16) {
      context.fillRect(0, y, width, 2);
    }
    for (let x = 0; x < width; x += 16) {
      context.fillRect(x, 0, 2, height);
    }
  });
}

function createBox(parent, position, scale, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.scale.set(scale.x, scale.y, scale.z);
  parent.add(mesh);
  return mesh;
}

function createFaceBox(parent, position, scale, faces) {
  return createBox(parent, position, scale, [
    faces.side,
    faces.side,
    faces.top,
    faces.bottom || faces.top,
    faces.front,
    faces.back || faces.side,
  ]);
}

function createBillboardLabel(parent, text, position, width = 6, height = 1.3) {
  const { context, texture } = makeCanvasTexture(256, 80);
  context.fillStyle = "rgba(10, 12, 26, 0.82)";
  roundRect(context, 8, 8, 240, 64, 8);
  context.fill();
  context.strokeStyle = "#f5c84b";
  context.lineWidth = 5;
  context.stroke();
  context.fillStyle = "#f8efd0";
  context.font = "bold 24px monospace";
  context.textAlign = "center";
  context.fillText(text, 128, 49);
  texture.needsUpdate = true;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
  );
  mesh.position.set(position.x, position.y, position.z);
  parent.add(mesh);
  return mesh;
}

function createRetroHouse(parent, x, z, colorKey = 0) {
  const palettes = [
    ["#8d5945", "#442a32", "#b4c9df"],
    ["#406d78", "#1e3747", "#c7d8e5"],
    ["#91704b", "#4c3226", "#b9cfe2"],
  ];
  const [base, trim, glass] = palettes[colorKey % palettes.length];
  const wall = makeWallMaterial(`vr-house-wall-${colorKey}`, base, trim, glass);
  const roof = makeRoofMaterial(`vr-house-roof-${colorKey}`);
  const dark = makeFlatMaterial(0x1d1720);
  createFaceBox(parent, { x, y: 2.1, z }, { x: 5.2, y: 4.2, z: 4.4 }, {
    front: wall,
    back: wall,
    side: wall,
    top: roof,
    bottom: dark,
  });
  createBox(parent, { x, y: 4.55, z }, { x: 5.8, y: 0.7, z: 4.9 }, roof);
  createBox(parent, { x: x - 1.4, y: 1.05, z: z - 2.25 }, { x: 0.85, y: 1.9, z: 0.12 }, makeFlatMaterial(0x2a1d20));
}

function createRetroTower(parent, x, z, width, depth, height, colorKey = 0) {
  const palettes = [
    ["#474d68", "#202538", "#93a8c8"],
    ["#6c4f4d", "#2f232a", "#8ea4c0"],
    ["#505b54", "#27322f", "#a7bacb"],
  ];
  const [base, trim, glass] = palettes[colorKey % palettes.length];
  const wall = makeWallMaterial(`vr-tower-wall-${colorKey}`, base, trim, glass);
  const roof = makeRoofMaterial(`vr-tower-roof-${colorKey}`, "#282b36", "#151822");
  createFaceBox(parent, { x, y: height / 2, z }, { x: width, y: height, z: depth }, {
    front: wall,
    back: wall,
    side: wall,
    top: roof,
    bottom: makeFlatMaterial(0x191922),
  });
  createBox(parent, { x: x - width * 0.35, y: height + 0.55, z }, { x: width * 0.22, y: 1.1, z: depth * 0.42 }, makeFlatMaterial(0x232637));
}

function createTree(parent, x, z, height = 10, canopyColor = 0x184c2b) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, height * 0.55, 6), makeFlatMaterial(0x4b2b20));
  trunk.position.set(x, height * 0.28, z);
  parent.add(trunk);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.1, height * 0.62, 7), makeFlatMaterial(canopyColor));
  canopy.position.set(x, height * 0.76, z);
  parent.add(canopy);
}

function createVehicle(parent, x, z, color = 0xd85a3c, long = false) {
  createBox(parent, { x, y: 0.42, z }, { x: long ? 5.8 : 3.1, y: 0.65, z: 1.55 }, makeFlatMaterial(color));
  createBox(parent, { x: x - 0.25, y: 0.96, z }, { x: long ? 2.7 : 1.35, y: 0.65, z: 1.28 }, makeFlatMaterial(0x263247));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 8), makeFlatMaterial(0x111114));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x + sx * (long ? 2.15 : 1.05), 0.22, z + sz * 0.82);
      parent.add(wheel);
    }
  }
}

function createLamp(parent, x, z) {
  createBox(parent, { x, y: 2.2, z }, { x: 0.12, y: 4.4, z: 0.12 }, makeFlatMaterial(0x23222b));
  createBox(parent, { x, y: 4.45, z: z - 0.42 }, { x: 0.8, y: 0.18, z: 0.18 }, makeFlatMaterial(0x23222b));
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), makeFlatMaterial(0xffd56f));
  light.position.set(x, 4.35, z - 0.85);
  parent.add(light);
}

function createNeighborhood(parent) {
  const zone = new THREE.Group();
  parent.add(zone);
  const grass = makeGroundMaterial("vr-grass", "#426e31", "#315326");
  const road = makeGroundMaterial("vr-road", "#292a31", "#1a1a21");
  const sidewalk = makeGroundMaterial("vr-sidewalk", "#8a8378", "#686158");
  createBox(zone, { x: 0, y: -0.06, z: 0 }, { x: 92, y: 0.1, z: 92 }, grass);
  createBox(zone, { x: 0, y: 0.01, z: 0 }, { x: 86, y: 0.05, z: 6 }, road);
  createBox(zone, { x: 0, y: 0.03, z: -6 }, { x: 86, y: 0.06, z: 2.4 }, sidewalk);
  createBox(zone, { x: 0, y: 0.03, z: 6 }, { x: 86, y: 0.06, z: 2.4 }, sidewalk);
  for (let i = 0; i < 7; i += 1) {
    const x = -36 + i * 12;
    createRetroHouse(zone, x, -17, i);
    createRetroHouse(zone, x + 4, 18, i + 1);
    createLamp(zone, x + 5, -6.8);
    createVehicle(zone, x - 2, (i % 2 ? 1.8 : -1.8), i % 2 ? 0x3f74b5 : 0xc45d36);
  }
  for (let i = 0; i < 16; i += 1) {
    createTree(zone, -42 + (i % 8) * 12, i < 8 ? -33 : 34, 6.5, 0x2f793f);
  }
  createBillboardLabel(zone, "NEIGHBORHOOD", { x: 0, y: 6.5, z: -31 });
}

function createForest(parent) {
  const zone = new THREE.Group();
  zone.position.set(98, 0, 10);
  parent.add(zone);
  createBox(zone, { x: 0, y: -0.08, z: 0 }, { x: 78, y: 0.1, z: 92 }, makeGroundMaterial("vr-forest-ground", "#172d1c", "#0d1c12"));
  for (let i = 0; i < 56; i += 1) {
    const x = -34 + (i % 8) * 9.6 + ((i * 7) % 3);
    const z = -40 + Math.floor(i / 8) * 12 + ((i * 5) % 4);
    createTree(zone, x, z, 15 + (i % 4) * 2, i % 3 === 0 ? 0x0d291b : 0x123820);
  }
  createBox(zone, { x: 0, y: 15.5, z: 0 }, { x: 78, y: 0.55, z: 92 }, makeFlatMaterial(0x0a1b10));
  for (let i = 0; i < 18; i += 1) {
    createBox(zone, { x: -30 + (i % 6) * 12, y: 0.22, z: -28 + Math.floor(i / 6) * 21 }, { x: 2.5, y: 0.4, z: 1.5 }, makeFlatMaterial(0x315d2f));
  }
  createBillboardLabel(zone, "FOREST", { x: 0, y: 7.5, z: -42 });
}

function createCity(parent) {
  const zone = new THREE.Group();
  zone.position.set(0, 0, -118);
  parent.add(zone);
  const asphalt = makeGroundMaterial("vr-city-asphalt", "#242229", "#15151c");
  const sidewalk = makeGroundMaterial("vr-city-sidewalk", "#756f72", "#575157");
  createBox(zone, { x: 0, y: -0.08, z: 0 }, { x: 112, y: 0.1, z: 96 }, asphalt);
  for (let lane = -1; lane <= 1; lane += 1) {
    createBox(zone, { x: lane * 24, y: 0.02, z: 0 }, { x: 7.5, y: 0.05, z: 92 }, makeFlatMaterial(0x2e2c33));
    createBox(zone, { x: 0, y: 0.03, z: lane * 24 }, { x: 108, y: 0.05, z: 5.8 }, makeFlatMaterial(0x2e2c33));
  }
  for (let i = 0; i < 12; i += 1) {
    createBox(zone, { x: -50 + i * 9, y: 0.05, z: -34 }, { x: 6.5, y: 0.08, z: 4 }, sidewalk);
    createBox(zone, { x: -50 + i * 9, y: 0.05, z: 34 }, { x: 6.5, y: 0.08, z: 4 }, sidewalk);
  }
  for (let i = 0; i < 14; i += 1) {
    const x = -46 + (i % 7) * 15;
    const z = i < 7 ? -35 : 35;
    createRetroTower(zone, x, z, 7 + (i % 3), 7, 13 + (i % 5) * 4, i);
  }
  createFaceBox(zone, { x: -35, y: 4, z: 0 }, { x: 12, y: 8, z: 8 }, {
    front: makeWallMaterial("vr-bank-front", "#77664d", "#2e2630", "#ffd56f", true),
    side: makeWallMaterial("vr-bank-side", "#66574b", "#2e2630", "#b9cfe2"),
    top: makeMarbleMaterial("vr-bank-roof", "#d4c9a2", "#bc8f32"),
    bottom: makeFlatMaterial(0x211a1c),
  });
  createBillboardLabel(zone, "BANK", { x: -35, y: 9.4, z: -4.2 }, 4, 1);
  createFaceBox(zone, { x: 34, y: 6.5, z: 0 }, { x: 11, y: 13, z: 8 }, {
    front: makeWallMaterial("vr-hotel-front", "#634f66", "#281f34", "#ffd56f", true),
    side: makeWallMaterial("vr-hotel-side", "#58495d", "#281f34", "#a3b7d2"),
    top: makeRoofMaterial("vr-hotel-roof", "#343142", "#1d1b28"),
    bottom: makeFlatMaterial(0x211a1c),
  });
  createBillboardLabel(zone, "CITY", { x: 0, y: 12, z: -45 });
  for (let i = 0; i < 18; i += 1) {
    createVehicle(zone, -48 + (i % 9) * 12, -12 + Math.floor(i / 9) * 24, i % 3 === 0 ? 0xc0a04b : 0x3f74b5, i % 5 === 0);
    if (i % 2 === 0) createLamp(zone, -48 + i * 5.5, -26);
  }
}

function createHaven(parent) {
  const zone = new THREE.Group();
  zone.position.set(-115, 12, 64);
  parent.add(zone);
  const marble = makeMarbleMaterial("vr-haven-marble");
  const gold = makeFlatMaterial(0xd6a840);
  const hedge = makeFlatMaterial(0x3a8a46);
  createBox(zone, { x: 0, y: -0.2, z: 0 }, { x: 54, y: 0.35, z: 54 }, marble);
  createBox(zone, { x: 0, y: 4.5, z: -18 }, { x: 30, y: 9, z: 2 }, makeMarbleMaterial("vr-haven-wall"));
  for (let i = 0; i < 6; i += 1) {
    const x = -20 + i * 8;
    createBox(zone, { x, y: 3, z: -12 }, { x: 1.1, y: 6, z: 1.1 }, gold);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), makeFlatMaterial(0xfff0a4));
    orb.position.set(x, 6.6, -12);
    zone.add(orb);
  }
  for (let i = 0; i < 10; i += 1) {
    createBox(zone, { x: -23 + i * 5, y: 1.5, z: 14 }, { x: 1.3, y: 3, z: 10 }, hedge);
    createBox(zone, { x: -23 + i * 5, y: 1.5, z: 24 }, { x: 4.2, y: 3, z: 1.2 }, hedge);
  }
  createBox(zone, { x: 0, y: 15, z: 20 }, { x: 5, y: 30, z: 5 }, makeMarbleMaterial("vr-haven-tower", "#f2edff", "#d6a840"));
  createBox(zone, { x: 0, y: 31, z: 20 }, { x: 12, y: 1.4, z: 12 }, gold);
  createBillboardLabel(zone, "HAVEN", { x: 0, y: 8.8, z: -25 });
}

function createVrWorld() {
  state.worldRoot = new THREE.Group();
  state.scene.add(state.worldRoot);
  state.scene.background = new THREE.Color(0x8cc4f6);
  state.scene.fog = new THREE.Fog(0x8cc4f6, 95, 320);
  createNeighborhood(state.worldRoot);
  createForest(state.worldRoot);
  createCity(state.worldRoot);
  createHaven(state.worldRoot);
}

function updateFlyBody(time) {
  if (!state.flyBody) {
    return;
  }
  const flap = Math.sin(time * 0.04);
  const wings = state.flyBody.children.filter((child) => child.geometry?.type === "PlaneGeometry");
  wings.forEach((wing, index) => {
    wing.rotation.y = (index === 0 ? 0.25 : -0.25) + flap * 0.22;
  });
}

function updateVrMovement(delta, time) {
  if (!state.joined || !state.playerRig) {
    return;
  }

  const left = state.controllers.find((controller) => getControllerHand(controller, controller.userData.index) === "left") || state.controllers[0];
  const right = state.controllers.find((controller) => getControllerHand(controller, controller.userData.index) === "right") || state.controllers[1];
  const leftGamepad = getControllerGamepad(left);
  const rightGamepad = getControllerGamepad(right);

  const moveX = THREE.MathUtils.clamp(getAxisValue(leftGamepad, 2, 0), -1, 1);
  const moveY = THREE.MathUtils.clamp(getAxisValue(leftGamepad, 3, 1), -1, 1);
  const turnX = THREE.MathUtils.clamp(getAxisValue(rightGamepad, 2, 0), -1, 1);
  const now = performance.now();

  if (Math.abs(turnX) > 0.72 && now - state.lastSnapTurnAt > 320) {
    state.yaw -= Math.sign(turnX) * Math.PI / 6;
    state.playerRig.rotation.y = state.yaw;
    state.lastSnapTurnAt = now;
  }

  const speed = 5.6;

  const forward = new THREE.Vector3();
  state.camera.getWorldDirection(forward);
  if (forward.lengthSq() < 0.0001) {
    forward.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
  } else {
    forward.normalize();
  }
  const flatForward = forward.clone();
  flatForward.y = 0;
  if (flatForward.lengthSq() < 0.0001) {
    flatForward.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
  } else {
    flatForward.normalize();
  }
  const rightVector = new THREE.Vector3().crossVectors(flatForward, new THREE.Vector3(0, 1, 0)).normalize();
  const movement = new THREE.Vector3()
    .addScaledVector(forward, -moveY)
    .addScaledVector(rightVector, moveX);

  if (movement.lengthSq() > 1) {
    movement.normalize();
  }
  state.playerRig.position.addScaledVector(movement, speed * delta);
  state.playerRig.position.y = THREE.MathUtils.clamp(state.playerRig.position.y, 0.7, 95);
  state.playerRig.position.x = THREE.MathUtils.clamp(state.playerRig.position.x, -170, 155);
  state.playerRig.position.z = THREE.MathUtils.clamp(state.playerRig.position.z, -190, 115);
  updateFlyBody(time);
}

function createPreviewScene() {
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x8cc4f6);
  state.camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.01, 900);
  state.camera.position.set(0, 1.55, 0);
  state.playerRig = new THREE.Group();
  state.playerRig.position.set(0, 0, 0);
  state.playerRig.add(state.camera);
  state.scene.add(state.playerRig);

  state.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.xr.enabled = true;
  state.renderer.domElement.className = "vr-canvas";
  document.body.prepend(state.renderer.domElement);

  createVrWorld();

  setupMenuPanel();
  setupControllers();

  window.addEventListener("resize", () => {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
  });

  state.renderer.setAnimationLoop((time) => {
    const delta = state.lastFrameTime ? Math.min((time - state.lastFrameTime) / 1000, 0.05) : 0;
    state.lastFrameTime = time;
    updateRayPointers();
    updateVrMovement(delta, time);
    state.renderer.render(state.scene, state.camera);
  });
  document.body.classList.add("is-vr-preview");
}

async function enterVr() {
  getDisplayName();
  if (!state.renderer) {
    createPreviewScene();
  }

  if (!("xr" in navigator)) {
    setStatus("WebXR is not available in this browser. Showing the flat VR menu preview.", true);
    return;
  }

  try {
    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    if (!supported) {
      setStatus("Immersive VR is not supported here. Showing the flat VR menu preview.", true);
      return;
    }
    const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor"] });
    state.renderer.xr.setSession(session);
    setStatus("VR menu active. Aim either controller ray and pull trigger.");
  } catch (error) {
    setStatus(`Could not enter VR: ${error?.message || String(error)}`, true);
  }
}

if (nameInput) {
  nameInput.value = window.localStorage.getItem("flys-world-vr-display-name") || "";
}

enterButton?.addEventListener("click", enterVr);
window.addEventListener("beforeunload", () => {
  stopHeartbeatLoop();
});
setStatus("VR route loaded. Enter VR to open the floating server menu.");
