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
  menuGroup: null,
  panelCanvas: null,
  panelContext: null,
  panelTexture: null,
  buttons: [],
  raycasters: [],
  selectedButton: null,
  lobbies: [],
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
    controller.addEventListener("selectstart", () => selectCurrentButton(controller));
    state.scene.add(controller);

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
      setStatus(`Joined ${snapshot.lobby?.name || lobby.name}. Flying movement comes in a later VR phase.`);
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
      setStatus(`Joined private server ${snapshot.lobby?.code || code}. Flying movement comes later.`);
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
      setStatus(`Created ${visibility} server ${snapshot.lobby?.code ? `code ${snapshot.lobby.code}` : ""}. Movement comes in a later phase.`);
    }
  } catch (error) {
    setStatus(error?.message || String(error), true);
  }
}

function createPreviewScene() {
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x11162d);
  state.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);
  state.camera.position.set(0, 1.55, 0);

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

  state.renderer.setAnimationLoop(() => {
    updateRayPointers();
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
setStatus("VR route loaded. Enter VR to open the floating server menu.");
