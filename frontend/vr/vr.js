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

function isButtonPressed(gamepad, index, threshold = 0.55) {
  const button = gamepad?.buttons?.[index];
  return Boolean(button?.pressed || button?.value > threshold);
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
  group.position.set(0, -0.26, -0.58);

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

  const upPressed = isButtonPressed(rightGamepad, 0) || isButtonPressed(rightGamepad, 4);
  const downPressed = isButtonPressed(leftGamepad, 0) || isButtonPressed(rightGamepad, 5);
  const speed = 5.6;
  const verticalSpeed = 4.2;

  const forward = new THREE.Vector3();
  state.camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 0.0001) {
    forward.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
  } else {
    forward.normalize();
  }
  const rightVector = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const movement = new THREE.Vector3()
    .addScaledVector(forward, -moveY)
    .addScaledVector(rightVector, moveX);

  if (movement.lengthSq() > 1) {
    movement.normalize();
  }
  state.playerRig.position.addScaledVector(movement, speed * delta);
  if (upPressed) {
    state.playerRig.position.y += verticalSpeed * delta;
  }
  if (downPressed) {
    state.playerRig.position.y -= verticalSpeed * delta;
  }
  state.playerRig.position.y = THREE.MathUtils.clamp(state.playerRig.position.y, 0.7, 80);
  updateFlyBody(time);
}

function createPreviewScene() {
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x11162d);
  state.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);
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

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5, 32),
    new THREE.MeshBasicMaterial({ color: 0x20264b, side: THREE.DoubleSide })
  );
  floor.rotation.x = -Math.PI / 2;
  state.scene.add(floor);

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
