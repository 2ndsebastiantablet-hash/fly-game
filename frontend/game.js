import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const app = document.querySelector("#app");
const menuOverlay = document.querySelector("#menu-overlay");
const menuShell = document.querySelector(".menu-shell");
const menuViews = [...document.querySelectorAll(".menu-view")];
const menuPlayButton = document.querySelector("#menu-play-button");
const menuBackHomeButton = document.querySelector("#menu-back-home-button");
const menuBackBrowserButton = document.querySelector("#menu-back-browser-button");
const openCreateButton = document.querySelector("#open-create-button");
const refreshServersButton = document.querySelector("#refresh-servers-button");
const createLobbyButton = document.querySelector("#create-lobby-button");
const joinCodeButton = document.querySelector("#join-code-button");
const displayNameInput = document.querySelector("#display-name-input");
const joinCodeInput = document.querySelector("#join-code-input");
const createLobbyNameInput = document.querySelector("#create-lobby-name-input");
const createCodeInput = document.querySelector("#create-code-input");
const visibilityPublicButton = document.querySelector("#visibility-public-button");
const visibilityPrivateButton = document.querySelector("#visibility-private-button");
const privateCodeField = document.querySelector("#private-code-field");
const createHelpCopy = document.querySelector("#create-help-copy");
const publicServerListEl = document.querySelector("#public-server-list");
const publicServerCountEl = document.querySelector("#public-server-count");
const menuStatusEl = document.querySelector("#menu-status");
const sessionPanel = document.querySelector("#session-panel");
const enterFlightButton = document.querySelector("#enter-flight-button");
const copyServerCodeButton = document.querySelector("#copy-server-code-button");
const leaveServerButton = document.querySelector("#leave-server-button");
const mapSelectLabelEl = document.querySelector("#map-select-label");
const mapNeighborhoodButton = document.querySelector("#map-neighborhood-button");
const mapForestButton = document.querySelector("#map-forest-button");
const mapCityButton = document.querySelector("#map-city-button");
const mapCaveButton = document.querySelector("#map-cave-button");
const playerColorLabelEl = document.querySelector("#player-color-label");
const playerColorPickerEl = document.querySelector("#player-color-picker");
const sessionTitleEl = document.querySelector("#session-title");
const sessionCopyEl = document.querySelector("#session-copy");
const sessionAccessChip = document.querySelector("#session-access-chip");
const sessionHostChip = document.querySelector("#session-host-chip");
const rosterListEl = document.querySelector("#roster-list");
const rosterCountEl = document.querySelector("#roster-count");
const serverNameEl = document.querySelector("#server-name");
const playerCountEl = document.querySelector("#player-count");
const serverVisibilityEl = document.querySelector("#server-visibility");
const serverCodeRow = document.querySelector("#server-code-row");
const serverCodeEl = document.querySelector("#server-code");
const districtEl = document.querySelector("#district");
const speedEl = document.querySelector("#speed");
const altitudeEl = document.querySelector("#altitude");
const lifeCountEl = document.querySelector("#life-count");
const statusEl = document.querySelector("#status");
const staminaLabelEl = document.querySelector("#stamina-label");
const staminaFillEl = document.querySelector("#stamina-fill");

const configuredApiOrigin = String(window.FLYS_WORLD_CONFIG?.apiOrigin || "")
  .trim()
  .replace(/\/+$/, "");
const apiOrigin = configuredApiOrigin || window.location.origin;
const apiBase = `${apiOrigin}/api`;
const maxLobbyPlayers = 20;
const activeSessionStorageKey = "flys-world-active-session";
const playerColorStorageKey = "flys-world-player-color";
const browserRefreshIntervalMs = 3000;
const heartbeatIntervalMs = 900;
const smokeTestMode = new URLSearchParams(window.location.search).get("smokeTest");
const flyColorPalette = [
  { name: "Sunflare", value: "#FFB347" },
  { name: "Rose Ember", value: "#FF6F7D" },
  { name: "Cherrywing", value: "#E84A5F" },
  { name: "Lilac Mist", value: "#B38CFF" },
  { name: "Skyglass", value: "#69C9FF" },
  { name: "Lagoon", value: "#35D6C7" },
  { name: "Mint Drift", value: "#67E8A5" },
  { name: "Volt Bloom", value: "#B6F05A" },
];
const labelledButtons = [
  menuPlayButton,
  menuBackHomeButton,
  menuBackBrowserButton,
  openCreateButton,
  refreshServersButton,
  createLobbyButton,
  joinCodeButton,
  enterFlightButton,
  copyServerCodeButton,
  leaveServerButton,
  mapNeighborhoodButton,
  mapForestButton,
  mapCityButton,
  mapCaveButton,
];
const defaultButtonLabels = new Map(
  labelledButtons.map((button) => [button, button?.textContent || ""])
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa7cdfd);
scene.fog = new THREE.Fog(0xa7cdfd, 120, 360);

const camera = new THREE.PerspectiveCamera(86, window.innerWidth / window.innerHeight, 0.1, 900);
camera.rotation.order = "YXZ";

const flyer = new THREE.Group();
flyer.position.set(0, 3.8, 0);
flyer.add(camera);
scene.add(flyer);

const hemi = new THREE.HemisphereLight(0xf0f7ff, 0x688254, 1.55);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0cf, 2.1);
sun.position.set(120, 180, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 520;
sun.shadow.camera.left = -180;
sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -180;
scene.add(sun);

const fillLight = new THREE.DirectionalLight(0xdff1ff, 0.35);
fillLight.position.set(-80, 60, -40);
scene.add(fillLight);

const bodyLight = new THREE.PointLight(0xfff2c8, 0, 32, 2);
bodyLight.position.set(0, 0.25, 0.15);
flyer.add(bodyLight);

const groundShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(3200, 3200),
  new THREE.ShadowMaterial({ opacity: 0.12 })
);
groundShadow.rotation.x = -Math.PI / 2;
groundShadow.position.y = 0.01;
groundShadow.receiveShadow = true;
scene.add(groundShadow);

const geometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 12, 8),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  coneSquare: new THREE.ConeGeometry(0.72, 1, 4),
  coneRound: new THREE.ConeGeometry(0.6, 1, 8),
  plane: new THREE.PlaneGeometry(1, 1),
};

function hexNumberToRgb(hex) {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
  };
}

function shadeHex(hex, amount) {
  const color = hexNumberToRgb(hex);
  const shift = (channel) => THREE.MathUtils.clamp(Math.round(channel + amount * 255), 0, 255);
  return (shift(color.r) << 16) | (shift(color.g) << 8) | shift(color.b);
}

function cssHex(hex) {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

function createPixelCanvasTexture(size, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = false;
  paint(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRetroMaterial(baseColor, paint, options = {}) {
  const texture = createPixelCanvasTexture(options.size || 64, paint);
  texture.repeat.set(options.repeatX || 1, options.repeatY || 1);
  const material = new THREE.MeshStandardMaterial({
    color: options.tint ?? 0xffffff,
    map: texture,
    roughness: options.roughness ?? 0.95,
    metalness: options.metalness ?? 0,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent || false,
    opacity: options.opacity ?? 1,
    side: options.side || THREE.FrontSide,
  });
  material.userData.baseColor = baseColor;
  return material;
}

function drawPixelNoise(context, size, color, alpha = 0.18, count = 28) {
  context.fillStyle = color;
  context.globalAlpha = alpha;
  for (let index = 0; index < count; index += 1) {
    const x = (index * 17 + 7) % size;
    const y = (index * 29 + 11) % size;
    const block = 2 + ((index * 5) % 4);
    context.fillRect(x, y, block, block);
  }
  context.globalAlpha = 1;
}

function paintBrick(baseColor, trimColor = shadeHex(baseColor, -0.28)) {
  return (context, size) => {
    context.fillStyle = cssHex(baseColor);
    context.fillRect(0, 0, size, size);
    context.fillStyle = cssHex(trimColor);
    const brickHeight = 8;
    for (let y = 0; y < size; y += brickHeight) {
      context.fillRect(0, y, size, 1);
      const offset = (y / brickHeight) % 2 === 0 ? 0 : 8;
      for (let x = -offset; x < size; x += 16) {
        context.fillRect(x, y, 1, brickHeight);
      }
    }
    drawPixelNoise(context, size, cssHex(shadeHex(baseColor, 0.18)), 0.16, 20);
  };
}

function paintSiding(baseColor, trimColor = shadeHex(baseColor, -0.22)) {
  return (context, size) => {
    context.fillStyle = cssHex(baseColor);
    context.fillRect(0, 0, size, size);
    context.fillStyle = cssHex(trimColor);
    for (let y = 6; y < size; y += 8) {
      context.fillRect(0, y, size, 2);
    }
    context.fillStyle = cssHex(shadeHex(baseColor, 0.12));
    for (let y = 2; y < size; y += 16) {
      context.fillRect(0, y, size, 1);
    }
    drawPixelNoise(context, size, cssHex(shadeHex(baseColor, -0.16)), 0.16, 18);
  };
}

function paintRoof(baseColor) {
  return (context, size) => {
    context.fillStyle = cssHex(baseColor);
    context.fillRect(0, 0, size, size);
    const dark = cssHex(shadeHex(baseColor, -0.24));
    const light = cssHex(shadeHex(baseColor, 0.14));
    for (let y = 0; y < size; y += 8) {
      context.fillStyle = dark;
      context.fillRect(0, y, size, 2);
      context.fillStyle = light;
      for (let x = (y / 8) % 2 ? -8 : 0; x < size; x += 16) {
        context.fillRect(x + 1, y + 3, 10, 2);
      }
    }
  };
}

function paintGlassGrid(baseColor, frameColor = 0x1d2e42) {
  return (context, size) => {
    context.fillStyle = cssHex(frameColor);
    context.fillRect(0, 0, size, size);
    context.fillStyle = cssHex(baseColor);
    for (let y = 4; y < size; y += 14) {
      for (let x = 4; x < size; x += 14) {
        context.fillRect(x, y, 8, 8);
        context.fillStyle = cssHex(shadeHex(baseColor, 0.24));
        context.fillRect(x + 1, y + 1, 3, 2);
        context.fillStyle = cssHex(baseColor);
      }
    }
  };
}

function paintMetalPanels(baseColor, accentColor = 0xe1b64b) {
  return (context, size) => {
    context.fillStyle = cssHex(baseColor);
    context.fillRect(0, 0, size, size);
    context.strokeStyle = cssHex(shadeHex(baseColor, -0.28));
    context.lineWidth = 2;
    for (let y = 0; y <= size; y += 16) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
    }
    for (let x = 0; x <= size; x += 16) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, size);
      context.stroke();
    }
    context.fillStyle = cssHex(accentColor);
    for (let x = 0; x < size; x += 16) {
      context.fillRect(x + 4, 4, 3, 3);
      context.fillRect(x + 10, 22, 3, 3);
    }
    context.fillStyle = cssHex(shadeHex(baseColor, -0.36));
    for (let x = -8; x < size; x += 16) {
      context.fillRect(x, size - 10, 8, 4);
    }
  };
}

function paintConcrete(baseColor) {
  return (context, size) => {
    context.fillStyle = cssHex(baseColor);
    context.fillRect(0, 0, size, size);
    context.strokeStyle = cssHex(shadeHex(baseColor, -0.18));
    context.lineWidth = 2;
    for (let y = 0; y <= size; y += 16) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y);
      context.stroke();
    }
    for (let x = 0; x <= size; x += 32) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, size);
      context.stroke();
    }
    drawPixelNoise(context, size, cssHex(shadeHex(baseColor, -0.22)), 0.2, 24);
  };
}

function paintSign(baseColor, textColor, text) {
  return (context, size) => {
    context.fillStyle = cssHex(baseColor);
    context.fillRect(0, 0, size, size);
    context.strokeStyle = cssHex(shadeHex(baseColor, -0.38));
    context.lineWidth = 4;
    context.strokeRect(2, 2, size - 4, size - 4);
    context.fillStyle = cssHex(textColor);
    context.font = `bold ${Math.floor(size * 0.26)}px monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, size * 0.5, size * 0.53);
  };
}

function createFaceMaterials({ right, left, top, bottom, front, back }) {
  return [right, left, top, bottom, front, back];
}

const materials = {
  grassA: new THREE.MeshStandardMaterial({ color: 0x7fbf63, roughness: 1 }),
  grassB: new THREE.MeshStandardMaterial({ color: 0x74b15c, roughness: 1 }),
  forestGroundA: new THREE.MeshStandardMaterial({ color: 0x162214, roughness: 1 }),
  forestGroundB: new THREE.MeshStandardMaterial({ color: 0x1b2817, roughness: 1 }),
  road: new THREE.MeshStandardMaterial({ color: 0x424a52, roughness: 0.98 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: 0xbec5bf, roughness: 0.97 }),
  path: new THREE.MeshStandardMaterial({ color: 0xcaa97c, roughness: 1 }),
  bark: new THREE.MeshStandardMaterial({ color: 0x7a5439, roughness: 1 }),
  foliageA: new THREE.MeshStandardMaterial({ color: 0x5ea453, roughness: 1 }),
  foliageB: new THREE.MeshStandardMaterial({ color: 0x6cb663, roughness: 1 }),
  foliageC: new THREE.MeshStandardMaterial({ color: 0x497f43, roughness: 1 }),
  forestFoliageA: new THREE.MeshStandardMaterial({ color: 0x1d4520, roughness: 1 }),
  forestFoliageB: new THREE.MeshStandardMaterial({ color: 0x16391b, roughness: 1 }),
  forestFoliageC: new THREE.MeshStandardMaterial({ color: 0x102c16, roughness: 1 }),
  forestPlantA: new THREE.MeshStandardMaterial({ color: 0x284a22, roughness: 1 }),
  forestPlantB: new THREE.MeshStandardMaterial({ color: 0x355a28, roughness: 1 }),
  forestPlantC: new THREE.MeshStandardMaterial({ color: 0x456b31, roughness: 1 }),
  forestCanopy: new THREE.MeshStandardMaterial({
    color: 0x112715,
    roughness: 1,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
  }),
  forestLeaf: new THREE.MeshStandardMaterial({
    color: 0x425b2e,
    roughness: 0.95,
    side: THREE.DoubleSide,
  }),
  forestCloth: new THREE.MeshStandardMaterial({ color: 0x6a6662, roughness: 0.98 }),
  forestClothDark: new THREE.MeshStandardMaterial({ color: 0x2f3436, roughness: 0.98 }),
  ember: new THREE.MeshStandardMaterial({ color: 0xff8c4a, emissive: 0xff5a18, emissiveIntensity: 0.85, roughness: 0.6 }),
  ash: new THREE.MeshStandardMaterial({ color: 0x2a2b28, roughness: 1 }),
  blood: new THREE.MeshStandardMaterial({ color: 0x5f0d12, roughness: 0.86 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xe5dfcf, roughness: 0.94 }),
  hedge: new THREE.MeshStandardMaterial({ color: 0x4b8b45, roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: 0x71bbd7, roughness: 0.28, metalness: 0.1 }),
  window: new THREE.MeshStandardMaterial({ color: 0x9ac4ff, emissive: 0x365272, roughness: 0.2 }),
  carGlass: new THREE.MeshStandardMaterial({ color: 0xaed4ff, emissive: 0x24384e, roughness: 0.18, transparent: true, opacity: 0.58 }),
  door: new THREE.MeshStandardMaterial({ color: 0x694833, roughness: 0.95 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xf2eee7, roughness: 0.9 }),
  fence: new THREE.MeshStandardMaterial({ color: 0xe8e0d6, roughness: 1 }),
  mailbox: new THREE.MeshStandardMaterial({ color: 0x276eb5, roughness: 0.78 }),
  benchWood: new THREE.MeshStandardMaterial({ color: 0x8b6640, roughness: 0.9 }),
  benchMetal: new THREE.MeshStandardMaterial({ color: 0x5c666d, roughness: 0.75 }),
  lampPole: new THREE.MeshStandardMaterial({ color: 0x4e555d, roughness: 0.8 }),
  lampBulb: new THREE.MeshStandardMaterial({ color: 0xfff4c5, emissive: 0xffe89a, emissiveIntensity: 0.75 }),
  flower: new THREE.MeshStandardMaterial({ color: 0xff7f8a, roughness: 0.9 }),
  squirrel: new THREE.MeshStandardMaterial({ color: 0x9f6843, roughness: 0.95 }),
  animalBrown: new THREE.MeshStandardMaterial({ color: 0x7a5a40, roughness: 0.92 }),
  animalDarkBrown: new THREE.MeshStandardMaterial({ color: 0x4f3829, roughness: 0.94 }),
  animalGray: new THREE.MeshStandardMaterial({ color: 0x70757d, roughness: 0.9 }),
  animalDarkGray: new THREE.MeshStandardMaterial({ color: 0x41464d, roughness: 0.94 }),
  animalRed: new THREE.MeshStandardMaterial({ color: 0xbf5a2e, roughness: 0.9 }),
  animalCream: new THREE.MeshStandardMaterial({ color: 0xe9dfc9, roughness: 0.92 }),
  animalTan: new THREE.MeshStandardMaterial({ color: 0xa98a61, roughness: 0.92 }),
  animalMoose: new THREE.MeshStandardMaterial({ color: 0x56412e, roughness: 0.94 }),
  animalBlack: new THREE.MeshStandardMaterial({ color: 0x252423, roughness: 0.95 }),
  animalEye: new THREE.MeshStandardMaterial({ color: 0xf5f7ff, emissive: 0xd8ebff, emissiveIntensity: 1.45, roughness: 0.28 }),
  antler: new THREE.MeshStandardMaterial({ color: 0xcab48b, roughness: 0.96 }),
  quill: new THREE.MeshStandardMaterial({ color: 0xd9d7d0, roughness: 0.95 }),
  owlEye: new THREE.MeshStandardMaterial({ color: 0xf7c14f, emissive: 0x734d08, emissiveIntensity: 0.28, roughness: 0.5 }),
  beak: new THREE.MeshStandardMaterial({ color: 0xd0a254, roughness: 0.72 }),
  insectShell: new THREE.MeshStandardMaterial({ color: 0x364f2d, roughness: 0.84 }),
  insectAmber: new THREE.MeshStandardMaterial({ color: 0x8b5f1e, roughness: 0.84 }),
  insectBlack: new THREE.MeshStandardMaterial({ color: 0x1b1b19, roughness: 0.9 }),
  insectWing: new THREE.MeshStandardMaterial({ color: 0xe3f2df, roughness: 0.3, transparent: true, opacity: 0.58, side: THREE.DoubleSide }),
  monsterHide: new THREE.MeshStandardMaterial({ color: 0x2e201c, roughness: 0.9 }),
  monsterMuscle: new THREE.MeshStandardMaterial({ color: 0x5d3a31, roughness: 0.78 }),
  monsterHorn: new THREE.MeshStandardMaterial({ color: 0xb59d81, roughness: 0.94 }),
  monsterTooth: new THREE.MeshStandardMaterial({ color: 0xeae2d5, roughness: 0.82 }),
  monsterMouth: new THREE.MeshStandardMaterial({ color: 0x3d0b10, emissive: 0x1a0306, emissiveIntensity: 0.35, roughness: 0.7 }),
  monsterEye: new THREE.MeshStandardMaterial({ color: 0xff5a66, emissive: 0xff1a2c, emissiveIntensity: 2.2, roughness: 0.18 }),
  caveRock: new THREE.MeshStandardMaterial({ color: 0x3a332f, roughness: 0.96 }),
  caveRockDark: new THREE.MeshStandardMaterial({ color: 0x231f1d, roughness: 1 }),
  caveRockShell: new THREE.MeshStandardMaterial({ color: 0x231f1d, roughness: 1, side: THREE.DoubleSide }),
  caveDust: new THREE.MeshStandardMaterial({ color: 0x5d5148, roughness: 1 }),
  caveGlowBlue: new THREE.MeshStandardMaterial({ color: 0x79cbff, emissive: 0x2f91ff, emissiveIntensity: 1.35, roughness: 0.3 }),
  caveGlowAmber: new THREE.MeshStandardMaterial({ color: 0xffc97a, emissive: 0xff8c38, emissiveIntensity: 1.15, roughness: 0.35 }),
  coneOrange: new THREE.MeshStandardMaterial({ color: 0xf9722a, roughness: 0.84 }),
  cautionTape: new THREE.MeshStandardMaterial({ color: 0xf6d22f, roughness: 0.76 }),
  cautionStripe: new THREE.MeshStandardMaterial({ color: 0x1c1714, roughness: 0.82 }),
  wormTunnelBody: new THREE.MeshStandardMaterial({ color: 0x8b5f54, roughness: 0.84 }),
  wormTunnelFlesh: new THREE.MeshStandardMaterial({ color: 0xd47d7d, roughness: 0.72 }),
  wormTunnelTooth: new THREE.MeshStandardMaterial({ color: 0xf2e7dc, roughness: 0.82 }),
  motherHead: new THREE.MeshStandardMaterial({ color: 0x342728, roughness: 0.88 }),
  motherEye: new THREE.MeshStandardMaterial({ color: 0xb52f2f, emissive: 0xff5f5f, emissiveIntensity: 1.8, roughness: 0.2 }),
  snailBody: new THREE.MeshStandardMaterial({ color: 0x7c8a68, roughness: 0.92 }),
  snailBodyDark: new THREE.MeshStandardMaterial({ color: 0x566149, roughness: 0.96 }),
  snailShellOuter: new THREE.MeshStandardMaterial({ color: 0x6b4c3a, roughness: 0.92 }),
  snailShellBand: new THREE.MeshStandardMaterial({ color: 0xc89b6e, roughness: 0.88 }),
  snailShellInner: new THREE.MeshStandardMaterial({ color: 0x9f6f52, roughness: 0.84 }),
  snailSlime: new THREE.MeshStandardMaterial({ color: 0xb8ffd3, emissive: 0x244436, emissiveIntensity: 0.3, roughness: 0.22, transparent: true, opacity: 0.48 }),
  butterflyBody: new THREE.MeshStandardMaterial({ color: 0x23201e, roughness: 0.9 }),
  butterflyWingA: new THREE.MeshStandardMaterial({ color: 0xffc96c, roughness: 0.7 }),
  butterflyWingB: new THREE.MeshStandardMaterial({ color: 0x7cb2ff, roughness: 0.7 }),
  birdBody: new THREE.MeshStandardMaterial({ color: 0xdee5ef, roughness: 0.65 }),
  birdWing: new THREE.MeshStandardMaterial({ color: 0x6a7584, roughness: 0.8 }),
  playSet: new THREE.MeshStandardMaterial({ color: 0xd7574a, roughness: 0.85 }),
  playAccent: new THREE.MeshStandardMaterial({ color: 0x3f77cf, roughness: 0.75 }),
  asphaltLot: new THREE.MeshStandardMaterial({ color: 0x595f66, roughness: 0.94 }),
};

const houseWalls = [
  createRetroMaterial(0xefdfcf, paintSiding(0xefdfcf), { size: 64 }),
  createRetroMaterial(0xe4efdb, paintBrick(0xe4efdb, 0x9faf95), { size: 64 }),
  createRetroMaterial(0xd8e5f4, paintSiding(0xd8e5f4, 0x8aa2b8), { size: 64 }),
  createRetroMaterial(0xf2d5cf, paintBrick(0xf2d5cf, 0xae8078), { size: 64 }),
];

const roofMaterials = [
  createRetroMaterial(0x9b5348, paintRoof(0x9b5348), { size: 64 }),
  createRetroMaterial(0x5f6976, paintRoof(0x5f6976), { size: 64 }),
  createRetroMaterial(0x6b4739, paintRoof(0x6b4739), { size: 64 }),
  createRetroMaterial(0x496b52, paintRoof(0x496b52), { size: 64 }),
];

const carMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xd94f43, roughness: 0.78 }),
  new THREE.MeshStandardMaterial({ color: 0x4b75d3, roughness: 0.78 }),
  new THREE.MeshStandardMaterial({ color: 0xe0b54c, roughness: 0.78 }),
  new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.78 }),
];

const cityWallMaterials = [
  createRetroMaterial(0xc6ccd6, paintConcrete(0xc6ccd6), { size: 64 }),
  createRetroMaterial(0xaab6c4, paintMetalPanels(0xaab6c4, 0xf2c84e), { size: 64 }),
  createRetroMaterial(0xd9c7bd, paintBrick(0xd9c7bd, 0x8f7b73), { size: 64 }),
  createRetroMaterial(0xc7d0c0, paintConcrete(0xc7d0c0), { size: 64 }),
  createRetroMaterial(0x9da4b3, paintMetalPanels(0x9da4b3, 0x49d2d8), { size: 64 }),
];

const cityAccentMaterials = [
  createRetroMaterial(0xd86a56, paintMetalPanels(0xd86a56, 0x1e2530), { size: 64 }),
  createRetroMaterial(0x4674c8, paintMetalPanels(0x4674c8, 0xdfe8ff), { size: 64 }),
  createRetroMaterial(0xe0b94b, paintMetalPanels(0xe0b94b, 0x2a2430), { size: 64 }),
  createRetroMaterial(0x4c9a72, paintMetalPanels(0x4c9a72, 0xb9ffe4), { size: 64 }),
];

const cityGlassMaterials = [
  createRetroMaterial(0xaed6ff, paintGlassGrid(0xaed6ff), { size: 64, emissive: 0x295680, emissiveIntensity: 0.22, roughness: 0.2 }),
  createRetroMaterial(0x9dc3ee, paintGlassGrid(0x9dc3ee, 0x1e354d), { size: 64, emissive: 0x1e415e, emissiveIntensity: 0.2, roughness: 0.22 }),
  createRetroMaterial(0xc8def6, paintGlassGrid(0xc8def6, 0x31415a), { size: 64, emissive: 0x35526c, emissiveIntensity: 0.18, roughness: 0.2 }),
];

materials.window = createRetroMaterial(0x9ac4ff, paintGlassGrid(0x9ac4ff), { size: 64, emissive: 0x365272, emissiveIntensity: 0.24, roughness: 0.22 });
materials.carGlass = createRetroMaterial(0xaed4ff, paintGlassGrid(0xaed4ff, 0x26384c), { size: 64, emissive: 0x24384e, emissiveIntensity: 0.18, roughness: 0.24, transparent: true, opacity: 0.7 });
materials.door = createRetroMaterial(0x694833, paintMetalPanels(0x694833, 0xd9b38d), { size: 64, roughness: 0.96 });
materials.trim = createRetroMaterial(0xf2eee7, paintMetalPanels(0xf2eee7, 0x4c5361), { size: 64, roughness: 0.88 });
materials.fence = createRetroMaterial(0xe8e0d6, paintSiding(0xe8e0d6, 0xa49b91), { size: 64 });
materials.benchMetal = createRetroMaterial(0x5c666d, paintMetalPanels(0x5c666d, 0xbcc6cc), { size: 64, roughness: 0.82 });
materials.mailbox = createRetroMaterial(0x276eb5, paintMetalPanels(0x276eb5, 0xe3f1ff), { size: 64, roughness: 0.78 });
materials.caveRock = createRetroMaterial(0x3a332f, paintBrick(0x3a332f, 0x211c1a), { size: 64 });
materials.caveRockDark = createRetroMaterial(0x231f1d, paintMetalPanels(0x231f1d, 0x5e5147), { size: 64 });
materials.caveRockShell = createRetroMaterial(0x231f1d, paintMetalPanels(0x231f1d, 0x5e5147), { size: 64, side: THREE.DoubleSide });
materials.asphaltLot = createRetroMaterial(0x595f66, paintConcrete(0x595f66), { size: 64 });

const retroSigns = {
  bank: createRetroMaterial(0x1c3559, paintSign(0x1c3559, 0xf0f7ff, "BANK"), { size: 128, emissive: 0x0b2444, emissiveIntensity: 0.12 }),
  hotel: createRetroMaterial(0x713d7c, paintSign(0x713d7c, 0xffe58a, "HOTEL"), { size: 128, emissive: 0x2b1231, emissiveIntensity: 0.14 }),
  shop: createRetroMaterial(0xb74448, paintSign(0xb74448, 0xfff4c8, "SHOP"), { size: 128, emissive: 0x3a1012, emissiveIntensity: 0.12 }),
  police: createRetroMaterial(0x224e88, paintSign(0x224e88, 0xffffff, "CIVIC"), { size: 128, emissive: 0x0d2548, emissiveIntensity: 0.1 }),
  warning: createRetroMaterial(0xe0b94b, paintSign(0xe0b94b, 0x231d18, "KEEP OUT"), { size: 128 }),
};

const retroWallDark = createRetroMaterial(0x424b59, paintMetalPanels(0x424b59, 0xffc94c), { size: 64 });
const retroRoofVentMaterial = createRetroMaterial(0x3c4652, paintMetalPanels(0x3c4652, 0x9daab5), { size: 64 });

const trashMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xb9b4ad, roughness: 0.98 }),
  new THREE.MeshStandardMaterial({ color: 0x807d7a, roughness: 0.98 }),
  new THREE.MeshStandardMaterial({ color: 0x5a6168, roughness: 0.95 }),
];

const suitMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x262d38, roughness: 0.95 }),
  new THREE.MeshStandardMaterial({ color: 0x3f4652, roughness: 0.95 }),
  new THREE.MeshStandardMaterial({ color: 0x4e4747, roughness: 0.95 }),
];

const shirtMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x3f7fbe, roughness: 0.92 }),
  new THREE.MeshStandardMaterial({ color: 0xe87f5a, roughness: 0.92 }),
  new THREE.MeshStandardMaterial({ color: 0x5f9f5b, roughness: 0.92 }),
  new THREE.MeshStandardMaterial({ color: 0x8b62c3, roughness: 0.92 }),
];

const pantsMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x394253, roughness: 0.95 }),
  new THREE.MeshStandardMaterial({ color: 0x54514d, roughness: 0.95 }),
  new THREE.MeshStandardMaterial({ color: 0x5b4d67, roughness: 0.95 }),
];

const skinMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xf1d2ba, roughness: 0.92 }),
  new THREE.MeshStandardMaterial({ color: 0xe1b994, roughness: 0.92 }),
  new THREE.MeshStandardMaterial({ color: 0x9b6445, roughness: 0.92 }),
  new THREE.MeshStandardMaterial({ color: 0x6f4732, roughness: 0.92 }),
];

const chunkSize = 80;
const halfChunk = chunkSize / 2;
const roadHalfWidth = 6;
const sidewalkWidth = 4;
const buildInset = roadHalfWidth + sidewalkWidth + 2;
const walkEdge = halfChunk - roadHalfWidth - sidewalkWidth / 2;
const renderRadius = 2;
const immediateChunkRadius = 1;
const chunkBuildsPerFrame = 2;
const chunkBuildBudgetMs = 5;
const neighborhoodChunkRadius = 7;
const forestOuterChunkRadius = 13;
const cityChunkRadius = 3;
const cityDirections = Object.freeze([
  { name: "east", x: 1, z: 0 },
  { name: "west", x: -1, z: 0 },
  { name: "south", x: 0, z: 1 },
  { name: "north", x: 0, z: -1 },
]);
const cityDirection = Object.freeze(cityDirections[hash2(91, 17) % cityDirections.length]);
const cityAxisCenter = forestOuterChunkRadius + cityChunkRadius + 3;
const cityCenterChunk = Object.freeze({
  x: cityDirection.x * cityAxisCenter,
  z: cityDirection.z * cityAxisCenter,
});
const flyRadius = 0.56;
const maxStamina = 100;
const sprintDrainPerSecond = 24;
const staminaRegenPerSecond = 16;

const clock = new THREE.Clock();
const chunks = new Map();
const cloudActors = [];
const sharedUp = new THREE.Vector3(0, 1, 0);
const pendingChunkKeys = new Set();
let chunkBuildQueue = [];

const keys = new Set();
let pointerLocked = false;
let yaw = 0;
let pitch = -0.1;
let roll = 0;
let sprintBlend = 0;
let sprinting = false;
let stamina = maxStamina;
let shakeTime = 0;
let fearShake = 0;
let fearPulse = 0;

const velocity = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const desiredMove = new THREE.Vector3();
const nextPosition = new THREE.Vector3();
const collisionPush = new THREE.Vector3();
const atmosphereColor = new THREE.Color();

let currentChunkX = null;
let currentChunkZ = null;
let lastKnownDistrict = "Warm-Up";
let activeLifeCount = 0;

const worldSpawnState = Object.freeze({ x: 0, y: 3.8, z: 0, yaw: 0, pitch: -0.1, roll: 0 });
const caveLayout = Object.freeze({
  sinkhole: { x: 170, z: 109, radius: 1.85, shaftRadius: 1.12 },
  portal: { x: 170, y: 1.7, z: 109, radius: 0.72, triggerRadius: 1.02 },
  drain: { x: 324, z: 170, radius: 6.2, shaftRadius: 2.7 },
  tunnelY: -20.8,
  tunnelInnerWidth: 1.34,
  tunnelInnerHeight: 1.32,
  wallThickness: 0.42,
  shaftBottomY: -18,
  bounds: { minX: 146, maxX: 346, minZ: 82, maxZ: 286, minY: -56, maxY: 8 },
  cavern: { x: 318, z: 246, floorY: -38, ledgeY: -20.8, radius: 34, height: 42 },
  mother: { x: 318, y: -35.6, z: 246 },
  tunnelKeys: {
    S: { x: 170, z: 96 },
    A: { x: 170, z: 109 },
    B: { x: 202, z: 109 },
    C: { x: 202, z: 160 },
    D: { x: 240, z: 160 },
    E: { x: 240, z: 198 },
    F: { x: 278, z: 198 },
    G: { x: 278, z: 228 },
    L1: { x: 166, z: 160 },
    L2: { x: 166, z: 196 },
    R1: { x: 274, z: 160 },
    R2: { x: 274, z: 126 },
    P: { x: 324, z: 170 },
    Q: { x: 304, z: 170 },
    R: { x: 304, z: 208 },
    H: { x: 278, z: 208 },
  },
});
const tempWorldPositionA = new THREE.Vector3();
const tempWorldPositionB = new THREE.Vector3();
const tempWorldPositionC = new THREE.Vector3();
const tempBlockerMin = new THREE.Vector3();
const tempBlockerMax = new THREE.Vector3();
const tempForwardVector = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempPlayerDelta = new THREE.Vector3();

const atmosphereProfiles = {
  neighborhood: {
    background: 0xa7cdfd,
    fog: 0xa7cdfd,
    fogNear: 120,
    fogFar: 360,
    hemi: 1.55,
    sun: 2.1,
    fill: 0.35,
    shadow: 0.12,
    cloudsVisible: true,
  },
  city: {
    background: 0xb8c3d1,
    fog: 0xb6c1cf,
    fogNear: 110,
    fogFar: 300,
    hemi: 1.25,
    sun: 1.72,
    fill: 0.28,
    shadow: 0.16,
    cloudsVisible: true,
  },
  cityConnector: {
    background: 0x6b7078,
    fog: 0x60656d,
    fogNear: 70,
    fogFar: 210,
    hemi: 0.7,
    sun: 0.65,
    fill: 0.12,
    shadow: 0.18,
    cloudsVisible: false,
  },
  forest: {
    background: 0x0b130d,
    fog: 0x0d1710,
    fogNear: 26,
    fogFar: 120,
    hemi: 0.36,
    sun: 0.18,
    fill: 0.06,
    shadow: 0.18,
    cloudsVisible: false,
  },
  cave: {
    background: 0x08080a,
    fog: 0x0a0a0d,
    fogNear: 12,
    fogFar: 88,
    hemi: 0.1,
    sun: 0.02,
    fill: 0.03,
    shadow: 0.22,
    cloudsVisible: false,
  },
  outside: {
    background: 0x050707,
    fog: 0x070a08,
    fogNear: 16,
    fogFar: 90,
    hemi: 0.18,
    sun: 0.05,
    fill: 0.02,
    shadow: 0.2,
    cloudsVisible: false,
  },
};

const network = {
  joined: false,
  playerToken: "",
  playerId: "",
  displayName: window.localStorage.getItem("flys-world-display-name") || `Fly ${Math.floor(1000 + Math.random() * 9000)}`,
  playerColor: window.localStorage.getItem(playerColorStorageKey) || flyColorPalette[0].value,
  lobby: null,
  menuView: "home",
  visibilityMode: "public",
  browserRefreshTimer: null,
  heartbeatTimer: null,
  heartbeatInFlight: false,
  pendingAction: "",
  copiedCode: false,
  codeCopyTimer: null,
  lastPublicRefreshAt: 0,
  recoveringSession: false,
  remotePlayers: new Map(),
};

const forestState = {
  monster: null,
  alertPosition: new THREE.Vector3(),
  alertExpiresAt: 0,
  lastAlertAt: 0,
  noisePosition: new THREE.Vector3(),
  noiseExpiresAt: 0,
  noiseIntensity: 0,
  lastNoiseAt: 0,
  lastPlayerNoiseAt: 0,
  roarUntil: 0,
  deathUntil: 0,
  audioContext: null,
  audioMaster: null,
  noiseBuffer: null,
};

const caveState = {
  initialized: false,
  group: null,
  colliders: [],
  visibilityBlockers: [],
  tunnelSegments: [],
  tunnelRoutes: [],
  worms: [],
  storm: null,
  mother: null,
  portal: null,
  portalCooldown: 0,
};

displayNameInput.value = network.displayName;
createLobbyNameInput.value = `${network.displayName}'s Lobby`;

function hash2(x, z) {
  let seed = Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  seed = (seed ^ (seed >>> 13)) >>> 0;
  seed = Math.imul(seed, 1274126177) >>> 0;
  return seed >>> 0;
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

function shuffle(rand, list) {
  const copy = [...list];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1));
    const value = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = value;
  }

  return copy;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setMenuStatus(text, isError = false) {
  menuStatusEl.textContent = text;
  menuStatusEl.classList.toggle("is-error", isError);
}

function setButtonLabel(button, nextLabel = null) {
  if (!button) {
    return;
  }

  button.textContent = nextLabel ?? defaultButtonLabels.get(button) ?? button.textContent;
}

function clearCopyFeedback() {
  network.copiedCode = false;

  if (network.codeCopyTimer) {
    window.clearTimeout(network.codeCopyTimer);
    network.codeCopyTimer = null;
  }
}

function persistActiveSession() {
  if (!network.playerToken) {
    window.sessionStorage.removeItem(activeSessionStorageKey);
    window.localStorage.removeItem(activeSessionStorageKey);
    return;
  }

  const payload = JSON.stringify({
    playerToken: network.playerToken,
    displayName: network.displayName,
  });
  window.sessionStorage.setItem(activeSessionStorageKey, payload);
  // Clean up legacy persistence so old sessions do not restore after a full tab close.
  window.localStorage.removeItem(activeSessionStorageKey);
}

function readStoredSession() {
  try {
    const raw = window.sessionStorage.getItem(activeSessionStorageKey);
    window.localStorage.removeItem(activeSessionStorageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  window.sessionStorage.removeItem(activeSessionStorageKey);
  window.localStorage.removeItem(activeSessionStorageKey);
}

function teleportToMap(mapId) {
  if (!network.joined || network.pendingAction) {
    return;
  }

  applyLocalSpawnState(getMapTeleportState(mapId));
  syncSessionNow(false);
  updateMapPicker();
}

function addGlowingEyes(parent, leftX, y, z, spacing = 0.12, radius = 0.03, material = materials.animalEye) {
  createSphere(parent, material, leftX, y, z, radius, { cast: false, receive: false });
  createSphere(parent, material, leftX + spacing, y, z, radius, { cast: false, receive: false });
}

function getForwardVector(object, target = tempForwardVector) {
  object.getWorldQuaternion(tempQuaternion);
  return target.set(0, 0, 1).applyQuaternion(tempQuaternion).normalize();
}

function lerpAngle(current, target, amount) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * amount;
}

function isPlayerInForest() {
  return getChunkRegion(getChunkCoord(flyer.position.x), getChunkCoord(flyer.position.z)) === "forest";
}

function isWorldPositionInForest(position) {
  return getChunkRegion(getChunkCoord(position.x), getChunkCoord(position.z)) === "forest";
}

function getLoadedForestChunks() {
  return [...chunks.values()].filter((chunk) => chunk.region === "forest");
}

function sampleLoadedForestPoint(rand, minDistance = 0, maxDistance = Infinity, chunkFilter = null) {
  const forestChunks = getLoadedForestChunks();
  const sampledChunks = forestChunks.length > 0
    ? shuffle(rand, chunkFilter ? forestChunks.filter(chunkFilter) : forestChunks)
    : [];

  for (const chunk of sampledChunks) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const point = tempWorldPositionA.set(
        chunk.cx * chunkSize + (rand() - 0.5) * 56,
        0,
        chunk.cz * chunkSize + (rand() - 0.5) * 56
      );
      const distance = point.distanceTo(flyer.position);
      if (distance >= minDistance && distance <= maxDistance) {
        return point.clone();
      }
    }
  }

  return null;
}

function sampleWorldSpawnState(rand = Math.random) {
  const searchRadius = Math.max(forestOuterChunkRadius, 28);
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const cx = Math.round((rand() * 2 - 1) * searchRadius);
    const cz = Math.round((rand() * 2 - 1) * searchRadius);
    const region = getChunkRegion(cx, cz);
    if (region === "outside") {
      continue;
    }
    return {
      x: cx * chunkSize + (rand() - 0.5) * 44,
      y: 3.8 + rand() * 4,
      z: cz * chunkSize + (rand() - 0.5) * 44,
      yaw: rand() * Math.PI * 2,
      pitch: -0.08 - rand() * 0.08,
      roll: 0,
    };
  }
  return { ...worldSpawnState };
}

function triggerFearShake(amount = 0.5) {
  fearShake = Math.max(fearShake, amount);
  fearPulse = 0;
}

function getForestAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!forestState.audioContext) {
    const context = new AudioContextClass();
    const master = context.createGain();
    master.gain.value = 0.075;
    master.connect(context.destination);
    forestState.audioContext = context;
    forestState.audioMaster = master;
  }

  if (forestState.audioContext.state === "suspended") {
    forestState.audioContext.resume().catch(() => {});
  }

  return forestState.audioContext;
}

function createForestNoiseBuffer(context) {
  if (forestState.noiseBuffer) {
    return forestState.noiseBuffer;
  }

  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }
  forestState.noiseBuffer = buffer;
  return buffer;
}

function createSpatialOutput(context, position, gainValue = 0.1) {
  const gain = context.createGain();
  gain.gain.value = gainValue;
  let output = gain;

  if (typeof context.createStereoPanner === "function") {
    const pan = context.createStereoPanner();
    pan.pan.value = THREE.MathUtils.clamp((position.x - flyer.position.x) / 28, -1, 1);
    gain.connect(pan);
    output = pan;
  }

  output.connect(forestState.audioMaster);
  return gain;
}

function playAnimalGrowl(position, intensity = 0.09) {
  const context = getForestAudioContext();
  if (!context || !forestState.audioMaster) {
    return;
  }

  const start = context.currentTime;
  const gain = createSpatialOutput(context, position, 0.0001);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(intensity, start + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

  const growl = context.createOscillator();
  growl.type = "triangle";
  growl.frequency.setValueAtTime(190, start);
  growl.frequency.exponentialRampToValueAtTime(92, start + 0.22);
  growl.frequency.exponentialRampToValueAtTime(76, start + 0.4);
  growl.connect(gain);

  const rasp = context.createOscillator();
  rasp.type = "sawtooth";
  rasp.frequency.setValueAtTime(110, start);
  rasp.frequency.exponentialRampToValueAtTime(70, start + 0.4);
  rasp.connect(gain);

  growl.start(start);
  rasp.start(start);
  growl.stop(start + 0.45);
  rasp.stop(start + 0.45);
}

function playMonsterRoar(position) {
  const context = getForestAudioContext();
  if (!context || !forestState.audioMaster) {
    return;
  }

  const start = context.currentTime;
  const gain = createSpatialOutput(context, position, 0.0001);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.34, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.11, start + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);

  const shriek = context.createOscillator();
  shriek.type = "sawtooth";
  shriek.frequency.setValueAtTime(580, start);
  shriek.frequency.exponentialRampToValueAtTime(310, start + 0.32);
  shriek.connect(gain);

  const throat = context.createOscillator();
  throat.type = "triangle";
  throat.frequency.setValueAtTime(260, start);
  throat.frequency.exponentialRampToValueAtTime(138, start + 0.38);
  throat.connect(gain);

  const noise = context.createBufferSource();
  noise.buffer = createForestNoiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1800, start);
  filter.Q.value = 1.1;
  noise.connect(filter);
  filter.connect(gain);

  shriek.start(start);
  throat.start(start);
  noise.start(start);
  shriek.stop(start + 0.58);
  throat.stop(start + 0.6);
  noise.stop(start + 0.56);
}

function queueForestAlert(position) {
  forestState.alertPosition.copy(position);
  forestState.alertExpiresAt = performance.now() + 10000;
  forestState.lastAlertAt = performance.now();
}

function queueForestNoise(position, intensity = 0.3, durationMs = 4500) {
  forestState.noisePosition.copy(position);
  forestState.noiseIntensity = Math.max(forestState.noiseIntensity * 0.72, intensity);
  forestState.noiseExpiresAt = Math.max(forestState.noiseExpiresAt, performance.now() + durationMs);
  forestState.lastNoiseAt = performance.now();
}

function respawnPlayer() {
  forestState.deathUntil = performance.now() + 1500;
  applyLocalSpawnState(worldSpawnState);
  triggerFearShake(0.32);
  if (forestState.monster) {
    forestState.monster.state = "roam";
    forestState.monster.noticeUntil = 0;
    forestState.monster.investigateTarget = null;
    forestState.monster.playerSeenAt = 0;
  }
  if (forestState.snail) {
    forestState.snail.state = "roam";
    forestState.snail.investigateTarget = null;
    forestState.snail.lastHeardPosition.copy(forestState.snail.roamTarget);
  }
  syncSessionNow(false);
}

function getChunkRingDistance(cx, cz) {
  return Math.max(Math.abs(cx), Math.abs(cz));
}

function getCityAxisChunk(cx, cz) {
  return cityDirection.x !== 0 ? cx * cityDirection.x : cz * cityDirection.z;
}

function getCityLateralChunk(cx, cz) {
  return cityDirection.x !== 0 ? cz : cx;
}

function isCityChunk(cx, cz) {
  return (
    Math.abs(getCityAxisChunk(cx, cz) - cityAxisCenter) <= cityChunkRadius &&
    Math.abs(getCityLateralChunk(cx, cz)) <= cityChunkRadius + 1
  );
}

function isCityConnectorChunk(cx, cz) {
  const axis = getCityAxisChunk(cx, cz);
  const lateral = getCityLateralChunk(cx, cz);
  return axis >= neighborhoodChunkRadius && axis < cityAxisCenter - cityChunkRadius && Math.abs(lateral) <= 0;
}

function getChunkRegion(cx, cz) {
  if (isCityChunk(cx, cz)) {
    return "city";
  }
  if (isCityConnectorChunk(cx, cz)) {
    return "cityConnector";
  }
  const ringDistance = getChunkRingDistance(cx, cz);
  if (ringDistance <= neighborhoodChunkRadius) {
    return "neighborhood";
  }
  if (ringDistance <= forestOuterChunkRadius) {
    return "forest";
  }
  return "outside";
}

function getRegionFallbackLabel(region) {
  if (region === "cave") {
    return "Cave Tunnels";
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

function getMapSelectionId(position = flyer.position) {
  if (isWorldPositionInCave(position)) {
    return "cave";
  }

  const region = getChunkRegion(getChunkCoord(position.x), getChunkCoord(position.z));
  if (region === "city" || region === "cityConnector") {
    return "city";
  }
  if (region === "forest") {
    return "forest";
  }
  return "neighborhood";
}

function getMapTeleportState(mapId) {
  if (mapId === "cave") {
    return caveState.portal?.destination
      ? { ...caveState.portal.destination }
      : {
        x: 176,
        y: caveLayout.tunnelY,
        z: caveLayout.tunnelKeys.A.z,
        yaw: -Math.PI * 0.5,
        pitch: 0,
        roll: 0,
      };
  }

  if (mapId === "forest") {
    const axisChunks = -(neighborhoodChunkRadius + 4);
    const lateralChunks = 2;
    const x = cityDirection.x !== 0 ? cityDirection.x * axisChunks * chunkSize : lateralChunks * chunkSize;
    const z = cityDirection.x !== 0 ? lateralChunks * chunkSize : cityDirection.z * axisChunks * chunkSize;
    return {
      x,
      y: 18,
      z,
      yaw: 0,
      pitch: -0.18,
      roll: 0,
    };
  }

  if (mapId === "city") {
    return {
      x: cityCenterChunk.x * chunkSize,
      y: 8,
      z: cityCenterChunk.z * chunkSize,
      yaw: 0,
      pitch: -0.12,
      roll: 0,
    };
  }

  return {
    ...worldSpawnState,
  };
}

function updateMapPicker() {
  const activeId = getMapSelectionId();
  const labels = {
    neighborhood: "Neighborhood",
    forest: "Forest",
    city: "City",
    cave: "Cave",
  };
  mapSelectLabelEl.textContent = labels[activeId] || "Neighborhood";

  for (const [button, id] of [
    [mapNeighborhoodButton, "neighborhood"],
    [mapForestButton, "forest"],
    [mapCityButton, "city"],
    [mapCaveButton, "cave"],
  ]) {
    button.classList.toggle("is-active", id === activeId);
  }
}

function isWithinCaveBounds(position, padding = 0) {
  return (
    position.x >= caveLayout.bounds.minX - padding &&
    position.x <= caveLayout.bounds.maxX + padding &&
    position.z >= caveLayout.bounds.minZ - padding &&
    position.z <= caveLayout.bounds.maxZ + padding &&
    position.y >= caveLayout.bounds.minY - padding &&
    position.y <= caveLayout.bounds.maxY + padding
  );
}

function isWithinCaveAccess(position, padding = 0) {
  return false;
}

function isPositionInsideCaveShaft(position, padding = 0) {
  return false;
}

function isPositionInsideCaveCavern(position, padding = 0) {
  const cavern = caveLayout.cavern;
  if (
    position.y < cavern.floorY + 0.6 - padding ||
    position.y > cavern.floorY + cavern.height + padding
  ) {
    return false;
  }

  const radius = cavern.radius + padding;
  return (
    (position.x - cavern.x) ** 2 + (position.z - cavern.z) ** 2 <= radius * radius
  );
}

function isPositionInsideTunnelSegment(position, segment, padding = 0) {
  if (
    position.y < segment.yMin - padding ||
    position.y > segment.yMax + padding
  ) {
    return false;
  }

  if (segment.axis === "x") {
    return (
      position.x >= segment.min - padding &&
      position.x <= segment.max + padding &&
      Math.abs(position.z - segment.cross) <= segment.halfWidth + padding
    );
  }

  return (
    position.z >= segment.min - padding &&
    position.z <= segment.max + padding &&
    Math.abs(position.x - segment.cross) <= segment.halfWidth + padding
  );
}

function getTunnelSegmentForPosition(position, padding = 0) {
  for (const segment of caveState.tunnelSegments) {
    if (isPositionInsideTunnelSegment(position, segment, padding)) {
      return segment;
    }
  }
  return null;
}

function isWorldPositionInCave(position) {
  if (!isWithinCaveBounds(position, 6)) {
    return false;
  }

  return (
    isPositionInsideCaveShaft(position) ||
    isPositionInsideCaveCavern(position) ||
    Boolean(getTunnelSegmentForPosition(position))
  );
}

function isPlayerInCave() {
  return isWorldPositionInCave(flyer.position);
}

function getPlayerEnvironmentRegion() {
  if (isPlayerInCave()) {
    return "cave";
  }
  return getChunkRegion(currentChunkX ?? 0, currentChunkZ ?? 0);
}

function getCaveDistrictLabel(position = flyer.position) {
  if (isPositionInsideCaveCavern(position, 1.2)) {
    return "Mother's Cavern";
  }
  return "Cave Tunnels";
}

function chunkContainsCaveEntrance(cx, cz) {
  return getChunkCoord(caveLayout.sinkhole.x) === cx && getChunkCoord(caveLayout.sinkhole.z) === cz;
}

function chunkContainsSinkhole(cx, cz) {
  return false;
}

function getSinkholeTunnelConfig() {
  return {
    x: caveLayout.sinkhole.x,
    z: caveLayout.sinkhole.z,
    radius: caveLayout.sinkhole.radius,
    shaftRadius: caveLayout.sinkhole.shaftRadius,
    angle: 0,
    openingWidth: 2.5,
    openingTopY: caveLayout.tunnelY + 1.9,
    mouthX: caveLayout.sinkhole.x + caveLayout.tunnelInnerWidth * 0.45,
    mouthZ: caveLayout.sinkhole.z,
  };
}

function getGroundTunnelMouthConfig() {
  return getSinkholeTunnelConfig();
}

function getGroundEntranceVisualConfig() {
  return {
    ...caveLayout.portal,
    clearRadius: caveLayout.portal.radius + 4.4,
  };
}

function isNearCaveEntranceWorld(x, z, radius = 0) {
  const entry = getGroundEntranceVisualConfig();
  const limit = entry.clearRadius + radius;
  return (x - entry.x) ** 2 + (z - entry.z) ** 2 <= limit * limit;
}

function tryUseCavePortal(position) {
  if (!caveState.portal || caveState.portalCooldown > 0 || isWorldPositionInCave(position)) {
    return false;
  }

  const dx = position.x - caveState.portal.group.position.x;
  const dy = position.y - caveState.portal.group.position.y;
  const dz = position.z - caveState.portal.group.position.z;
  if (dx * dx + dy * dy + dz * dz > caveState.portal.radius * caveState.portal.radius) {
    return false;
  }

  caveState.portalCooldown = 1.1;
  applyLocalSpawnState(caveState.portal.destination);
  return true;
}

function updateAtmosphere(delta) {
  const region = getPlayerEnvironmentRegion();
  const profile = atmosphereProfiles[region];
  const blend = 1 - Math.exp(-3.2 * delta);

  atmosphereColor.set(profile.background);
  scene.background.lerp(atmosphereColor, blend);

  atmosphereColor.set(profile.fog);
  scene.fog.color.lerp(atmosphereColor, blend);
  scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, profile.fogNear, blend);
  scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, profile.fogFar, blend);
  hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, profile.hemi, blend);
  sun.intensity = THREE.MathUtils.lerp(sun.intensity, profile.sun, blend);
  fillLight.intensity = THREE.MathUtils.lerp(fillLight.intensity, profile.fill, blend);
  groundShadow.material.opacity = THREE.MathUtils.lerp(groundShadow.material.opacity, profile.shadow, blend);

  for (const cloud of cloudActors) {
    if (cloud.group) {
      cloud.group.visible = profile.cloudsVisible;
    }
  }
}

function updateBodyLight(delta) {
  const region = getPlayerEnvironmentRegion();
  const inSinkhole = isPositionInsideCaveShaft(flyer.position, 0.12);
  const isVeryDark = region === "cave" || inSinkhole;
  const isDimForest = region === "forest";
  const targetIntensity = isVeryDark ? 2.4 : isDimForest ? 0.7 : 0;
  const targetDistance = isVeryDark ? 34 : isDimForest ? 18 : 10;
  const targetDecay = isVeryDark ? 1.45 : 1.8;
  bodyLight.intensity = THREE.MathUtils.lerp(bodyLight.intensity, targetIntensity, 4.6 * delta);
  bodyLight.distance = THREE.MathUtils.lerp(bodyLight.distance, targetDistance, 4.6 * delta);
  bodyLight.decay = THREE.MathUtils.lerp(bodyLight.decay, targetDecay, 4.6 * delta);
}

function updateUiInteractivity() {
  const busy = Boolean(network.pendingAction);
  const hasPrivateCode = Boolean(network.joined && network.lobby?.code);
  const mapButtons = [mapNeighborhoodButton, mapForestButton, mapCityButton];

  menuShell.classList.toggle("is-busy", busy);

  menuPlayButton.disabled = busy;
  menuBackHomeButton.disabled = busy;
  menuBackBrowserButton.disabled = busy;
  openCreateButton.disabled = busy;
  refreshServersButton.disabled = busy;
  createLobbyButton.disabled = busy;
  joinCodeButton.disabled = busy;
  visibilityPublicButton.disabled = busy;
  visibilityPrivateButton.disabled = busy;
  displayNameInput.disabled = busy;
  joinCodeInput.disabled = busy;
  createLobbyNameInput.disabled = busy;
  createCodeInput.disabled = busy || network.visibilityMode !== "private";
  enterFlightButton.disabled = busy || !network.joined;
  leaveServerButton.disabled = busy || !network.playerToken;
  copyServerCodeButton.hidden = !hasPrivateCode;
  copyServerCodeButton.disabled = busy || !hasPrivateCode;
  for (const button of mapButtons) {
    button.disabled = busy || !network.joined;
  }

  setButtonLabel(refreshServersButton, network.pendingAction === "refresh" ? "Refreshing..." : null);
  setButtonLabel(createLobbyButton, network.pendingAction === "create" ? "Creating..." : null);
  setButtonLabel(joinCodeButton, network.pendingAction === "join-private" ? "Joining..." : null);
  setButtonLabel(leaveServerButton, network.pendingAction === "leave" ? "Leaving..." : null);
  setButtonLabel(copyServerCodeButton, network.copiedCode ? "Copied!" : null);

  for (const button of publicServerListEl.querySelectorAll("button[data-lobby-id]")) {
    const isFull = button.dataset.isFull === "true";
    const isJoiningThisLobby = network.pendingAction === `join-public:${button.dataset.lobbyId}`;
    button.disabled = busy || isFull;
    button.textContent = isFull ? "Full" : isJoiningThisLobby ? "Joining..." : "Join";
  }

  updatePlayerColorPicker();
  updateMapPicker();
}

function setPendingAction(action = "") {
  network.pendingAction = action;
  updateUiInteractivity();
}

function normalizeColorHex(value) {
  const raw = String(value || "").trim().toUpperCase();
  const clean = raw.startsWith("#") ? raw.slice(1) : raw;
  return /^[0-9A-F]{6}$/.test(clean) ? `#${clean}` : flyColorPalette[0].value;
}

function hexToRgb(colorHex) {
  const normalized = normalizeColorHex(colorHex);
  const value = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function findFlyColorOption(colorHex) {
  const normalized = normalizeColorHex(colorHex);
  return flyColorPalette.find((option) => option.value === normalized) || null;
}

function applyPlayerAccentToUi(colorHex) {
  const normalized = normalizeColorHex(colorHex);
  const { r, g, b } = hexToRgb(normalized);
  document.documentElement.style.setProperty("--player-accent", normalized);
  document.documentElement.style.setProperty("--player-accent-rgb", `${r}, ${g}, ${b}`);
}

function renderPlayerColorPicker() {
  playerColorPickerEl.innerHTML = "";

  for (const option of flyColorPalette) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-swatch";
    button.dataset.color = option.value;
    button.title = option.name;
    button.setAttribute("aria-label", option.name);
    button.style.setProperty("--swatch-color", option.value);
    button.addEventListener("click", () => {
      setPlayerColor(option.value, true);
    });
    playerColorPickerEl.append(button);
  }
}

function updatePlayerColorPicker() {
  const normalized = normalizeColorHex(network.playerColor);
  const option = findFlyColorOption(normalized);
  playerColorLabelEl.textContent = option ? option.name : normalized;

  for (const button of playerColorPickerEl.querySelectorAll(".color-swatch")) {
    const isActive = button.dataset.color === normalized;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.disabled = Boolean(network.pendingAction) || !network.joined;
  }
}

function setPlayerColor(colorHex, syncNow = false) {
  const normalized = normalizeColorHex(colorHex);
  network.playerColor = normalized;
  window.localStorage.setItem(playerColorStorageKey, normalized);
  applyPlayerAccentToUi(normalized);
  updatePlayerColorPicker();

  if (syncNow && network.joined) {
    syncSessionNow(false);
  }
}

function setMenuView(view) {
  network.menuView = view;
  menuViews.forEach((menuView) => {
    menuView.classList.toggle("is-active", menuView.dataset.view === view);
  });
}

function showMenu(view = network.menuView) {
  setMenuView(view);
  menuOverlay.classList.remove("is-hidden");
}

function hideMenu() {
  menuOverlay.classList.add("is-hidden");
}

function setVisibilityMode(mode) {
  network.visibilityMode = mode;
  const isPrivate = mode === "private";
  visibilityPublicButton.classList.toggle("is-active", !isPrivate);
  visibilityPrivateButton.classList.toggle("is-active", isPrivate);
  privateCodeField.hidden = !isPrivate;
  createHelpCopy.textContent = isPrivate
    ? "Private servers stay hidden from the public list. Share the code with the players you want to invite."
    : "Public servers appear in the browser for anyone to join, up to 20 players.";
  updateUiInteractivity();
}

function normalizeCode(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function getSavedDisplayName() {
  const value = displayNameInput.value.trim().slice(0, 20);
  const nextName = value || `Fly ${Math.floor(1000 + Math.random() * 9000)}`;
  network.displayName = nextName;
  window.localStorage.setItem("flys-world-display-name", nextName);
  displayNameInput.value = nextName;
  return nextName;
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

async function copyTextToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const helperInput = document.createElement("input");
  helperInput.value = value;
  helperInput.style.position = "fixed";
  helperInput.style.opacity = "0";
  document.body.append(helperInput);
  helperInput.select();
  const copied = document.execCommand("copy");
  helperInput.remove();

  if (!copied) {
    throw new Error("Copy failed in this browser.");
  }
}

function buildSessionQuery(playerToken) {
  return `/session?playerToken=${encodeURIComponent(playerToken)}`;
}

function applyLocalSpawnState(state = {}) {
  flyer.position.set(
    Number.isFinite(state.x) ? state.x : 0,
    Number.isFinite(state.y) ? state.y : 3.8,
    Number.isFinite(state.z) ? state.z : 0
  );
  velocity.set(0, 0, 0);
  yaw = Number.isFinite(state.yaw) ? state.yaw : 0;
  pitch = Number.isFinite(state.pitch) ? state.pitch : 0;
  roll = Number.isFinite(state.roll) ? state.roll : 0;
  sprinting = false;
  shakeTime = 0;
  fearPulse = 0;
  syncChunks();
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForUiCondition(check, timeoutMs = 8000, label = "UI condition") {
  const start = performance.now();

  while (performance.now() - start < timeoutMs) {
    if (check()) {
      return;
    }
    await sleep(80);
  }

  throw new Error(`${label} timed out.`);
}

function getSmokeTestOutputEl() {
  if (!smokeTestMode) {
    return null;
  }

  let output = document.querySelector("#smoke-test-output");
  if (!output) {
    output = document.createElement("pre");
    output.id = "smoke-test-output";
    output.dataset.status = "running";
    output.style.cssText = [
      "position:fixed",
      "left:18px",
      "bottom:18px",
      "z-index:9999",
      "max-width:480px",
      "padding:14px 16px",
      "border-radius:14px",
      "background:rgba(22, 14, 18, 0.92)",
      "color:#ffe8ec",
      "border:1px solid rgba(255, 137, 156, 0.45)",
      "box-shadow:0 18px 36px rgba(0, 0, 0, 0.28)",
      "font:12px/1.45 Consolas, monospace",
      "white-space:pre-wrap",
      "pointer-events:none",
    ].join(";");
    document.body.append(output);
  }

  return output;
}

function setSmokeTestState(status, lines) {
  const output = getSmokeTestOutputEl();
  if (!output) {
    return;
  }

  output.dataset.status = status;
  output.textContent = lines.join("\n");
}

function clearRemotePlayers() {
  for (const remote of network.remotePlayers.values()) {
    scene.remove(remote.group);
  }
  network.remotePlayers.clear();
}

function createRemoteFly(player) {
  const group = new THREE.Group();
  scene.add(group);

  const accentHex = normalizeColorHex(player.color);
  const accent = new THREE.Color(accentHex);
  const variantSeed = [...String(player.id || player.name || "fly")].reduce(
    (total, char, index) => total + char.charCodeAt(0) * (index + 1),
    0
  );
  const headScale = 0.92 + (variantSeed % 5) * 0.045;
  const abdomenStretch = 1.08 + ((variantSeed >> 2) % 5) * 0.06;
  const wingSpan = 0.4 + ((variantSeed >> 4) % 4) * 0.045;
  const bodyLift = ((variantSeed >> 6) % 4) * 0.012;
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.16,
    roughness: 0.52,
    metalness: 0.08,
  });
  const abdomenMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.22,
    roughness: 0.46,
    metalness: 0.1,
  });
  const darkBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x23181c,
    roughness: 0.92,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x7d1329,
    emissive: 0x2d0710,
    emissiveIntensity: 0.28,
    roughness: 0.34,
  });
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7fbff,
    transparent: true,
    opacity: 0.42,
    emissive: 0xd9e7f8,
    emissiveIntensity: 0.12,
    roughness: 0.18,
    side: THREE.DoubleSide,
  });
  const limbMaterial = new THREE.MeshStandardMaterial({
    color: 0x271a1e,
    roughness: 0.95,
  });

  const rig = new THREE.Group();
  rig.position.y = 0.22 + bodyLift;
  group.add(rig);

  const head = createSphere(rig, shellMaterial, 0, 0.1, 0.36, 0.15 * headScale, { receive: false });
  head.scale.set(0.28, 0.24, 0.28);
  const thorax = createSphere(rig, shellMaterial, 0, 0.05, 0.04, 0.21, { receive: false });
  thorax.scale.set(0.36, 0.28, 0.4);
  const abdomen = createSphere(rig, abdomenMaterial, 0, 0.03, -0.28, 0.22, { receive: false });
  abdomen.scale.set(0.3, 0.24, 0.42 * abdomenStretch);

  const bandA = createCylinder(rig, darkBodyMaterial, 0, 0.04, -0.16, 0.09, 0.03, {
    rx: Math.PI / 2,
    cast: false,
    receive: false,
  });
  bandA.scale.set(0.42, 0.03, 0.42);
  const bandB = createCylinder(rig, darkBodyMaterial, 0, 0.03, -0.28, 0.1, 0.03, {
    rx: Math.PI / 2,
    cast: false,
    receive: false,
  });
  bandB.scale.set(0.46, 0.03, 0.46);

  const eyeLeft = createSphere(rig, eyeMaterial, -0.11, 0.11, 0.42, 0.08, { receive: false });
  eyeLeft.scale.set(0.1, 0.12, 0.11);
  const eyeRight = createSphere(rig, eyeMaterial, 0.11, 0.11, 0.42, 0.08, { receive: false });
  eyeRight.scale.set(0.1, 0.12, 0.11);

  createBox(rig, darkBodyMaterial, 0, 0.04, 0.5, 0.03, 0.05, 0.14, {
    cast: false,
    receive: false,
    rx: 0.2,
  });
  createBox(rig, limbMaterial, -0.07, 0.19, 0.38, 0.015, 0.12, 0.015, {
    cast: false,
    receive: false,
    rz: -0.45,
    rx: 0.35,
  });
  createBox(rig, limbMaterial, 0.07, 0.19, 0.38, 0.015, 0.12, 0.015, {
    cast: false,
    receive: false,
    rz: 0.45,
    rx: 0.35,
  });

  const wingLeft = new THREE.Mesh(geometries.plane, wingMaterial);
  wingLeft.position.set(-0.18, 0.2, 0.02);
  wingLeft.scale.set(wingSpan, 0.26, 1);
  wingLeft.rotation.set(-0.28, -0.08, 0.44);
  wingLeft.castShadow = false;
  wingLeft.receiveShadow = false;
  rig.add(wingLeft);

  const wingRight = wingLeft.clone();
  wingRight.position.x = 0.18;
  wingRight.rotation.set(-0.28, 0.08, -0.44);
  rig.add(wingRight);

  for (const legZ of [0.18, 0.03, -0.12]) {
    const legPitch = legZ > 0.1 ? 0.45 : legZ > -0.05 ? 0.12 : -0.18;
    createBox(rig, limbMaterial, -0.14, -0.04, legZ, 0.018, 0.24, 0.018, {
      cast: false,
      receive: false,
      rz: -0.72,
      rx: legPitch,
    });
    createBox(rig, limbMaterial, 0.14, -0.04, legZ, 0.018, 0.24, 0.018, {
      cast: false,
      receive: false,
      rz: 0.72,
      rx: legPitch,
    });
  }

  const glow = new THREE.PointLight(accent, 0.5, 8, 2);
  glow.position.set(0, 0.13, -0.04);
  rig.add(glow);

  return {
    group,
    rig,
    wings: [wingLeft, wingRight],
    glow,
    accentMaterials: [shellMaterial, abdomenMaterial],
    colorHex: accentHex,
    targetPosition: new THREE.Vector3(),
    targetYaw: 0,
    bobPhase: Math.random() * Math.PI * 2,
  };
}

function setRemoteFlyColor(remote, colorHex) {
  const normalized = normalizeColorHex(colorHex);
  if (remote.colorHex === normalized) {
    return;
  }

  const accent = new THREE.Color(normalized);
  remote.colorHex = normalized;

  for (const material of remote.accentMaterials) {
    material.color.copy(accent);
    material.emissive.copy(accent);
  }

  remote.glow.color.copy(accent);
}

function syncRemotePlayers(players) {
  const seen = new Set();

  for (const player of players) {
    if (player.id === network.playerId) {
      continue;
    }

    seen.add(player.id);

    if (!network.remotePlayers.has(player.id)) {
      network.remotePlayers.set(player.id, createRemoteFly(player));
    }

    const remote = network.remotePlayers.get(player.id);
    setRemoteFlyColor(remote, player.color);
    const state = player.state || {};
    remote.targetPosition.set(state.x || 0, state.y || 3.8, state.z || 0);
    remote.targetYaw = state.yaw || 0;
  }

  for (const [playerId, remote] of network.remotePlayers) {
    if (!seen.has(playerId)) {
      scene.remove(remote.group);
      network.remotePlayers.delete(playerId);
    }
  }
}

function renderRoster(players) {
  rosterCountEl.textContent = `${players.length} ${players.length === 1 ? "player" : "players"}`;
  rosterListEl.innerHTML = "";

  for (const player of players) {
    const row = document.createElement("div");
    row.className = "roster-row";

    const nameLine = document.createElement("div");
    nameLine.className = "roster-name-line";

    const colorDot = document.createElement("span");
    colorDot.className = "player-color-dot";
    colorDot.style.setProperty("--dot-color", normalizeColorHex(player.color));

    const nameText = document.createElement("span");
    nameText.textContent = player.name;

    nameLine.append(colorDot, nameText);

    if (player.isHost) {
      const hostPill = document.createElement("span");
      hostPill.className = "pill host";
      hostPill.textContent = "Host";
      nameLine.append(hostPill);
    }

    if (player.id === network.playerId) {
      const selfPill = document.createElement("span");
      selfPill.className = "pill";
      selfPill.textContent = "You";
      nameLine.append(selfPill);
    }

    const meta = document.createElement("div");
    meta.className = "roster-meta";
    meta.textContent = player.id === network.playerId ? "Connected from this browser" : "Flying in this server";

    row.append(nameLine, meta);
    rosterListEl.append(row);
  }
}

function applyLobbySnapshot(snapshot, options = {}) {
  network.lobby = snapshot.lobby;
  network.playerId = snapshot.player.id;
  network.joined = true;
  network.recoveringSession = false;
  clearCopyFeedback();
  setPlayerColor(snapshot.player?.color || network.playerColor, false);
  persistActiveSession();

  if (options.syncLocalPlayer) {
    applyLocalSpawnState(snapshot.player?.state || {});
  }

  const lobby = snapshot.lobby;
  const playerCount = lobby.players.length;
  const hostPlayer = lobby.players.find((player) => player.isHost);

  serverNameEl.textContent = lobby.name;
  playerCountEl.textContent = `${playerCount} / ${lobby.maxPlayers}`;
  serverVisibilityEl.textContent = lobby.visibility === "private" ? "Private" : "Public";
  serverCodeRow.hidden = !lobby.code;
  serverCodeEl.textContent = lobby.code || "-";
  sessionTitleEl.textContent = lobby.name;
  sessionCopyEl.textContent = hostPlayer
    ? `Hosted by ${hostPlayer.name}. Up to ${lobby.maxPlayers} players can fly together in this world.`
    : `Up to ${lobby.maxPlayers} players can fly together in this world.`;
  sessionAccessChip.textContent = lobby.visibility === "private" ? `Private ${lobby.code}` : "Public Server";
  sessionAccessChip.className = `session-chip ${lobby.visibility === "private" ? "private" : ""}`.trim();
  sessionHostChip.textContent = snapshot.player.isHost ? "You are host" : `Host: ${hostPlayer ? hostPlayer.name : "Unknown"}`;
  sessionHostChip.className = `session-chip ${snapshot.player.isHost ? "host" : ""}`.trim();
  sessionPanel.classList.remove("is-hidden");

  renderRoster(lobby.players);
  syncRemotePlayers(lobby.players);
  updateUiInteractivity();
}

async function refreshPublicServers(showQuietly = false) {
  try {
    const data = await apiRequest("/public-lobbies");
    const lobbies = data.lobbies || [];
    network.lastPublicRefreshAt = Date.now();
    publicServerCountEl.textContent = `${lobbies.length} live`;
    publicServerListEl.innerHTML = "";

    if (lobbies.length === 0) {
      const empty = document.createElement("div");
      empty.className = "server-row";
      empty.textContent = "No public servers are live yet. Create one and be the first fly in the neighborhood.";
      publicServerListEl.append(empty);
    }

    for (const lobby of lobbies) {
      const row = document.createElement("div");
      row.className = "server-row";
      row.dataset.lobbyId = lobby.id;
      row.dataset.lobbyName = lobby.name;

      const info = document.createElement("div");

      const nameLine = document.createElement("div");
      nameLine.className = "server-name-line";
      nameLine.textContent = lobby.name;

      const visibilityPill = document.createElement("span");
      visibilityPill.className = "pill";
      visibilityPill.textContent = "Public";
      nameLine.append(visibilityPill);

      const meta = document.createElement("div");
      meta.className = "server-meta";
      meta.textContent = `${lobby.playerCount}/${lobby.maxPlayers} players`;

      info.append(nameLine, meta);

      const joinButton = document.createElement("button");
      joinButton.className = "menu-button";
      joinButton.dataset.lobbyId = lobby.id;
      joinButton.dataset.lobbyName = lobby.name;
      joinButton.dataset.isFull = String(lobby.playerCount >= lobby.maxPlayers);
      joinButton.textContent = lobby.playerCount >= lobby.maxPlayers ? "Full" : "Join";
      joinButton.disabled = lobby.playerCount >= lobby.maxPlayers || Boolean(network.pendingAction);
      joinButton.addEventListener("click", () => joinPublicLobby(lobby.id));

      row.append(info, joinButton);
      publicServerListEl.append(row);
    }

    if (!showQuietly) {
      setMenuStatus("Public servers refreshed.");
    }

    updateUiInteractivity();
    return lobbies;
  } catch (error) {
    setMenuStatus(error.message, true);
    updateUiInteractivity();
    return [];
  }
}

function startBrowserRefresh() {
  stopBrowserRefresh();
  network.browserRefreshTimer = window.setInterval(() => {
    if (!network.joined) {
      refreshPublicServers(true);
    }
  }, browserRefreshIntervalMs);
}

function stopBrowserRefresh() {
  if (network.browserRefreshTimer) {
    window.clearInterval(network.browserRefreshTimer);
    network.browserRefreshTimer = null;
  }
}

function buildPlayerStatePayload() {
  return {
    x: flyer.position.x,
    y: flyer.position.y,
    z: flyer.position.z,
    yaw,
    pitch,
    roll,
  };
}

async function attemptSessionRecovery(sourceMessage = "") {
  if (!network.playerToken || network.recoveringSession) {
    return false;
  }

  network.recoveringSession = true;
  setMenuStatus("Connection wobbled. Re-syncing your server...", false);

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const snapshot = await apiRequest(buildSessionQuery(network.playerToken));
        applyLobbySnapshot(snapshot, { syncLocalPlayer: true });
        setMenuStatus("Server connection restored.");
        return true;
      } catch (error) {
        if (attempt === 1) {
          throw error;
        }
        await sleep(240 * (attempt + 1));
      }
    }
  } catch {
    network.recoveringSession = false;
    return false;
  }

  network.recoveringSession = false;
  return false;
}

async function syncSessionNow(handleDisconnect = true) {
  if (!network.joined || !network.playerToken || network.heartbeatInFlight) {
    return false;
  }

  network.heartbeatInFlight = true;

  try {
    const payload = {
      playerToken: network.playerToken,
      state: buildPlayerStatePayload(),
      color: network.playerColor,
    };
    const snapshot = await apiRequest("/heartbeat", payload, "POST");
    applyLobbySnapshot(snapshot);
    return true;
  } catch (error) {
    if (handleDisconnect) {
      const recovered = await attemptSessionRecovery(error.message);
      if (!recovered) {
        handleServerDisconnect(error.message);
      }
    }
    return false;
  } finally {
    network.heartbeatInFlight = false;
  }
}

function startHeartbeatLoop(runImmediately = false) {
  stopHeartbeatLoop();

  const tick = async () => {
    if (!network.joined || !network.playerToken) {
      return;
    }

    await syncSessionNow(true);

    if (network.joined && network.playerToken) {
      network.heartbeatTimer = window.setTimeout(tick, heartbeatIntervalMs);
    }
  };

  if (runImmediately) {
    tick();
    return;
  }

  network.heartbeatTimer = window.setTimeout(tick, heartbeatIntervalMs);
}

function stopHeartbeatLoop() {
  if (network.heartbeatTimer) {
    window.clearTimeout(network.heartbeatTimer);
    network.heartbeatTimer = null;
  }

  network.heartbeatInFlight = false;
}

function resetSessionUi() {
  network.joined = false;
  network.playerToken = "";
  network.playerId = "";
  network.lobby = null;
  network.recoveringSession = false;
  clearCopyFeedback();
  sessionPanel.classList.add("is-hidden");
  clearRemotePlayers();
  rosterListEl.innerHTML = "";
  rosterCountEl.textContent = "0 players";
  serverNameEl.textContent = "Offline";
  playerCountEl.textContent = "0 / 20";
  serverVisibilityEl.textContent = "Not Connected";
  serverCodeRow.hidden = true;
  serverCodeEl.textContent = "-";
  sessionTitleEl.textContent = "Join A Server";
  sessionCopyEl.textContent = "Join a public or private server from the menu to start flying online.";
  sessionAccessChip.textContent = "Offline";
  sessionAccessChip.className = "session-chip";
  sessionHostChip.textContent = "Solo";
  sessionHostChip.className = "session-chip";
  mapSelectLabelEl.textContent = "Neighborhood";
  mapNeighborhoodButton.classList.remove("is-active");
  mapForestButton.classList.remove("is-active");
  mapCityButton.classList.remove("is-active");
  updateUiInteractivity();
}

function handleServerDisconnect(message) {
  document.exitPointerLock?.();
  stopHeartbeatLoop();
  resetSessionUi();
  clearStoredSession();
  showMenu("servers");
  refreshPublicServers(true);
  setMenuStatus(message || "Connection to the server ended.", true);
}

async function joinPublicLobby(lobbyId) {
  setPendingAction(`join-public:${lobbyId}`);
  try {
    const payload = {
      lobbyId,
      displayName: getSavedDisplayName(),
      color: network.playerColor,
    };
    const snapshot = await apiRequest("/join-public", payload, "POST");
    network.playerToken = snapshot.player.token;
    applyLobbySnapshot(snapshot, { syncLocalPlayer: true });
    stopBrowserRefresh();
    hideMenu();
    startHeartbeatLoop(true);
    setMenuStatus("Joined server.");
  } catch (error) {
    setMenuStatus(error.message, true);
  } finally {
    setPendingAction("");
  }
}

async function joinPrivateLobby() {
  setPendingAction("join-private");
  try {
    const code = normalizeCode(joinCodeInput.value);
    joinCodeInput.value = code;

    const snapshot = await apiRequest("/join-private", {
      code,
      displayName: getSavedDisplayName(),
      color: network.playerColor,
    }, "POST");
    network.playerToken = snapshot.player.token;
    applyLobbySnapshot(snapshot, { syncLocalPlayer: true });
    stopBrowserRefresh();
    hideMenu();
    startHeartbeatLoop(true);
    setMenuStatus(`Joined private server ${code}.`);
  } catch (error) {
    setMenuStatus(error.message, true);
  } finally {
    setPendingAction("");
  }
}

async function createLobbyAndJoin() {
  setPendingAction("create");
  try {
    const lobbyName = createLobbyNameInput.value.trim();
    const code = normalizeCode(createCodeInput.value);
    createCodeInput.value = code;

    const snapshot = await apiRequest("/create-lobby", {
      displayName: getSavedDisplayName(),
      lobbyName,
      visibility: network.visibilityMode,
      code,
      color: network.playerColor,
    }, "POST");
    network.playerToken = snapshot.player.token;
    applyLobbySnapshot(snapshot, { syncLocalPlayer: true });
    stopBrowserRefresh();
    hideMenu();
    startHeartbeatLoop(true);
    setMenuStatus("Lobby created.");
  } catch (error) {
    setMenuStatus(error.message, true);
  } finally {
    setPendingAction("");
  }
}

async function leaveCurrentLobby() {
  if (!network.playerToken) {
    return;
  }

  setPendingAction("leave");
  const token = network.playerToken;
  clearStoredSession();

  try {
    await apiRequest("/leave", { playerToken: token }, "POST");
  } catch {
    // Best-effort leave. Stale sessions are still cleaned by the server.
  }

  document.exitPointerLock?.();
  stopHeartbeatLoop();
  resetSessionUi();
  showMenu("servers");
  refreshPublicServers(true);
  startBrowserRefresh();
  setMenuStatus("You left the server.");
  setPendingAction("");
}

function createBox(parent, material, x, y, z, width, height, depth, options = {}) {
  const mesh = new THREE.Mesh(geometries.box, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  mesh.rotation.set(options.rx || 0, options.ry || 0, options.rz || 0);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

function createRetroBox(parent, materialsByFace, x, y, z, width, height, depth, options = {}) {
  const wall = materialsByFace.wall || materialsByFace.front || materialsByFace.back;
  const faceMaterials = createFaceMaterials({
    right: materialsByFace.right || wall,
    left: materialsByFace.left || wall,
    top: materialsByFace.top || materialsByFace.roof || wall,
    bottom: materialsByFace.bottom || materialsByFace.floor || wall,
    front: materialsByFace.front || wall,
    back: materialsByFace.back || wall,
  });
  return createBox(parent, faceMaterials, x, y, z, width, height, depth, options);
}

function addRoofVents(parent, x, y, z, width, depth, rand, count = 2) {
  for (let index = 0; index < count; index += 1) {
    const px = x + (rand() - 0.5) * width * 0.48;
    const pz = z + (rand() - 0.5) * depth * 0.48;
    createBox(parent, retroRoofVentMaterial, px, y, pz, 1.4 + rand() * 1.2, 0.55 + rand() * 0.35, 1 + rand() * 1.1, {
      cast: false,
    });
  }
}

function addCornerTrim(parent, material, x, y, z, width, height, depth, thickness = 0.18) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      createBox(parent, material, x + sx * width * 0.5, y, z + sz * depth * 0.5, thickness, height, thickness, { cast: false });
    }
  }
}

function createSphere(parent, material, x, y, z, radius, options = {}) {
  const mesh = new THREE.Mesh(geometries.sphere, material);
  mesh.position.set(x, y, z);
  mesh.scale.setScalar(radius * 2);
  mesh.rotation.set(options.rx || 0, options.ry || 0, options.rz || 0);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

function createScaledSphere(parent, material, x, y, z, scaleX, scaleY, scaleZ, options = {}) {
  const mesh = new THREE.Mesh(geometries.sphere, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(scaleX, scaleY, scaleZ);
  mesh.rotation.set(options.rx || 0, options.ry || 0, options.rz || 0);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

function createCylinder(parent, material, x, y, z, radius, height, options = {}) {
  const mesh = new THREE.Mesh(geometries.cylinder, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(radius * 2, height, radius * 2);
  mesh.rotation.set(options.rx || 0, options.ry || 0, options.rz || 0);
  mesh.castShadow = options.cast !== false;
  mesh.receiveShadow = options.receive !== false;
  parent.add(mesh);
  return mesh;
}

function createCone(parent, material, x, y, z, width, height, depth, options = {}) {
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

function createPatch(parent, material, x, z, width, depth, y = 0.02) {
  const mesh = new THREE.Mesh(geometries.plane, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.scale.set(width, depth, 1);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createRingPatch(parent, material, x, z, innerRadius, outerRadius, y = 0.02, segments = 40) {
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

function createGroundHolePatch(parent, material, x, z, width, depth, holeX, holeZ, holeRadius) {
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

function addCollider(chunk, x, y, z, width, height, depth) {
  const min = new THREE.Vector3(
    chunk.cx * chunkSize + x - width / 2,
    y,
    chunk.cz * chunkSize + z - depth / 2
  );
  const max = new THREE.Vector3(
    chunk.cx * chunkSize + x + width / 2,
    y + height,
    chunk.cz * chunkSize + z + depth / 2
  );
  const box = new THREE.Box3(min, max);
  chunk.colliders.push(box);
  chunk.visibilityBlockers.push(box.clone());
}

function addVisibilityBlocker(chunk, x, y, z, width, height, depth) {
  const min = new THREE.Vector3(
    chunk.cx * chunkSize + x - width / 2,
    y,
    chunk.cz * chunkSize + z - depth / 2
  );
  const max = new THREE.Vector3(
    chunk.cx * chunkSize + x + width / 2,
    y + height,
    chunk.cz * chunkSize + z + depth / 2
  );
  chunk.visibilityBlockers.push(new THREE.Box3(min, max));
}

function addNoiseZone(chunk, x, z, radius, intensity = 0.3) {
  chunk.noiseZones.push({
    x: chunk.cx * chunkSize + x,
    z: chunk.cz * chunkSize + z,
    radius,
    intensity,
  });
}

function segmentIntersectsBox(start, end, box, padding = 0) {
  const min = tempBlockerMin.copy(box.min).addScalar(-padding);
  const max = tempBlockerMax.copy(box.max).addScalar(padding);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  let tMin = 0;
  let tMax = 1;

  for (const axis of ["x", "y", "z"]) {
    const origin = start[axis];
    const direction = axis === "x" ? dx : axis === "y" ? dy : dz;
    const axisMin = min[axis];
    const axisMax = max[axis];

    if (Math.abs(direction) < 0.00001) {
      if (origin < axisMin || origin > axisMax) {
        return false;
      }
      continue;
    }

    const inverse = 1 / direction;
    let t1 = (axisMin - origin) * inverse;
    let t2 = (axisMax - origin) * inverse;
    if (t1 > t2) {
      const swap = t1;
      t1 = t2;
      t2 = swap;
    }

    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMax < tMin) {
      return false;
    }
  }

  return tMax > 0.04 && tMin < 0.96;
}

function hasVisibilityBlockerBetween(start, end, padding = 0.2) {
  for (const chunk of chunks.values()) {
    for (const box of chunk.visibilityBlockers || []) {
      if (segmentIntersectsBox(start, end, box, padding)) {
        return true;
      }
    }
  }
  for (const box of caveState.visibilityBlockers) {
    if (segmentIntersectsBox(start, end, box, padding)) {
      return true;
    }
  }
  return false;
}

function sampleNoiseZoneIntensity(position) {
  const baseChunkX = getChunkCoord(position.x);
  const baseChunkZ = getChunkCoord(position.z);
  let intensity = 0;

  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const chunk = chunks.get(`${baseChunkX + dx},${baseChunkZ + dz}`);
      if (!chunk) {
        continue;
      }
      for (const zone of chunk.noiseZones || []) {
        const distSq = (zone.x - position.x) ** 2 + (zone.z - position.z) ** 2;
        if (distSq <= zone.radius * zone.radius) {
          intensity = Math.max(intensity, zone.intensity);
        }
      }
    }
  }

  return intensity;
}

function createFenceRect(parent, x, z, width, depth) {
  const railHeight = 0.55;
  const postSize = 0.28;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  createBox(parent, materials.fence, x, railHeight, z - halfDepth, width, 0.18, 0.18);
  createBox(parent, materials.fence, x, railHeight, z + halfDepth, width, 0.18, 0.18);
  createBox(parent, materials.fence, x - halfWidth, railHeight, z, 0.18, 0.18, depth);
  createBox(parent, materials.fence, x + halfWidth, railHeight, z, 0.18, 0.18, depth);

  for (const [px, pz] of [
    [x - halfWidth, z - halfDepth],
    [x + halfWidth, z - halfDepth],
    [x - halfWidth, z + halfDepth],
    [x + halfWidth, z + halfDepth],
  ]) {
    createBox(parent, materials.fence, px, 0.45, pz, postSize, 0.9, postSize);
  }
}

function createBench(parent, x, z, rotationY = 0) {
  const bench = new THREE.Group();
  bench.position.set(x, 0, z);
  bench.rotation.y = rotationY;
  parent.add(bench);

  createBox(bench, materials.benchWood, 0, 0.58, 0, 1.8, 0.14, 0.38);
  createBox(bench, materials.benchWood, 0, 0.92, -0.14, 1.8, 0.14, 0.18, { rx: -0.18 });
  createBox(bench, materials.benchMetal, -0.68, 0.33, 0, 0.14, 0.66, 0.14);
  createBox(bench, materials.benchMetal, 0.68, 0.33, 0, 0.14, 0.66, 0.14);

  return bench;
}

function createLamp(parent, x, z) {
  const lamp = new THREE.Group();
  lamp.position.set(x, 0, z);
  parent.add(lamp);

  createCylinder(lamp, materials.lampPole, 0, 3.4, 0, 0.14, 6.8);
  createBox(lamp, materials.lampPole, 0.55, 6.6, 0, 1.1, 0.12, 0.12);
  createSphere(lamp, materials.lampBulb, 1.02, 6.22, 0, 0.2, { receive: false });

  return lamp;
}

function createMailbox(parent, x, z, facing) {
  const mailbox = new THREE.Group();
  mailbox.position.set(x, 0, z);
  mailbox.rotation.y = facing;
  parent.add(mailbox);

  createBox(mailbox, materials.benchMetal, 0, 0.55, 0, 0.12, 1.1, 0.12);
  createBox(mailbox, materials.mailbox, 0, 1.05, 0, 0.55, 0.35, 0.4);
  createBox(mailbox, materials.trim, 0.23, 1.03, 0, 0.06, 0.28, 0.05);
}

function createFlowerPatch(parent, x, z, radius, count, rand) {
  for (let index = 0; index < count; index += 1) {
    const angle = rand() * Math.PI * 2;
    const distance = rand() * radius;
    const fx = x + Math.cos(angle) * distance;
    const fz = z + Math.sin(angle) * distance;
    createCylinder(parent, materials.hedge, fx, 0.15, fz, 0.03, 0.3, { cast: false });
    createSphere(parent, materials.flower, fx, 0.38, fz, 0.08, { cast: false, receive: false });
  }
}

function createForestPlantPatch(parent, rand, x, z, radius, count) {
  const plantMaterials = [materials.forestPlantA, materials.forestPlantB, materials.forestPlantC];

  for (let index = 0; index < count; index += 1) {
    const angle = rand() * Math.PI * 2;
    const distance = rand() * radius;
    const px = x + Math.cos(angle) * distance;
    const pz = z + Math.sin(angle) * distance;
    const stemHeight = 0.16 + rand() * 0.42;
    const spread = 0.18 + rand() * 0.32;
    const material = pick(rand, plantMaterials);

    createCylinder(parent, material, px, stemHeight * 0.5, pz, 0.025 + rand() * 0.025, stemHeight, { cast: false });
    createSphere(parent, material, px, stemHeight + 0.08, pz, spread, { cast: false });

    if (rand() > 0.68) {
      createSphere(parent, materials.flower, px + (rand() - 0.5) * 0.2, stemHeight + 0.22, pz + (rand() - 0.5) * 0.2, 0.06 + rand() * 0.05, {
        cast: false,
        receive: false,
      });
    }
  }
}

function createForestBush(parent, rand, x, z, scale = 1) {
  const material = pick(rand, [materials.forestPlantA, materials.forestPlantB, materials.forestFoliageA, materials.forestFoliageB]);
  const radius = (0.65 + rand() * 0.55) * scale;
  createSphere(parent, material, x, 0.42 * scale, z, radius, { cast: false });
  createSphere(parent, material, x - radius * 0.4, 0.34 * scale, z + radius * 0.2, radius * 0.68, { cast: false });
  createSphere(parent, material, x + radius * 0.32, 0.36 * scale, z - radius * 0.26, radius * 0.62, { cast: false });
  return radius;
}

function createForestCampfire(parent, rand, x, z) {
  createPatch(parent, materials.ash, x, z, 2.8, 2.4, 0.028);

  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI * 2 * index) / 6;
    createSphere(parent, materials.trim, x + Math.cos(angle) * 0.62, 0.16, z + Math.sin(angle) * 0.54, 0.12 + rand() * 0.05, { cast: false });
  }

  createCylinder(parent, materials.bark, x - 0.26, 0.2, z, 0.08, 1.3, { rx: Math.PI / 2, ry: 0.6, cast: false });
  createCylinder(parent, materials.bark, x + 0.24, 0.2, z + 0.06, 0.08, 1.2, { rx: Math.PI / 2, ry: -0.7, cast: false });

  for (let ember = 0; ember < 4; ember += 1) {
    createSphere(parent, materials.ember, x + (rand() - 0.5) * 0.38, 0.14 + rand() * 0.08, z + (rand() - 0.5) * 0.34, 0.05 + rand() * 0.03, {
      cast: false,
      receive: false,
    });
  }
}

function createFallenLog(parent, rand, x, z, length = 5 + rand() * 4) {
  createCylinder(parent, materials.bark, x, 0.34, z, 0.18 + rand() * 0.08, length, {
    rx: Math.PI / 2,
    ry: rand() * Math.PI * 2,
    cast: false,
  });
}

function createClothPile(parent, rand, x, z) {
  const clothMaterial = rand() > 0.5 ? materials.forestCloth : materials.forestClothDark;
  createBox(parent, clothMaterial, x, 0.08, z, 0.9 + rand() * 0.7, 0.08, 0.7 + rand() * 0.6, {
    cast: false,
    rz: (rand() - 0.5) * 0.3,
    ry: rand() * Math.PI,
  });
  createBox(parent, clothMaterial, x + (rand() - 0.5) * 0.35, 0.12, z + (rand() - 0.5) * 0.26, 0.42 + rand() * 0.36, 0.08, 0.3 + rand() * 0.28, {
    cast: false,
    rz: (rand() - 0.5) * 0.5,
    ry: rand() * Math.PI,
  });
}

function createBloodSplatters(parent, rand, x, z, radius = 1.1, count = 6) {
  for (let index = 0; index < count; index += 1) {
    const angle = rand() * Math.PI * 2;
    const distance = rand() * radius;
    createPatch(
      parent,
      materials.blood,
      x + Math.cos(angle) * distance,
      z + Math.sin(angle) * distance,
      0.22 + rand() * 0.65,
      0.18 + rand() * 0.45,
      0.031
    );
  }
}

function createBonePile(parent, rand, x, z) {
  for (let index = 0; index < 4 + Math.floor(rand() * 3); index += 1) {
    createCylinder(parent, materials.bone, x + (rand() - 0.5) * 0.65, 0.1 + rand() * 0.12, z + (rand() - 0.5) * 0.65, 0.035 + rand() * 0.02, 0.32 + rand() * 0.28, {
      rx: Math.PI / 2 + (rand() - 0.5) * 0.45,
      ry: rand() * Math.PI * 2,
      rz: (rand() - 0.5) * 0.35,
      cast: false,
    });
  }
}

function createBrokenMarker(parent, rand, x, z) {
  createBox(parent, materials.bark, x, 1.2, z, 0.2, 2.4, 0.2, {
    cast: false,
    rz: (rand() - 0.5) * 0.18,
  });
  createBox(parent, materials.trim, x + 0.28, 1.78, z, 0.74, 0.22, 0.08, {
    cast: false,
    ry: rand() * 0.4,
    rz: -0.2 + (rand() - 0.5) * 0.16,
  });
}

function createForestLeafDrift(chunk, rand, x, z, spread = 8) {
  const leafCount = 7 + Math.floor(rand() * 6);
  const leaves = [];

  for (let index = 0; index < leafCount; index += 1) {
    const leaf = new THREE.Mesh(geometries.plane, materials.forestLeaf);
    leaf.castShadow = false;
    leaf.receiveShadow = false;
    leaf.scale.setScalar(0.12 + rand() * 0.14);
    chunk.group.add(leaf);
    leaves.push({
      mesh: leaf,
      offset: new THREE.Vector3((rand() - 0.5) * spread, 2 + rand() * 7, (rand() - 0.5) * spread),
      phase: rand() * Math.PI * 2,
      drift: 0.5 + rand() * 0.8,
      fall: 0.45 + rand() * 0.55,
    });
  }

  chunk.actors.push({
    kind: "forest-leaves",
    update(delta, time) {
      for (const leaf of leaves) {
        leaf.offset.y -= delta * leaf.fall;
        if (leaf.offset.y < 0.15) {
          leaf.offset.y = 5 + rand() * 7;
        }
        leaf.mesh.position.set(
          x + leaf.offset.x + Math.sin(time * leaf.drift + leaf.phase) * 0.9,
          leaf.offset.y,
          z + leaf.offset.z + Math.cos(time * (leaf.drift * 0.8) + leaf.phase) * 0.8
        );
        leaf.mesh.rotation.set(Math.sin(time * 2.2 + leaf.phase) * 0.5, time * leaf.drift + leaf.phase, Math.cos(time * 2.8 + leaf.phase) * 0.7);
      }
    },
  });
}

function addDriverToCar(car, rand) {
  const skin = pick(rand, skinMaterials);
  const shirt = pick(rand, shirtMaterials);
  const head = createSphere(car, skin, -0.25, 1.18, 0.16, 0.15, { cast: false, receive: false });
  const torso = createBox(car, shirt, -0.26, 0.88, 0.16, 0.34, 0.44, 0.28, { cast: false, receive: false });
  const shoulder = createBox(car, shirt, -0.06, 0.9, 0.16, 0.18, 0.14, 0.18, { cast: false, receive: false, rz: -0.4 });
  head.rotation.z = (rand() - 0.5) * 0.16;
  torso.rotation.z = -0.08;
  shoulder.rotation.x = 0.25;
}

function createCar(parent, x, z, rotationY, rand, options = {}) {
  const bodyMaterial = options.bodyMaterial || pick(rand, carMaterials);
  const car = new THREE.Group();
  car.position.set(x, 0, z);
  car.rotation.y = rotationY;
  parent.add(car);

  createBox(car, bodyMaterial, 0, 0.55, 0, 3.6, 0.7, 1.8);
  createBox(car, materials.carGlass, -0.15, 0.98, 0, 1.9, 0.55, 1.45, { receive: false });
  createBox(car, materials.trim, -1.15, 0.42, 0.92, 0.28, 0.28, 0.12);
  createBox(car, materials.trim, 1.15, 0.42, 0.92, 0.28, 0.28, 0.12);
  createBox(car, materials.trim, -1.15, 0.42, -0.92, 0.28, 0.28, 0.12);
  createBox(car, materials.trim, 1.15, 0.42, -0.92, 0.28, 0.28, 0.12);

  if (options.driver) {
    addDriverToCar(car, rand);
  }

  return car;
}

function createCityBus(parent, x, z, rotationY, rand, options = {}) {
  const bus = new THREE.Group();
  bus.position.set(x, 0, z);
  bus.rotation.y = rotationY;
  parent.add(bus);

  const bodyMaterial = options.bodyMaterial || pick(rand, cityAccentMaterials);
  createBox(bus, bodyMaterial, 0, 1.18, 0, 7.6, 2.15, 2.2);
  createBox(bus, materials.carGlass, -0.3, 2.0, 0, 6.1, 0.55, 1.9, { receive: false });
  createBox(bus, materials.carGlass, 3.45, 1.35, 0, 0.12, 1.4, 1.5, { receive: false });
  createBox(bus, materials.trim, 0, 0.42, 1.1, 6.8, 0.2, 0.1);
  createBox(bus, materials.trim, 0, 0.42, -1.1, 6.8, 0.2, 0.1);
  createBox(bus, materials.trim, -3.35, 0.42, 0, 0.12, 0.26, 2.0);
  createBox(bus, materials.trim, 3.35, 0.42, 0, 0.12, 0.26, 2.0);

  if (options.driver !== false) {
    addDriverToCar(bus, rand);
  }

  return bus;
}

function createCityTruck(parent, x, z, rotationY, rand, options = {}) {
  const truck = new THREE.Group();
  truck.position.set(x, 0, z);
  truck.rotation.y = rotationY;
  parent.add(truck);

  const bodyMaterial = options.bodyMaterial || pick(rand, cityAccentMaterials);
  createBox(truck, materials.trim, -2.15, 1.02, 0, 2.5, 1.7, 2.1);
  createBox(truck, materials.carGlass, -2.45, 1.5, 0, 1.2, 0.6, 1.7, { receive: false });
  createBox(truck, bodyMaterial, 1.45, 1.15, 0, 5.1, 2.1, 2.35);
  createBox(truck, materials.trim, 1.45, 2.35, 0, 5.2, 0.16, 2.4);
  createBox(truck, materials.trim, -3.45, 0.42, 0, 0.14, 0.26, 2.05);
  createBox(truck, materials.trim, 3.9, 0.42, 0, 0.14, 0.26, 2.05);

  if (options.driver !== false) {
    addDriverToCar(truck, rand);
  }

  return truck;
}

function createLimo(parent, x, z, rotationY, rand, options = {}) {
  const limo = new THREE.Group();
  limo.position.set(x, 0, z);
  limo.rotation.y = rotationY;
  parent.add(limo);

  const bodyMaterial = options.bodyMaterial || new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.7 });
  createBox(limo, bodyMaterial, 0, 0.62, 0, 7.4, 0.72, 1.9);
  createBox(limo, materials.carGlass, -0.25, 1.02, 0, 5.0, 0.48, 1.5, { receive: false });
  createBox(limo, materials.trim, 0, 0.4, 0.98, 6.8, 0.12, 0.08);
  createBox(limo, materials.trim, 0, 0.4, -0.98, 6.8, 0.12, 0.08);
  createBox(limo, materials.trim, -3.3, 0.42, 0, 0.18, 0.24, 2);
  createBox(limo, materials.trim, 3.3, 0.42, 0, 0.18, 0.24, 2);

  if (options.driver !== false) {
    addDriverToCar(limo, rand);
  }

  return limo;
}

function createStreetTrash(parent, rand, x, z, spread = 1.4) {
  const count = 3 + Math.floor(rand() * 4);
  for (let index = 0; index < count; index += 1) {
    const material = pick(rand, trashMaterials);
    createBox(
      parent,
      material,
      x + (rand() - 0.5) * spread,
      0.04 + rand() * 0.06,
      z + (rand() - 0.5) * spread,
      0.18 + rand() * 0.5,
      0.03 + rand() * 0.06,
      0.14 + rand() * 0.38,
      { cast: false, ry: rand() * Math.PI }
    );
  }
}

function createDumpster(parent, x, z, rotationY = 0) {
  const dumpster = new THREE.Group();
  dumpster.position.set(x, 0, z);
  dumpster.rotation.y = rotationY;
  parent.add(dumpster);

  createBox(dumpster, materials.benchMetal, 0, 0.95, 0, 2.6, 1.8, 1.5);
  createBox(dumpster, materials.trim, 0, 1.95, 0, 2.7, 0.12, 1.6, { rz: -0.08 });
  createBox(dumpster, materials.trim, -0.8, 0.4, 0.82, 0.24, 0.24, 0.18);
  createBox(dumpster, materials.trim, 0.8, 0.4, 0.82, 0.24, 0.24, 0.18);
}

function createRoadStripe(parent, x, z, width, depth, rotationY = 0) {
  createPatch(parent, materials.trim, x, z, width, depth, 0.03);
  const stripe = parent.children[parent.children.length - 1];
  stripe.rotation.y = rotationY;
}

function createUrbanTower(chunk, rand, x, z, options = {}) {
  const width = options.width || (12 + rand() * 7);
  const depth = options.depth || (12 + rand() * 7);
  const floors = options.floors || (7 + Math.floor(rand() * 8));
  const floorHeight = 3.2;
  const height = floors * floorHeight;
  const wallMaterial = options.wallMaterial || pick(rand, cityWallMaterials);
  const glassMaterial = options.glassMaterial || pick(rand, cityGlassMaterials);
  const accentMaterial = options.accentMaterial || pick(rand, cityAccentMaterials);

  createRetroBox(chunk.group, { wall: wallMaterial, roof: retroRoofVentMaterial, front: wallMaterial, back: wallMaterial }, x, height / 2, z, width, height, depth);
  createBox(chunk.group, accentMaterial, x, height + 0.45, z, width + 0.8, 0.9, depth + 0.8);
  createBox(chunk.group, glassMaterial, x, 2.1, z + depth / 2 + 0.08, width * 0.5, 2.8, 0.12);
  addCornerTrim(chunk.group, retroWallDark, x, height / 2, z, width + 0.18, height, depth + 0.18, 0.18);
  addRoofVents(chunk.group, x, height + 1.08, z, width, depth, rand, 1 + Math.floor(rand() * 2));

  const columns = Math.max(2, Math.floor((width - 4) / 3.6));
  for (let floor = 0; floor < floors; floor += 1) {
    const y = 1.8 + floor * floorHeight;
    for (let column = 0; column < columns; column += 1) {
      const offset = -width * 0.34 + (column / Math.max(1, columns - 1)) * (width * 0.68);
      createBox(chunk.group, glassMaterial, x + offset, y, z + depth / 2 + 0.12, 1.8, 1.5, 0.14);
      createBox(chunk.group, glassMaterial, x + offset, y, z - depth / 2 - 0.12, 1.8, 1.5, 0.14);
      createBox(chunk.group, glassMaterial, x + width / 2 + 0.12, y, z + offset, 0.14, 1.5, 1.8);
      createBox(chunk.group, glassMaterial, x - width / 2 - 0.12, y, z + offset, 0.14, 1.5, 1.8);
    }
  }

  addCollider(chunk, x, 0, z, Math.max(10, width - 0.7), height + 1.2, Math.max(10, depth - 0.7));
}

function createBankBuilding(chunk, rand, x, z, rotationY = 0) {
  const bank = new THREE.Group();
  bank.position.set(x, 0, z);
  bank.rotation.y = rotationY;
  chunk.group.add(bank);

  const wallMaterial = pick(rand, cityWallMaterials);
  createRetroBox(bank, { wall: wallMaterial, roof: retroRoofVentMaterial, front: wallMaterial, back: wallMaterial }, 0, 4.6, 0, 24, 9.2, 16);
  createBox(bank, materials.trim, 0, 9.45, 0, 24.8, 0.6, 16.8);
  createBox(bank, pick(rand, cityGlassMaterials), 0, 2.9, 8.05, 10.5, 3.4, 0.14);
  createBox(bank, retroSigns.bank, 0, 7.5, 8.08, 9.5, 1.25, 0.14);
  createBox(bank, materials.trim, 0, 1.8, 8.1, 2.4, 3.6, 0.14);
  addCornerTrim(bank, retroWallDark, 0, 4.6, 0, 24.2, 9.2, 16.2, 0.18);
  addRoofVents(bank, 0, 10.15, 0, 18, 10, rand, 2);

  for (const columnX of [-7, -3.5, 0, 3.5, 7]) {
    createCylinder(bank, materials.trim, columnX, 3.8, 7.4, 0.34, 7.2);
  }

  createPatch(bank, materials.sidewalk, 0, 12, 26, 8, 0.03);
  createBench(bank, -6.5, 12, Math.PI);
  createBench(bank, 6.5, 12, Math.PI);
  addCollider(chunk, x, 0, z, 23, 10.4, 15);
}

function createHotelBuilding(chunk, rand, x, z, rotationY = 0) {
  const hotel = new THREE.Group();
  hotel.position.set(x, 0, z);
  hotel.rotation.y = rotationY;
  chunk.group.add(hotel);

  const wallMaterial = pick(rand, cityWallMaterials);
  const glassMaterial = pick(rand, cityGlassMaterials);
  const accentMaterial = pick(rand, cityAccentMaterials);

  createRetroBox(hotel, { wall: wallMaterial, roof: retroRoofVentMaterial, front: wallMaterial, back: wallMaterial }, 0, 8.2, 0, 20, 16.4, 14);
  createBox(hotel, accentMaterial, 0, 17.2, 0, 20.8, 0.7, 14.8);
  createBox(hotel, accentMaterial, 0, 4.4, 7.2, 11, 0.45, 0.15);
  createBox(hotel, glassMaterial, 0, 2.4, 7.1, 4, 3.1, 0.14);
  createBox(hotel, materials.trim, 0, 0.55, 8.2, 8, 1.1, 0.6);
  createBox(hotel, retroSigns.hotel, 0, 13.9, 7.16, 8.8, 1.4, 0.14);
  addCornerTrim(hotel, retroWallDark, 0, 8.2, 0, 20.2, 16.4, 14.2, 0.18);
  addRoofVents(hotel, 0, 17.85, 0, 14, 9, rand, 2);

  for (let floor = 0; floor < 5; floor += 1) {
    const y = 2.2 + floor * 2.9;
    for (let column = -3; column <= 3; column += 1) {
      createBox(hotel, glassMaterial, column * 2.5, y, 7.12, 1.5, 1.35, 0.12);
      createBox(hotel, glassMaterial, column * 2.5, y, -7.12, 1.5, 1.35, 0.12);
    }
  }

  createPatch(hotel, materials.sidewalk, 0, 12, 18, 7, 0.03);
  addCollider(chunk, x, 0, z, 19, 18, 13);
}

function createStorefrontRow(chunk, rand, x, z, rotationY = 0) {
  const row = new THREE.Group();
  row.position.set(x, 0, z);
  row.rotation.y = rotationY;
  chunk.group.add(row);

  const units = 3 + Math.floor(rand() * 2);
  const totalWidth = units * 6.2;
  const wallMaterial = pick(rand, cityWallMaterials);
  createRetroBox(row, { wall: wallMaterial, roof: retroRoofVentMaterial, front: wallMaterial, back: wallMaterial }, 0, 3.2, 0, totalWidth, 6.4, 10);
  createBox(row, pick(rand, cityAccentMaterials), 0, 6.7, 0, totalWidth + 0.8, 0.6, 10.8);
  addCornerTrim(row, retroWallDark, 0, 3.2, 0, totalWidth + 0.1, 6.4, 10.1, 0.16);

  for (let index = 0; index < units; index += 1) {
    const px = -totalWidth / 2 + 3.1 + index * 6.2;
    createBox(row, pick(rand, cityGlassMaterials), px, 2.2, 5.05, 4.2, 2.8, 0.14);
    createBox(row, materials.trim, px, 4.25, 5.1, 4.6, 0.35, 0.12);
    createBox(row, materials.door, px, 1.4, 5.08, 1.2, 2.8, 0.14);
    createBox(row, retroSigns.shop, px, 5.45, 5.1, 3.9, 0.72, 0.13);
  }

  createPatch(row, materials.sidewalk, 0, 8, totalWidth + 3, 6, 0.03);
  addCollider(chunk, x, 0, z, totalWidth - 0.8, 7.4, 9.2);
}

function createHomelessPerson(chunk, rand, x, z, rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  chunk.group.add(group);

  const coat = pick(rand, [trashMaterials[1], pantsMaterials[1], suitMaterials[1]]);
  const skin = pick(rand, skinMaterials);
  createBox(group, coat, 0, 0.44, 0, 1.1, 0.5, 0.78, { cast: false, rz: 0.1 });
  createSphere(group, skin, 0, 0.94, 0.08, 0.24, { cast: false, receive: false });
  createBox(group, coat, -0.34, 0.24, 0.12, 0.44, 0.28, 0.28, { cast: false, rz: -0.5 });
  createBox(group, coat, 0.34, 0.24, 0.12, 0.44, 0.28, 0.28, { cast: false, rz: 0.5 });
  createBox(group, coat, 0, 0.08, -0.3, 1.25, 0.06, 0.95, { cast: false });
}

function createGazebo(parent, x, z) {
  const gazebo = new THREE.Group();
  gazebo.position.set(x, 0, z);
  parent.add(gazebo);

  createPatch(gazebo, materials.path, 0, 0, 8.5, 8.5, 0.03);

  for (const [px, pz] of [
    [-2.4, -2.4],
    [2.4, -2.4],
    [-2.4, 2.4],
    [2.4, 2.4],
  ]) {
    createCylinder(gazebo, materials.trim, px, 1.8, pz, 0.12, 3.6);
  }

  createBox(gazebo, materials.trim, 0, 3.3, 0, 5.6, 0.18, 5.6);
  createCone(gazebo, roofMaterials[1], 0, 4.7, 0, 4.8, 2.3, 4.8, { ry: Math.PI / 4 });
  createBox(gazebo, retroRoofVentMaterial, 0, 5.95, 0, 0.8, 0.35, 0.8, { cast: false });
  createBench(gazebo, 0, -1.55, Math.PI);
}

function createBusStop(parent, x, z, rotationY = 0) {
  const stop = new THREE.Group();
  stop.position.set(x, 0, z);
  stop.rotation.y = rotationY;
  parent.add(stop);

  createBox(stop, materials.trim, 0, 0.05, 0, 5.6, 0.08, 2.2, { cast: false });
  createCylinder(stop, materials.lampPole, -2.2, 1.45, -0.9, 0.08, 2.9);
  createCylinder(stop, materials.lampPole, 2.2, 1.45, -0.9, 0.08, 2.9);
  createCylinder(stop, materials.lampPole, -2.2, 1.45, 0.9, 0.08, 2.9);
  createCylinder(stop, materials.lampPole, 2.2, 1.45, 0.9, 0.08, 2.9);
  createBox(stop, materials.carGlass, 0, 2.95, 0, 5.1, 0.12, 2.3, { cast: false, receive: false });
  createBox(stop, materials.carGlass, -2.12, 1.25, 0, 0.1, 2.1, 1.7, { cast: false, receive: false });
  createBox(stop, materials.carGlass, 2.12, 1.25, 0, 0.1, 2.1, 1.7, { cast: false, receive: false });
  createBox(stop, retroSigns.warning, 0, 2.15, -1.02, 2.2, 0.55, 0.08, { cast: false, receive: false });
  createBench(stop, 0, 0, Math.PI);
}

function createPool(parent, x, z, width, depth) {
  createPatch(parent, materials.sidewalk, x, z, width + 5, depth + 5, 0.026);
  createPatch(parent, materials.water, x, z, width, depth, 0.04);
  createBox(parent, materials.trim, x, 0.18, z - depth / 2, width + 0.8, 0.18, 0.32, { cast: false });
  createBox(parent, materials.trim, x, 0.18, z + depth / 2, width + 0.8, 0.18, 0.32, { cast: false });
  createBox(parent, materials.trim, x - width / 2, 0.18, z, 0.32, 0.18, depth + 0.8, { cast: false });
  createBox(parent, materials.trim, x + width / 2, 0.18, z, 0.32, 0.18, depth + 0.8, { cast: false });
  createBench(parent, x - width / 2 - 2.2, z + depth / 2 + 1.8, -Math.PI / 2);
}

function createApartmentBlock(chunk, rand, x, z) {
  const width = 24 + rand() * 6;
  const depth = 12 + rand() * 4;
  const floors = 3 + Math.floor(rand() * 3);
  const height = floors * 3.1;
  const wallMaterial = pick(rand, houseWalls);
  const roofMaterial = pick(rand, roofMaterials);

  createRetroBox(chunk.group, { wall: wallMaterial, roof: roofMaterial, front: wallMaterial, back: wallMaterial }, x, height / 2, z, width, height, depth);
  createBox(chunk.group, roofMaterial, x, height + 0.55, z, width + 1.2, 1.1, depth + 1.2);
  createBox(chunk.group, materials.trim, x, 0.5, z + depth / 2 + 0.2, width * 0.3, 1, 0.45);
  createBox(chunk.group, materials.window, x, 2, z + depth / 2 + 0.24, width * 0.26, 2.2, 0.16);
  addCornerTrim(chunk.group, retroWallDark, x, height / 2, z, width + 0.1, height, depth + 0.1, 0.14);
  addRoofVents(chunk.group, x, height + 1.28, z, width, depth, rand, 1);

  for (let floor = 0; floor < floors; floor += 1) {
    const y = 1.7 + floor * 3.1;
    for (const side of [-1, 1]) {
      for (let column = -2; column <= 2; column += 1) {
        createBox(chunk.group, materials.window, x + column * 4.3, y, z + side * (depth / 2 + 0.08), 2.2, 1.55, 0.14);
      }
    }
  }

  createPatch(chunk.group, materials.path, x, z + depth / 2 + 6, 6, 12, 0.03);
  createFenceRect(chunk.group, x, z, width + 8, depth + 12);
  addCollider(chunk, x, 0, z, Math.max(8, width - 0.9), height + 0.8, Math.max(8, depth - 0.9));
}

function createCornerShop(chunk, rand, x, z, rotationY = 0) {
  const shop = new THREE.Group();
  shop.position.set(x, 0, z);
  shop.rotation.y = rotationY;
  chunk.group.add(shop);

  const wallMaterial = pick(rand, houseWalls);
  const awningMaterial = rand() > 0.5 ? materials.playSet : materials.playAccent;

  createRetroBox(shop, { wall: wallMaterial, roof: pick(rand, roofMaterials), front: wallMaterial, back: wallMaterial }, 0, 3.1, 0, 16, 6.2, 12);
  createBox(shop, pick(rand, roofMaterials), 0, 6.55, 0, 16.8, 0.9, 12.8);
  createBox(shop, materials.window, -4.4, 2.4, 6.08, 3.6, 2.6, 0.16);
  createBox(shop, materials.window, 0, 2.4, 6.08, 3.6, 2.6, 0.16);
  createBox(shop, materials.window, 4.4, 2.4, 6.08, 3.6, 2.6, 0.16);
  createBox(shop, awningMaterial, 0, 4.15, 5.65, 14.5, 0.28, 1.1, { rz: -0.12 });
  createBox(shop, materials.door, 0, 1.45, 6.15, 1.6, 2.9, 0.16);
  createBox(shop, retroSigns.shop, 0, 5.45, 6.1, 9, 0.9, 0.18);
  addCornerTrim(shop, retroWallDark, 0, 3.1, 0, 16.1, 6.2, 12.1, 0.14);
  createPatch(shop, materials.sidewalk, 0, 9.2, 18, 5.2, 0.03);
  createBusStop(shop, -8, 8.6, 0);
  createBench(shop, 6.3, 8.4, Math.PI);

  addCollider(chunk, x, 0, z, 15.1, 6.9, 11.1);
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
  let progress = 0;
  const speed = 7 + rand() * 5;
  const car = createCar(chunk.group, path[segment].x, path[segment].z, 0, rand, { driver: true });

  chunk.actors.push({
    kind: "traffic",
    update(delta) {
      const from = path[segment];
      const to = path[(segment + 1) % path.length];
      const distance = from.distanceTo(to);

      progress += (speed * delta) / distance;

      while (progress >= 1) {
        progress -= 1;
        segment = (segment + 1) % path.length;
      }

      car.position.lerpVectors(from, to, progress);
      car.position.y = 0;
      car.rotation.y = Math.atan2(to.z - from.z, to.x - from.x);
    },
  });
}

function createCityTrafficVehicle(chunk, rand) {
  const lane = roadHalfWidth / 2 + 0.25;
  const path = [
    new THREE.Vector3(-halfChunk + lane, 0, -halfChunk + lane),
    new THREE.Vector3(halfChunk - lane, 0, -halfChunk + lane),
    new THREE.Vector3(halfChunk - lane, 0, halfChunk - lane),
    new THREE.Vector3(-halfChunk + lane, 0, halfChunk - lane),
  ];

  let segment = Math.floor(rand() * path.length);
  let progress = rand();
  const speed = 8 + rand() * 7;
  let vehicle;
  const roll = rand();
  if (roll < 0.16) {
    vehicle = createCityBus(chunk.group, path[segment].x, path[segment].z, 0, rand, { driver: true });
  } else if (roll < 0.34) {
    vehicle = createCityTruck(chunk.group, path[segment].x, path[segment].z, 0, rand, { driver: true });
  } else if (roll < 0.42) {
    vehicle = createLimo(chunk.group, path[segment].x, path[segment].z, 0, rand, { driver: true });
  } else {
    vehicle = createCar(chunk.group, path[segment].x, path[segment].z, 0, rand, { driver: true });
  }

  chunk.actors.push({
    kind: "city-traffic",
    update(delta) {
      const from = path[segment];
      const to = path[(segment + 1) % path.length];
      const distance = from.distanceTo(to);
      progress += (speed * delta) / distance;

      while (progress >= 1) {
        progress -= 1;
        segment = (segment + 1) % path.length;
      }

      vehicle.position.lerpVectors(from, to, progress);
      vehicle.position.y = 0;
      vehicle.rotation.y = Math.atan2(to.z - from.z, to.x - from.x);
    },
  });
}

function createTree(chunk, rand, x, z, scale = 1) {
  const worldX = chunk.cx * chunkSize + x;
  const worldZ = chunk.cz * chunkSize + z;
  if (isNearCaveEntranceWorld(worldX, worldZ, 7.5)) {
    return;
  }

  const foliage = pick(rand, [materials.foliageA, materials.foliageB, materials.foliageC]);
  const trunkHeight = (4.5 + rand() * 2.6) * scale;
  const trunkRadius = (0.35 + rand() * 0.08) * scale;
  const canopyRadius = (2.5 + rand() * 0.9) * scale;

  createCylinder(chunk.group, materials.bark, x, trunkHeight / 2, z, trunkRadius, trunkHeight);
  createSphere(chunk.group, foliage, x, trunkHeight + canopyRadius * 0.3, z, canopyRadius);
  createSphere(chunk.group, foliage, x - canopyRadius * 0.34, trunkHeight + canopyRadius * 0.1, z + 0.5, canopyRadius * 0.72);
  createSphere(chunk.group, foliage, x + canopyRadius * 0.28, trunkHeight + canopyRadius * 0.12, z - 0.35, canopyRadius * 0.68);

  // Use a trunk-first collision shape so nearby trees still leave believable fly-through gaps.
  const treeColliderWidth = Math.max(trunkRadius * 2.05, canopyRadius * 0.26);
  const treeColliderHeight = trunkHeight + canopyRadius * 0.1;
  addCollider(chunk, x, 0, z, treeColliderWidth, treeColliderHeight, treeColliderWidth);
  chunk.treeAnchors.push(new THREE.Vector3(x, trunkHeight * 0.18 + 1.2, z));
}

function createHedge(parent, x, z, width, depth) {
  createBox(parent, materials.hedge, x, 0.45, z, width, 0.9, depth, { cast: false });
}

function createPlayground(parent, x, z) {
  const play = new THREE.Group();
  play.position.set(x, 0, z);
  parent.add(play);

  createPatch(play, materials.path, 0, 0, 12, 10, 0.03);

  createCylinder(play, materials.playSet, -3.2, 1.7, -1.3, 0.12, 3.4);
  createCylinder(play, materials.playSet, -1.8, 1.7, -1.3, 0.12, 3.4);
  createCylinder(play, materials.playSet, -3.2, 1.7, 1.3, 0.12, 3.4);
  createCylinder(play, materials.playSet, -1.8, 1.7, 1.3, 0.12, 3.4);
  createBox(play, materials.playAccent, -2.5, 3.22, 0, 2.1, 0.14, 2.8);
  createCylinder(play, materials.trim, -2.15, 2.1, -0.8, 0.03, 1.8);
  createCylinder(play, materials.trim, -2.85, 2.1, -0.8, 0.03, 1.8);
  createCylinder(play, materials.trim, -2.15, 2.1, 0.8, 0.03, 1.8);
  createCylinder(play, materials.trim, -2.85, 2.1, 0.8, 0.03, 1.8);
  createBox(play, materials.playAccent, -2.15, 1.05, -0.8, 0.48, 0.06, 0.42);
  createBox(play, materials.playAccent, -2.85, 1.05, 0.8, 0.48, 0.06, 0.42);

  createBox(play, materials.playSet, 2.3, 1.6, -0.9, 0.16, 3.2, 0.16, { rz: 0.3 });
  createBox(play, materials.playSet, 4.6, 1.6, -0.9, 0.16, 3.2, 0.16, { rz: -0.3 });
  createBox(play, materials.playAccent, 3.45, 3.15, -0.9, 2.5, 0.16, 0.16);
  createBox(play, materials.playAccent, 3.6, 1.9, -0.9, 2.8, 0.12, 1.2, { rz: -0.7 });
}

function createPond(parent, x, z, width, depth) {
  const pond = new THREE.Mesh(geometries.cylinder, materials.water);
  pond.position.set(x, 0.12, z);
  pond.scale.set(width, 0.2, depth);
  pond.castShadow = false;
  pond.receiveShadow = true;
  parent.add(pond);

  const shore = new THREE.Mesh(geometries.cylinder, materials.path);
  shore.position.set(x, 0.03, z);
  shore.scale.set(width * 1.18, 0.04, depth * 1.18);
  shore.castShadow = false;
  shore.receiveShadow = true;
  parent.add(shore);
}

function createHouse(chunk, rand, x, z) {
  const group = chunk.group;
  const wallMaterial = pick(rand, houseWalls);
  const roofMaterial = pick(rand, roofMaterials);
  const width = 10 + rand() * 6;
  const depth = 9 + rand() * 5;
  const height = 6 + rand() * 5;
  const roofHeight = 2.8 + rand() * 2.2;
  const frontDirection = Math.abs(z) > Math.abs(x) ? (z > 0 ? "north" : "south") : (x > 0 ? "east" : "west");

  createRetroBox(group, { wall: wallMaterial, roof: roofMaterial, front: wallMaterial, back: wallMaterial }, x, height / 2, z, width, height, depth);
  createCone(group, roofMaterial, x, height + roofHeight / 2, z, width * 0.82, roofHeight, depth * 0.82, {
    ry: Math.PI / 4,
  });
  addCornerTrim(group, retroWallDark, x, height / 2, z, width + 0.1, height, depth + 0.1, 0.12);

  if (rand() > 0.55) {
    createBox(group, materials.bark, x + width * 0.18, height + roofHeight * 0.62, z - depth * 0.18, 0.9, 2.4, 0.9);
  } else if (rand() > 0.45) {
    createBox(group, retroRoofVentMaterial, x - width * 0.18, height + roofHeight * 0.85, z + depth * 0.12, 1.1, 0.55, 0.9, { cast: false });
  }

  const windowY = height * 0.64;
  const doorHeight = 2.2;

  if (frontDirection === "south") {
    createBox(group, materials.door, x, doorHeight / 2, z - depth / 2 - 0.08, 1.55, doorHeight, 0.18);
    createBox(group, materials.window, x - width * 0.22, windowY, z - depth / 2 - 0.06, 1.6, 1.1, 0.14);
    createBox(group, materials.window, x + width * 0.22, windowY, z - depth / 2 - 0.06, 1.6, 1.1, 0.14);
    createPatch(group, materials.path, x, z - depth / 2 - 6, 2.5, 12, 0.03);
    createMailbox(group, x + 1.7, -walkEdge + 1.5, 0);
  } else if (frontDirection === "north") {
    createBox(group, materials.door, x, doorHeight / 2, z + depth / 2 + 0.08, 1.55, doorHeight, 0.18);
    createBox(group, materials.window, x - width * 0.22, windowY, z + depth / 2 + 0.06, 1.6, 1.1, 0.14);
    createBox(group, materials.window, x + width * 0.22, windowY, z + depth / 2 + 0.06, 1.6, 1.1, 0.14);
    createPatch(group, materials.path, x, z + depth / 2 + 6, 2.5, 12, 0.03);
    createMailbox(group, x - 1.8, walkEdge - 1.5, Math.PI);
  } else if (frontDirection === "east") {
    createBox(group, materials.door, x + width / 2 + 0.08, doorHeight / 2, z, 0.18, doorHeight, 1.55);
    createBox(group, materials.window, x + width / 2 + 0.06, windowY, z - depth * 0.22, 0.14, 1.1, 1.6);
    createBox(group, materials.window, x + width / 2 + 0.06, windowY, z + depth * 0.22, 0.14, 1.1, 1.6);
    createPatch(group, materials.path, x + width / 2 + 6, z, 12, 2.5, 0.03);
    createMailbox(group, walkEdge - 1.5, z + 1.3, -Math.PI / 2);
  } else {
    createBox(group, materials.door, x - width / 2 - 0.08, doorHeight / 2, z, 0.18, doorHeight, 1.55);
    createBox(group, materials.window, x - width / 2 - 0.06, windowY, z - depth * 0.22, 0.14, 1.1, 1.6);
    createBox(group, materials.window, x - width / 2 - 0.06, windowY, z + depth * 0.22, 0.14, 1.1, 1.6);
    createPatch(group, materials.path, x - width / 2 - 6, z, 12, 2.5, 0.03);
    createMailbox(group, -walkEdge + 1.5, z - 1.4, Math.PI / 2);
  }

  if (rand() > 0.45) {
    createFenceRect(group, x, z, width + 6, depth + 6);
  }

  createFlowerPatch(group, x + (rand() - 0.5) * 5, z + (rand() - 0.5) * 5, 2.6, 6 + Math.floor(rand() * 4), rand);
  addCollider(chunk, x, 0, z, Math.max(6.5, width - 0.9), height + roofHeight + 0.2, Math.max(6, depth - 0.9));

  for (let index = 0; index < 1 + Math.floor(rand() * 2); index += 1) {
    const tx = x + (rand() > 0.5 ? 1 : -1) * (width * 0.55 + 2 + rand() * 3);
    const tz = z + (rand() > 0.5 ? 1 : -1) * (depth * 0.55 + 2 + rand() * 3);
    if (Math.abs(tx) < halfChunk - 4 && Math.abs(tz) < halfChunk - 4) {
      createTree(chunk, rand, tx, tz, 0.75 + rand() * 0.45);
    }
  }
}

function createWalker(chunk, rand, options = {}) {
  const group = new THREE.Group();
  chunk.group.add(group);

  const skin = pick(rand, skinMaterials);
  const variant = options.variant || (rand() > 0.45 ? "casual" : "suit");
  const shirt = variant === "suit" ? materials.trim : pick(rand, shirtMaterials);
  const jacket = variant === "suit" ? pick(rand, suitMaterials) : shirt;
  const pants = variant === "suit" ? pick(rand, suitMaterials) : pick(rand, pantsMaterials);

  createBox(group, jacket, 0, 1.65, 0, 0.92, 1.45, 0.52);
  createSphere(group, skin, 0, 2.68, 0, 0.34);
  const leftLeg = createBox(group, pants, -0.18, 0.72, 0, 0.22, 1.25, 0.22);
  const rightLeg = createBox(group, pants, 0.18, 0.72, 0, 0.22, 1.25, 0.22);
  createBox(group, skin, -0.6, 1.65, 0, 0.16, 1.02, 0.16);
  createBox(group, skin, 0.6, 1.65, 0, 0.16, 1.02, 0.16);
  if (variant === "suit") {
    createBox(group, materials.trim, 0, 1.82, 0.27, 0.34, 0.78, 0.08, { cast: false });
    createBox(group, pick(rand, cityAccentMaterials), 0, 1.62, 0.31, 0.12, 0.9, 0.06, { cast: false });
  } else if (rand() > 0.58) {
    createBox(group, pick(rand, shirtMaterials), 0, 1.95, -0.08, 0.98, 0.42, 0.58, { cast: false, rz: -0.04 });
  }

  const edge = options.edge ?? walkEdge;
  const innerEdge = options.innerEdge ?? walkEdge;
  const path = [
    new THREE.Vector3(-innerEdge, 0, -edge),
    new THREE.Vector3(innerEdge, 0, -edge),
    new THREE.Vector3(innerEdge, 0, edge),
    new THREE.Vector3(-innerEdge, 0, edge),
  ];

  let segment = Math.floor(rand() * path.length);
  let progress = rand();
  const speed = (options.speedMin ?? 2.1) + rand() * (options.speedRange ?? 1.3);
  const phase = rand() * Math.PI * 2;

  chunk.actors.push({
    kind: "walker",
    update(delta, time) {
      const from = path[segment];
      const to = path[(segment + 1) % path.length];
      const distance = from.distanceTo(to);

      progress += (speed * delta) / distance;

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

function chooseForestGroundSpot(chunk, rand, minTreeDistance = 3) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const x = (rand() - 0.5) * 54;
    const z = (rand() - 0.5) * 54;
    const clearOfTrees = chunk.treeAnchors.every((anchor) => {
      const dx = anchor.x - x;
      const dz = anchor.z - z;
      return dx * dx + dz * dz > minTreeDistance * minTreeDistance;
    });

    if (clearOfTrees) {
      return new THREE.Vector3(x, 0, z);
    }
  }

  return new THREE.Vector3((rand() - 0.5) * 44, 0, (rand() - 0.5) * 44);
}

function chooseForestTreeAnchor(chunk, rand) {
  if (chunk.treeAnchors.length > 0) {
    return pick(rand, chunk.treeAnchors).clone();
  }

  return new THREE.Vector3((rand() - 0.5) * 24, 8 + rand() * 8, (rand() - 0.5) * 24);
}

function createAnimalLeg(parent, material, x, y, z, radius, height) {
  return createCylinder(parent, material, x, y, z, radius, height, { cast: false, receive: false });
}

function updateAnimalRoamCenter(actor, center, delta, returnRate = 0.22, alertRate = 0.85) {
  if (actor.homeCenter) {
    center.lerp(actor.homeCenter, Math.min(1, delta * returnRate));
  }
}

function updateAnimalAwareness(actor, delta, eyeObject, options = {}) {
  if (!network.joined || !isPlayerInForest() || performance.now() < forestState.deathUntil) {
    return;
  }

  const now = performance.now();
  if ((actor.nextSenseAt || 0) > now) {
    return;
  }
  actor.nextSenseAt = now + (options.checkIntervalMs ?? 320);
  const eyePosition = eyeObject.getWorldPosition(tempWorldPositionA);
  const toPlayer = tempPlayerDelta.copy(flyer.position).sub(eyePosition);
  const distance = toPlayer.length();

  if (distance < 0.001 || distance > (options.senseDistance ?? 22)) {
    return;
  }

  if (Math.abs(flyer.position.y - eyePosition.y) > (options.verticalRange ?? 16)) {
    return;
  }

  toPlayer.normalize();
  const facing = getForwardVector(options.lookSource || eyeObject, tempWorldPositionB);
  const lookThreshold = options.lookThreshold ?? 0.82;

  if (facing.dot(toPlayer) < lookThreshold || actor.nextAlertAt > now) {
    return;
  }

  actor.nextAlertAt = now + (options.cooldownMs ?? 6500);
  actor.alertUntil = now + (options.roamDurationMs ?? 9000);
  if (!actor.alertFocus) {
    actor.alertFocus = new THREE.Vector3();
  }
  actor.alertFocus.set(flyer.position.x, actor.homeCenter?.y ?? 0, flyer.position.z);

  queueForestAlert(eyePosition);
  playAnimalGrowl(eyePosition, options.growlIntensity ?? 0.08);
}

function createGroundAnimalMotion(chunk, rand, kind, root, rig, options = {}) {
  const center = chooseForestGroundSpot(chunk, rand, options.treeClearance ?? 3);
  const radiusX = options.radiusX ?? 1.4 + rand() * 1.8;
  const radiusZ = options.radiusZ ?? 1 + rand() * 1.5;
  const speed = (options.speed ?? 0.14 + rand() * 0.08) * (options.speedMultiplier ?? 1.85);
  const phase = rand() * Math.PI * 2;
  const bobPhase = rand() * Math.PI * 2;

  root.position.set(center.x, options.baseY ?? 0, center.z);

  const actor = {
    kind,
    homeCenter: center.clone(),
    alertFocus: center.clone(),
    alertUntil: 0,
    nextAlertAt: 0,
    update(delta, time) {
      updateAnimalRoamCenter(actor, center, delta);

      const travel = time * speed + phase;
      const x = center.x + Math.cos(travel) * radiusX;
      const z = center.z + Math.sin(travel * 0.84 + phase * 0.5) * radiusZ;
      const nextTravel = travel + 0.22;
      const nextX = center.x + Math.cos(nextTravel) * radiusX;
      const nextZ = center.z + Math.sin(nextTravel * 0.84 + phase * 0.5) * radiusZ;
      const headingX = nextX - x;
      const headingZ = nextZ - z;
      const bodyLift = Math.sin(time * (options.bodyBobRate ?? 4.2) + bobPhase) * (options.bodyLift ?? 0.035);

      root.position.set(x, (options.baseY ?? 0) + Math.abs(bodyLift), z);
      root.rotation.y = Math.atan2(headingX, headingZ);

      rig.position.y = bodyLift * 0.45;
      rig.rotation.z = Math.sin(time * (options.rollRate ?? 2.8) + phase) * (options.bodyRoll ?? 0.04);

      const stride = Math.sin(time * (options.strideRate ?? 5.8) + phase) * (options.stride ?? 0.3);
      for (const leg of options.frontLegs || []) {
        leg.rotation.x = stride;
      }
      for (const leg of options.backLegs || []) {
        leg.rotation.x = -stride;
      }
      for (const leg of options.crossFrontLegs || []) {
        leg.rotation.x = -stride;
      }
      for (const leg of options.crossBackLegs || []) {
        leg.rotation.x = stride;
      }

      if (options.head) {
        options.head.rotation.x = Math.sin(time * (options.headRate ?? 2.4) + phase) * (options.headPitch ?? 0.08);
        options.head.rotation.y = Math.sin(time * (options.headRate ?? 1.9) + phase * 0.6) * (options.headYaw ?? 0.08);
      }

      if (options.neck) {
        options.neck.rotation.x = Math.sin(time * (options.neckRate ?? 2.2) + phase + 0.4) * (options.neckPitch ?? 0.06);
      }

      if (options.tail) {
        options.tail.rotation.x = (options.tailBasePitch ?? 0) + Math.sin(time * (options.tailRate ?? 3.6) + phase) * (options.tailSwing ?? 0.18);
        options.tail.rotation.y = Math.cos(time * (options.tailRate ?? 3.2) + phase * 0.8) * (options.tailYaw ?? 0.08);
      }

      if (options.extra) {
        options.extra(time, stride, bodyLift);
      }

      if (options.aware !== false) {
        updateAnimalAwareness(actor, delta, options.eyeObject || options.head || rig, {
          senseDistance: options.senseDistance,
          verticalRange: options.verticalRange,
          lookThreshold: options.lookThreshold,
          cooldownMs: options.alertCooldownMs,
          roamDurationMs: options.roamDurationMs,
          growlIntensity: options.growlIntensity,
          lookSource: options.head || rig,
        });
      }
    },
  };

  chunk.actors.push(actor);
  return actor;
}

function createBear(chunk, rand) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  chunk.group.add(root);

  createBox(rig, materials.animalBrown, 0, 0.98, 0, 1.12, 0.82, 1.9, { cast: false, receive: false });
  createSphere(rig, materials.animalDarkBrown, 0, 1.16, -0.15, 0.4, { cast: false, receive: false });
  createSphere(rig, materials.animalBrown, 0, 0.98, -0.72, 0.42, { cast: false, receive: false });

  const head = new THREE.Group();
  head.position.set(0, 1.05, 0.95);
  rig.add(head);
  createSphere(head, materials.animalBrown, 0, 0, 0, 0.38, { cast: false, receive: false });
  createSphere(head, materials.animalDarkBrown, 0, -0.03, 0.24, 0.17, { cast: false, receive: false });
  createSphere(head, materials.animalDarkBrown, -0.18, 0.2, -0.04, 0.08, { cast: false, receive: false });
  createSphere(head, materials.animalDarkBrown, 0.18, 0.2, -0.04, 0.08, { cast: false, receive: false });
  createSphere(head, materials.animalBlack, 0, 0.01, 0.38, 0.04, { cast: false, receive: false });
  addGlowingEyes(head, -0.14, 0.08, 0.3, 0.28, 0.03);

  const tail = new THREE.Group();
  tail.position.set(0, 0.96, -1.05);
  rig.add(tail);
  createSphere(tail, materials.animalDarkBrown, 0, 0, -0.08, 0.08, { cast: false, receive: false });

  const frontLeft = createAnimalLeg(rig, materials.animalDarkBrown, -0.34, 0.43, 0.58, 0.12, 0.86);
  const frontRight = createAnimalLeg(rig, materials.animalDarkBrown, 0.34, 0.43, 0.58, 0.12, 0.86);
  const backLeft = createAnimalLeg(rig, materials.animalDarkBrown, -0.34, 0.43, -0.56, 0.13, 0.86);
  const backRight = createAnimalLeg(rig, materials.animalDarkBrown, 0.34, 0.43, -0.56, 0.13, 0.86);

  createGroundAnimalMotion(chunk, rand, "bear", root, rig, {
    radiusX: 1.4 + rand() * 1.3,
    radiusZ: 1.1 + rand() * 1.2,
    speed: 0.09 + rand() * 0.05,
    bodyLift: 0.03,
    stride: 0.22,
    bodyRoll: 0.03,
    frontLegs: [frontLeft],
    crossFrontLegs: [frontRight],
    backLegs: [backRight],
    crossBackLegs: [backLeft],
    head,
    headPitch: 0.06,
    headYaw: 0.05,
    tail,
    tailSwing: 0.06,
    tailYaw: 0.04,
    senseDistance: 24,
    lookThreshold: 0.8,
    growlIntensity: 0.08,
    treeClearance: 3.8,
  });
}

function createWolf(chunk, rand) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  chunk.group.add(root);

  createBox(rig, materials.animalGray, 0, 0.78, 0, 0.66, 0.56, 1.62, { cast: false, receive: false });
  createSphere(rig, materials.animalDarkGray, 0, 0.92, -0.18, 0.24, { cast: false, receive: false });

  const neck = new THREE.Group();
  neck.position.set(0, 0.88, 0.6);
  rig.add(neck);
  createCylinder(neck, materials.animalGray, 0, 0.02, 0.1, 0.11, 0.4, { rx: Math.PI / 2.8, cast: false, receive: false });

  const head = new THREE.Group();
  head.position.set(0, 0.08, 0.28);
  neck.add(head);
  createSphere(head, materials.animalGray, 0, 0, 0, 0.24, { cast: false, receive: false });
  createBox(head, materials.animalCream, 0, -0.02, 0.2, 0.18, 0.12, 0.28, { cast: false, receive: false });
  createBox(head, materials.animalDarkGray, -0.11, 0.18, -0.02, 0.08, 0.18, 0.05, { rz: -0.2, cast: false, receive: false });
  createBox(head, materials.animalDarkGray, 0.11, 0.18, -0.02, 0.08, 0.18, 0.05, { rz: 0.2, cast: false, receive: false });
  createSphere(head, materials.animalBlack, 0, -0.01, 0.36, 0.03, { cast: false, receive: false });
  addGlowingEyes(head, -0.08, 0.04, 0.23, 0.16, 0.024);

  const tail = new THREE.Group();
  tail.position.set(0, 0.88, -0.8);
  rig.add(tail);
  createBox(tail, materials.animalDarkGray, 0, 0.03, -0.26, 0.1, 0.1, 0.55, { rx: -0.45, cast: false, receive: false });

  const frontLeft = createAnimalLeg(rig, materials.animalDarkGray, -0.2, 0.34, 0.48, 0.07, 0.68);
  const frontRight = createAnimalLeg(rig, materials.animalDarkGray, 0.2, 0.34, 0.48, 0.07, 0.68);
  const backLeft = createAnimalLeg(rig, materials.animalDarkGray, -0.2, 0.34, -0.48, 0.07, 0.68);
  const backRight = createAnimalLeg(rig, materials.animalDarkGray, 0.2, 0.34, -0.48, 0.07, 0.68);

  createGroundAnimalMotion(chunk, rand, "wolf", root, rig, {
    radiusX: 1.8 + rand() * 1.8,
    radiusZ: 1.2 + rand() * 1.4,
    speed: 0.15 + rand() * 0.06,
    bodyLift: 0.028,
    stride: 0.4,
    bodyRoll: 0.05,
    frontLegs: [frontLeft],
    crossFrontLegs: [frontRight],
    backLegs: [backRight],
    crossBackLegs: [backLeft],
    head,
    neck,
    headPitch: 0.08,
    headYaw: 0.1,
    neckPitch: 0.05,
    tail,
    tailBasePitch: -0.34,
    tailSwing: 0.16,
    tailYaw: 0.12,
    senseDistance: 28,
    lookThreshold: 0.8,
    growlIntensity: 0.1,
    treeClearance: 3.2,
  });
}

function createFox(chunk, rand) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  chunk.group.add(root);

  createBox(rig, materials.animalRed, 0, 0.62, 0, 0.54, 0.46, 1.2, { cast: false, receive: false });
  createSphere(rig, materials.animalCream, 0, 0.56, 0.18, 0.18, { cast: false, receive: false });

  const neck = new THREE.Group();
  neck.position.set(0, 0.7, 0.44);
  rig.add(neck);
  createCylinder(neck, materials.animalCream, 0, 0.01, 0.08, 0.08, 0.26, { rx: Math.PI / 2.7, cast: false, receive: false });

  const head = new THREE.Group();
  head.position.set(0, 0.05, 0.2);
  neck.add(head);
  createSphere(head, materials.animalRed, 0, 0.02, 0, 0.2, { cast: false, receive: false });
  createBox(head, materials.animalCream, 0, -0.03, 0.18, 0.14, 0.1, 0.24, { cast: false, receive: false });
  createBox(head, materials.animalBlack, -0.09, 0.15, -0.02, 0.07, 0.18, 0.04, { rz: -0.24, cast: false, receive: false });
  createBox(head, materials.animalBlack, 0.09, 0.15, -0.02, 0.07, 0.18, 0.04, { rz: 0.24, cast: false, receive: false });
  createSphere(head, materials.animalBlack, 0, -0.01, 0.28, 0.025, { cast: false, receive: false });
  addGlowingEyes(head, -0.075, 0.05, 0.19, 0.15, 0.022);

  const tail = new THREE.Group();
  tail.position.set(0, 0.72, -0.6);
  rig.add(tail);
  createBox(tail, materials.animalRed, 0, 0.08, -0.42, 0.2, 0.2, 0.82, { rx: -0.78, cast: false, receive: false });
  createBox(tail, materials.animalCream, 0, 0.08, -0.76, 0.18, 0.18, 0.2, { cast: false, receive: false });

  const frontLeft = createAnimalLeg(rig, materials.animalDarkBrown, -0.17, 0.26, 0.34, 0.05, 0.52);
  const frontRight = createAnimalLeg(rig, materials.animalDarkBrown, 0.17, 0.26, 0.34, 0.05, 0.52);
  const backLeft = createAnimalLeg(rig, materials.animalDarkBrown, -0.17, 0.26, -0.34, 0.05, 0.52);
  const backRight = createAnimalLeg(rig, materials.animalDarkBrown, 0.17, 0.26, -0.34, 0.05, 0.52);

  createGroundAnimalMotion(chunk, rand, "fox", root, rig, {
    radiusX: 1.5 + rand() * 1.5,
    radiusZ: 1 + rand() * 1.2,
    speed: 0.18 + rand() * 0.08,
    bodyLift: 0.032,
    stride: 0.48,
    bodyRoll: 0.055,
    frontLegs: [frontLeft],
    crossFrontLegs: [frontRight],
    backLegs: [backRight],
    crossBackLegs: [backLeft],
    head,
    neck,
    headPitch: 0.1,
    headYaw: 0.11,
    neckPitch: 0.07,
    tail,
    tailBasePitch: -0.56,
    tailSwing: 0.22,
    tailYaw: 0.16,
    senseDistance: 23,
    lookThreshold: 0.81,
    growlIntensity: 0.07,
    treeClearance: 2.8,
  });
}

function createWorm(chunk, rand) {
  const root = new THREE.Group();
  chunk.group.add(root);

  const segments = [];
  for (let index = 0; index < 6; index += 1) {
    const segment = createSphere(root, index === 0 ? materials.animalTan : materials.animalBrown, 0, 0.06, index * -0.16, 0.09 - index * 0.008, {
      cast: false,
      receive: false,
    });
    segments.push(segment);
  }
  addGlowingEyes(root, -0.025, 0.1, 0.05, 0.05, 0.012);

  const center = chooseForestGroundSpot(chunk, rand, 1.5);
  const phase = rand() * Math.PI * 2;
  const drift = rand() * Math.PI * 2;
  const speed = 0.42 + rand() * 0.24;

  const actor = {
    kind: "worm",
    homeCenter: center.clone(),
    alertFocus: center.clone(),
    alertUntil: 0,
    nextAlertAt: 0,
    update(delta, time) {
      updateAnimalRoamCenter(actor, center, delta, 0.18, 0.7);
      const x = center.x + Math.cos(time * speed + drift) * 0.5;
      const z = center.z + Math.sin(time * speed * 0.82 + drift) * 0.4;
      const nextX = center.x + Math.cos(time * speed + drift + 0.12) * 0.5;
      const nextZ = center.z + Math.sin((time * speed + drift + 0.12) * 0.82) * 0.4;
      root.position.set(
        x,
        0.01,
        z
      );
      root.rotation.y = Math.atan2(nextX - x, nextZ - z);

      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        segment.position.x = Math.sin(time * 7.2 - index * 0.5 + phase) * 0.1;
        segment.position.y = 0.05 + Math.abs(Math.sin(time * 5.2 - index * 0.35 + phase)) * 0.03;
      }

      updateAnimalAwareness(actor, delta, root, {
        senseDistance: 9,
        verticalRange: 8,
        lookThreshold: 0.76,
        cooldownMs: 8000,
        roamDurationMs: 6500,
        growlIntensity: 0.04,
        lookSource: root,
      });
    },
  };

  chunk.actors.push(actor);
}

function addGlobalCollider(minX, minY, minZ, maxX, maxY, maxZ, includeVisibility = true) {
  const box = new THREE.Box3(
    new THREE.Vector3(minX, minY, minZ),
    new THREE.Vector3(maxX, maxY, maxZ)
  );
  caveState.colliders.push(box);
  if (includeVisibility) {
    caveState.visibilityBlockers.push(box.clone());
  }
  return box;
}

function getRouteDistanceInfo(route, position) {
  let bestDistanceSq = Infinity;
  let bestProgress = 0;
  let traversed = 0;

  for (let index = 0; index < route.points.length - 1; index += 1) {
    const start = route.points[index];
    const end = route.points[index + 1];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq < 0.0001) {
      continue;
    }

    const t = THREE.MathUtils.clamp(
      ((position.x - start.x) * dx + (position.z - start.z) * dz) / lengthSq,
      0,
      1
    );
    const sampleX = start.x + dx * t;
    const sampleZ = start.z + dz * t;
    const distanceSq = (position.x - sampleX) ** 2 + (position.z - sampleZ) ** 2;
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestProgress = traversed + Math.sqrt(lengthSq) * t;
    }

    traversed += Math.sqrt(lengthSq);
  }

  return { progress: bestProgress, distanceSq: bestDistanceSq };
}

function sampleRoutePosition(route, progress, target = new THREE.Vector3()) {
  const clamped = THREE.MathUtils.clamp(progress, 0, route.length);
  let traversed = 0;

  for (let index = 0; index < route.points.length - 1; index += 1) {
    const start = route.points[index];
    const end = route.points[index + 1];
    const segmentLength = route.segmentLengths[index];
    if (clamped <= traversed + segmentLength || index === route.points.length - 2) {
      const t = segmentLength > 0.0001 ? (clamped - traversed) / segmentLength : 0;
      target.set(
        THREE.MathUtils.lerp(start.x, end.x, t),
        THREE.MathUtils.lerp(start.y, end.y, t),
        THREE.MathUtils.lerp(start.z, end.z, t)
      );
      return target;
    }
    traversed += segmentLength;
  }

  return target.copy(route.points[route.points.length - 1]);
}

function sampleRouteDirection(route, progress, target = new THREE.Vector3()) {
  const clamped = THREE.MathUtils.clamp(progress, 0, Math.max(route.length - 0.05, 0));
  const from = sampleRoutePosition(route, clamped, new THREE.Vector3());
  const to = sampleRoutePosition(route, Math.min(route.length, clamped + 0.08), new THREE.Vector3());
  return target.copy(to).sub(from).normalize();
}

function createTunnelRoute(keys) {
  const points = keys.map((key) => {
    const point = caveLayout.tunnelKeys[key];
    return new THREE.Vector3(point.x, caveLayout.tunnelY, point.z);
  });
  const segmentLengths = [];
  let length = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const segmentLength = points[index].distanceTo(points[index + 1]);
    segmentLengths.push(segmentLength);
    length += segmentLength;
  }
  return { keys, points, segmentLengths, length };
}

function createCaveTapeRing(parent, centerX, centerZ, radius, coneCount = 10) {
  const posts = [];
  for (let index = 0; index < coneCount; index += 1) {
    const angle = (index / coneCount) * Math.PI * 2;
    const px = centerX + Math.cos(angle) * radius;
    const pz = centerZ + Math.sin(angle) * radius;
    const post = new THREE.Group();
    post.position.set(px, 0, pz);
    post.rotation.y = -angle;
    parent.add(post);
    createCylinder(post, materials.benchMetal, 0, 0.72, 0, 0.08, 1.44, { cast: false, receive: false });
    createCone(post, materials.coneOrange, 0, 0.35, 0, 0.42, 0.7, 0.42, { round: true, cast: false, receive: false });
    posts.push(new THREE.Vector3(px, 1.12, pz));
  }

  for (let index = 0; index < posts.length; index += 1) {
    const start = posts[index];
    const end = posts[(index + 1) % posts.length];
    const midX = (start.x + end.x) * 0.5;
    const midZ = (start.z + end.z) * 0.5;
    const distance = Math.hypot(end.x - start.x, end.z - start.z);
    createBox(parent, materials.cautionTape, midX, 1.16, midZ, distance, 0.06, 0.1, {
      ry: Math.atan2(end.x - start.x, end.z - start.z),
      cast: false,
      receive: false,
    });
    createBox(parent, materials.cautionStripe, midX, 1.16, midZ, distance, 0.02, 0.035, {
      ry: Math.atan2(end.x - start.x, end.z - start.z),
      cast: false,
      receive: false,
    });
  }
}

function createSinkholeShaftVisual(parent) {
  const entry = getGroundEntranceVisualConfig();
  createCylinder(parent, materials.caveRock, entry.x, 0.09, entry.z, entry.rimRadius, 0.18, {
    cast: false,
    receive: true,
  });
  createCylinder(parent, materials.caveDust, entry.x, 0.12, entry.z, entry.rimRadius - 0.18, 0.06, {
    cast: false,
    receive: true,
  });
  createCylinder(parent, materials.caveRockDark, entry.x, -0.18, entry.z, entry.lipRadius, 0.34, {
    cast: false,
    receive: false,
  });
  createCylinder(parent, materials.caveRockDark, entry.x, caveLayout.tunnelY * 0.5, entry.z, entry.shaftRadius, Math.abs(caveLayout.tunnelY) + 1.2, {
    cast: false,
    receive: false,
  });
}

function createCaveEntranceMarkers(parent) {
  const entry = getGroundEntranceVisualConfig();
  const portal = new THREE.Group();
  portal.position.set(entry.x, entry.y, entry.z);
  parent.add(portal);

  createCylinder(parent, materials.caveDust, entry.x, 0.03, entry.z, entry.clearRadius * 0.82, 0.04, {
    cast: false,
    receive: true,
  });
  createSphere(portal, materials.benchMetal, 0, 0, 0, entry.radius, {
    cast: true,
    receive: true,
  });
  createSphere(portal, materials.caveRockDark, 0, 0, 0, entry.radius * 0.58, {
    cast: false,
    receive: false,
  });

  caveState.portal = {
    group: portal,
    baseY: entry.y,
    radius: entry.triggerRadius,
    phase: 0.6,
    destination: {
      x: 176,
      y: caveLayout.tunnelY,
      z: caveLayout.tunnelKeys.A.z,
      yaw: -Math.PI * 0.5,
      pitch: 0,
      roll: 0,
    },
  };
}

function buildCaveShaft(centerX, centerZ, radius, topY = 0.5, bottomY = caveLayout.tunnelY + 1.1, opening = null) {
  const openingAngle = opening?.angle ?? 0;
  const shellRadius = radius + 0.92;
  const verticalRadius = Math.abs(caveLayout.tunnelY * 0.5 - 0.2 - bottomY) + 5.3;
  const centerY = caveLayout.tunnelY * 0.5 - 0.2;
  const ringCount = radius > 5 ? 9 : 6;
  const segmentCount = radius > 5 ? 20 : 14;
  const segmentThickness = 1.15;

  for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
    const y = THREE.MathUtils.lerp(bottomY - 2.6, topY - 1.2, ringIndex / (ringCount - 1));
    const relativeY = THREE.MathUtils.clamp((y - centerY) / verticalRadius, -1, 1);
    const ringRadius = shellRadius * Math.sqrt(Math.max(0.08, 1 - relativeY * relativeY));
    const panelWidth = (Math.PI * 2 * ringRadius / segmentCount) * 0.98;

    for (let index = 0; index < segmentCount; index += 1) {
      const angle = (index / segmentCount) * Math.PI * 2;
      const px = centerX + Math.cos(angle) * ringRadius;
      const pz = centerZ + Math.sin(angle) * ringRadius;
      const delta = Math.atan2(Math.sin(angle - openingAngle), Math.cos(angle - openingAngle));
      const opensHere = opening
        && y < opening.topY
        && Math.abs(delta) < Math.max(0.22, (opening.width / Math.max(ringRadius, 0.1)) * 0.62);
      if (opensHere) {
        continue;
      }

      addGlobalCollider(
        px - panelWidth * 0.5,
        y - 1.45,
        pz - segmentThickness * 0.5,
        px + panelWidth * 0.5,
        y + 1.45,
        pz + segmentThickness * 0.5
      );
    }
  }

  addGlobalCollider(centerX - 5.8, bottomY - 2.6, centerZ - 5.8, centerX + 5.8, bottomY - 0.9, centerZ + 5.8);
}

function createTunnelSegmentGeometry(parent, startPoint, endPoint) {
  const wall = caveLayout.wallThickness;
  const halfWidth = caveLayout.tunnelInnerWidth * 0.5;
  const halfHeight = caveLayout.tunnelInnerHeight * 0.5;
  const dx = endPoint.x - startPoint.x;
  const dz = endPoint.z - startPoint.z;
  const axis = Math.abs(dx) >= Math.abs(dz) ? "x" : "z";
  const centerX = (startPoint.x + endPoint.x) * 0.5;
  const centerZ = (startPoint.z + endPoint.z) * 0.5;
  const length = axis === "x" ? Math.abs(dx) : Math.abs(dz);

  if (axis === "x") {
    createBox(parent, materials.caveRockDark, centerX, caveLayout.tunnelY - halfHeight - wall * 0.5, centerZ, length + wall * 2, wall, caveLayout.tunnelInnerWidth + wall * 3, {
      cast: false,
      receive: false,
    });
    createBox(parent, materials.caveRockDark, centerX, caveLayout.tunnelY + halfHeight + wall * 0.5, centerZ, length + wall * 2, wall, caveLayout.tunnelInnerWidth + wall * 3, {
      cast: false,
      receive: false,
    });
    createBox(parent, materials.caveRock, centerX, caveLayout.tunnelY, centerZ - halfWidth - wall * 0.5, length + wall * 2, caveLayout.tunnelInnerHeight + wall * 2, wall, {
      cast: false,
      receive: false,
    });
    createBox(parent, materials.caveRock, centerX, caveLayout.tunnelY, centerZ + halfWidth + wall * 0.5, length + wall * 2, caveLayout.tunnelInnerHeight + wall * 2, wall, {
      cast: false,
      receive: false,
    });
    addGlobalCollider(
      Math.min(startPoint.x, endPoint.x) - wall,
      caveLayout.tunnelY - halfHeight - wall,
      centerZ - halfWidth - wall * 1.5,
      Math.max(startPoint.x, endPoint.x) + wall,
      caveLayout.tunnelY - halfHeight,
      centerZ + halfWidth + wall * 1.5
    );
    addGlobalCollider(
      Math.min(startPoint.x, endPoint.x) - wall,
      caveLayout.tunnelY + halfHeight,
      centerZ - halfWidth - wall * 1.5,
      Math.max(startPoint.x, endPoint.x) + wall,
      caveLayout.tunnelY + halfHeight + wall,
      centerZ + halfWidth + wall * 1.5
    );
    addGlobalCollider(
      Math.min(startPoint.x, endPoint.x) - wall,
      caveLayout.tunnelY - halfHeight - wall,
      centerZ - halfWidth - wall,
      Math.max(startPoint.x, endPoint.x) + wall,
      caveLayout.tunnelY + halfHeight + wall,
      centerZ - halfWidth
    );
    addGlobalCollider(
      Math.min(startPoint.x, endPoint.x) - wall,
      caveLayout.tunnelY - halfHeight - wall,
      centerZ + halfWidth,
      Math.max(startPoint.x, endPoint.x) + wall,
      caveLayout.tunnelY + halfHeight + wall,
      centerZ + halfWidth + wall
    );
  } else {
    createBox(parent, materials.caveRockDark, centerX, caveLayout.tunnelY - halfHeight - wall * 0.5, centerZ, caveLayout.tunnelInnerWidth + wall * 3, wall, length + wall * 2, {
      cast: false,
      receive: false,
    });
    createBox(parent, materials.caveRockDark, centerX, caveLayout.tunnelY + halfHeight + wall * 0.5, centerZ, caveLayout.tunnelInnerWidth + wall * 3, wall, length + wall * 2, {
      cast: false,
      receive: false,
    });
    createBox(parent, materials.caveRock, centerX - halfWidth - wall * 0.5, caveLayout.tunnelY, centerZ, wall, caveLayout.tunnelInnerHeight + wall * 2, length + wall * 2, {
      cast: false,
      receive: false,
    });
    createBox(parent, materials.caveRock, centerX + halfWidth + wall * 0.5, caveLayout.tunnelY, centerZ, wall, caveLayout.tunnelInnerHeight + wall * 2, length + wall * 2, {
      cast: false,
      receive: false,
    });
    addGlobalCollider(
      centerX - halfWidth - wall * 1.5,
      caveLayout.tunnelY - halfHeight - wall,
      Math.min(startPoint.z, endPoint.z) - wall,
      centerX + halfWidth + wall * 1.5,
      caveLayout.tunnelY - halfHeight,
      Math.max(startPoint.z, endPoint.z) + wall
    );
    addGlobalCollider(
      centerX - halfWidth - wall * 1.5,
      caveLayout.tunnelY + halfHeight,
      Math.min(startPoint.z, endPoint.z) - wall,
      centerX + halfWidth + wall * 1.5,
      caveLayout.tunnelY + halfHeight + wall,
      Math.max(startPoint.z, endPoint.z) + wall
    );
    addGlobalCollider(
      centerX - halfWidth - wall,
      caveLayout.tunnelY - halfHeight - wall,
      Math.min(startPoint.z, endPoint.z) - wall,
      centerX - halfWidth,
      caveLayout.tunnelY + halfHeight + wall,
      Math.max(startPoint.z, endPoint.z) + wall
    );
    addGlobalCollider(
      centerX + halfWidth,
      caveLayout.tunnelY - halfHeight - wall,
      Math.min(startPoint.z, endPoint.z) - wall,
      centerX + halfWidth + wall,
      caveLayout.tunnelY + halfHeight + wall,
      Math.max(startPoint.z, endPoint.z) + wall
    );
  }

  caveState.tunnelSegments.push({
    axis,
    cross: axis === "x" ? centerZ : centerX,
    min: axis === "x" ? Math.min(startPoint.x, endPoint.x) : Math.min(startPoint.z, endPoint.z),
    max: axis === "x" ? Math.max(startPoint.x, endPoint.x) : Math.max(startPoint.z, endPoint.z),
    halfWidth,
    yMin: caveLayout.tunnelY - halfHeight,
    yMax: caveLayout.tunnelY + halfHeight,
    centerY: caveLayout.tunnelY,
    centerX,
    centerZ,
  });
}

function createTunnelEndCap(parent, nodeKey) {
  if (nodeKey === "S" || nodeKey === "A" || nodeKey === "P" || nodeKey === "G") {
    return;
  }
  const node = caveLayout.tunnelKeys[nodeKey];
  createBox(parent, materials.caveRock, node.x, caveLayout.tunnelY, node.z, caveLayout.tunnelInnerWidth + caveLayout.wallThickness * 2, caveLayout.tunnelInnerHeight + caveLayout.wallThickness * 2, caveLayout.wallThickness * 1.4, {
    cast: false,
    receive: false,
  });
  addGlobalCollider(
    node.x - caveLayout.tunnelInnerWidth * 0.5 - caveLayout.wallThickness,
    caveLayout.tunnelY - caveLayout.tunnelInnerHeight * 0.5 - caveLayout.wallThickness,
    node.z - caveLayout.tunnelInnerWidth * 0.5 - caveLayout.wallThickness,
    node.x + caveLayout.tunnelInnerWidth * 0.5 + caveLayout.wallThickness,
    caveLayout.tunnelY + caveLayout.tunnelInnerHeight * 0.5 + caveLayout.wallThickness,
    node.z + caveLayout.tunnelInnerWidth * 0.5 + caveLayout.wallThickness
  );
}

function createMotherHead(parent) {
  const mother = new THREE.Group();
  mother.position.set(caveLayout.mother.x, caveLayout.mother.y, caveLayout.mother.z);
  parent.add(mother);

  createSphere(mother, materials.motherHead, 0, 4.2, 0, 5.6, { cast: false, receive: false });
  createSphere(mother, materials.motherHead, 0, 3.4, 2.6, 3.9, { cast: false, receive: false });
  createSphere(mother, materials.monsterMouth, 0, 1.5, 5.8, 2.8, { cast: false, receive: false });
  const jaw = createBox(mother, materials.monsterMouth, 0, 0.9, 6.1, 3.2, 1.6, 2.2, { rx: -0.1, cast: false, receive: false });
  for (let index = 0; index < 9; index += 1) {
    const offset = -1.18 + index * 0.295;
    createCone(mother, materials.wormTunnelTooth, offset, 1.88, 6.68, 0.12, 0.62, 0.12, { rx: Math.PI, cast: false, receive: false });
    createCone(mother, materials.wormTunnelTooth, offset * 0.92, 0.3, 6.56, 0.12, 0.56, 0.12, { cast: false, receive: false });
  }
  createSphere(mother, materials.motherEye, -2.2, 5.3, 3.7, 0.78, { cast: false, receive: false });
  createSphere(mother, materials.motherEye, 2.2, 5.3, 3.7, 0.78, { cast: false, receive: false });
  createBox(mother, materials.motherHead, -3.6, 2.8, 2.6, 0.6, 3.1, 1.3, { rz: 0.36, cast: false, receive: false });
  createBox(mother, materials.motherHead, 3.6, 2.8, 2.6, 0.6, 3.1, 1.3, { rz: -0.36, cast: false, receive: false });
  addGlobalCollider(caveLayout.mother.x - 5.2, caveLayout.mother.y + 0.2, caveLayout.mother.z - 2.4, caveLayout.mother.x + 5.2, caveLayout.mother.y + 8.4, caveLayout.mother.z + 7.2);
  caveState.mother = { group: mother, jaw };
}

function createFlyStorm(parent) {
  const stormGroup = new THREE.Group();
  stormGroup.position.set(caveLayout.cavern.x, caveLayout.cavern.floorY + 6, caveLayout.cavern.z);
  parent.add(stormGroup);

  const count = 180;
  const mesh = new THREE.InstancedMesh(geometries.sphere, materials.insectBlack, count);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  stormGroup.add(mesh);

  const data = [];
  for (let index = 0; index < count; index += 1) {
    data.push({
      phase: Math.random() * Math.PI * 2,
      height: Math.random(),
      radius: 2 + Math.random() * 7,
      scale: 0.12 + Math.random() * 0.1,
      speed: 1.2 + Math.random() * 2.4,
    });
  }

  caveState.storm = { group: stormGroup, mesh, data, tempMatrix: new THREE.Matrix4() };
}

function createCavern(parent) {
  const cavern = caveLayout.cavern;
  createCylinder(parent, materials.caveRockDark, cavern.x, cavern.floorY - 1.2, cavern.z, cavern.radius * 1.02, 2.6, {
    cast: false,
    receive: false,
  });

  for (let index = 0; index < 28; index += 1) {
    const angle = (index / 28) * Math.PI * 2;
    const ringRadius = cavern.radius - 1.4 + Math.sin(index * 1.8) * 1.4;
    const px = cavern.x + Math.cos(angle) * ringRadius;
    const pz = cavern.z + Math.sin(angle) * ringRadius;
    const height = 18 + (index % 5) * 4.2;
    createCylinder(parent, materials.caveRock, px, cavern.floorY + height * 0.5, pz, 2.4 + (index % 3) * 0.45, height, {
      cast: false,
      receive: false,
    });
    addGlobalCollider(px - 2.8, cavern.floorY, pz - 2.8, px + 2.8, cavern.floorY + height, pz + 2.8);

    if (index % 2 === 0) {
      const glowMaterial = index % 4 === 0 ? materials.caveGlowBlue : materials.caveGlowAmber;
      createSphere(parent, glowMaterial, px * 0.98 + cavern.x * 0.02, cavern.floorY + 8 + (index % 4) * 2.6, pz * 0.98 + cavern.z * 0.02, 1.15 + (index % 3) * 0.24, {
        cast: false,
        receive: false,
      });
    }
  }

  const ledgeWidth = 8;
  createBox(parent, materials.caveRock, cavern.x - 18, caveLayout.tunnelY - 1.2, cavern.z - 16, ledgeWidth, 2.4, 20, { cast: false, receive: false });
  createBox(parent, materials.caveRock, cavern.x - 10, caveLayout.tunnelY - 2.2, cavern.z - 2, 14, 4.4, 10, { cast: false, receive: false });
  addGlobalCollider(cavern.x - 22, caveLayout.tunnelY - 2.4, cavern.z - 26, cavern.x - 14, caveLayout.tunnelY, cavern.z + 6);
  addGlobalCollider(cavern.x - 17, caveLayout.tunnelY - 4.4, cavern.z - 7, cavern.x - 3, caveLayout.tunnelY, cavern.z + 3);

  const blueLight = new THREE.PointLight(0x5daeff, 3.4, 90, 2.1);
  blueLight.position.set(cavern.x - 10, cavern.floorY + 16, cavern.z - 12);
  parent.add(blueLight);
  const amberLight = new THREE.PointLight(0xffa45f, 2.8, 84, 1.9);
  amberLight.position.set(cavern.x + 11, cavern.floorY + 14, cavern.z + 10);
  parent.add(amberLight);

  createMotherHead(parent);
  createFlyStorm(parent);
}

function createTunnelWorm(route, seed = 0) {
  const rand = createRng(hash2(91 + seed * 17, 203 + seed * 31));
  const root = new THREE.Group();
  caveState.group.add(root);

  const segments = [];
  for (let index = 0; index < 8; index += 1) {
    const segment = createSphere(root, index === 0 ? materials.wormTunnelFlesh : materials.wormTunnelBody, 0, 0, -index * 0.42, 0.68 - index * 0.04, {
      cast: false,
      receive: false,
    });
    segments.push(segment);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, 0, 0.5);
  root.add(jaw);
  createSphere(jaw, materials.wormTunnelFlesh, 0, 0, 0, 0.62, { cast: false, receive: false });
  createSphere(jaw, materials.monsterMouth, 0, 0, 0.18, 0.42, { cast: false, receive: false });
  for (let index = 0; index < 8; index += 1) {
    const offset = -0.28 + index * 0.08;
    createCone(jaw, materials.wormTunnelTooth, offset, 0.18, 0.48, 0.05, 0.22, 0.05, { rx: Math.PI, cast: false, receive: false });
    createCone(jaw, materials.wormTunnelTooth, offset, -0.18, 0.44, 0.05, 0.22, 0.05, { cast: false, receive: false });
  }

  addGlowingEyes(root, -0.18, 0.18, 0.42, 0.36, 0.06);

  const worm = {
    group: root,
    segments,
    jaw,
    route,
    progress: rand() * route.length,
    direction: rand() > 0.5 ? 1 : -1,
    roamSpeed: 3.8 + rand() * 0.9,
    chaseSpeed: 10.2 + rand() * 1.6,
    state: "roam",
    phase: rand() * Math.PI * 2,
    chaseCooldown: 0,
    collider: new THREE.Box3(),
  };

  sampleRoutePosition(route, worm.progress, worm.group.position);
  caveState.worms.push(worm);
  return worm;
}

function updateTunnelWorm(worm, delta, elapsed) {
  const playerInTunnels = isPlayerInCave() && !isPositionInsideCaveCavern(flyer.position, 1);
  const headWorld = worm.group.position;
  const playerDistance = flyer.position.distanceTo(headWorld);
  const hasSight = playerInTunnels
    && playerDistance < 14
    && !hasVisibilityBlockerBetween(headWorld, flyer.position, 0.04);

  if (hasSight) {
    worm.state = "chase";
    worm.chaseCooldown = 2.6;
  } else if (worm.chaseCooldown > 0) {
    worm.chaseCooldown = Math.max(0, worm.chaseCooldown - delta);
  } else {
    worm.state = "roam";
  }

  if (worm.state === "chase") {
    const targetInfo = getRouteDistanceInfo(worm.route, flyer.position);
    const direction = Math.sign(targetInfo.progress - worm.progress) || worm.direction || 1;
    worm.direction = direction;
    worm.progress += direction * worm.chaseSpeed * delta;
  } else {
    worm.progress += worm.direction * worm.roamSpeed * delta;
    if (worm.progress <= 0) {
      worm.progress = 0;
      worm.direction = 1;
    } else if (worm.progress >= worm.route.length) {
      worm.progress = worm.route.length;
      worm.direction = -1;
    }
  }

  sampleRoutePosition(worm.route, worm.progress, worm.group.position);
  const directionVector = sampleRouteDirection(worm.route, worm.progress, new THREE.Vector3());
  worm.group.rotation.y = Math.atan2(directionVector.x, directionVector.z);

  const mouthOpen = worm.state === "chase" ? 0.48 : 0.2;
  worm.jaw.rotation.x = mouthOpen + Math.abs(Math.sin(elapsed * 5.4 + worm.phase)) * (worm.state === "chase" ? 0.22 : 0.08);

  for (let index = 0; index < worm.segments.length; index += 1) {
    const segment = worm.segments[index];
    segment.position.x = Math.sin(elapsed * 7.2 - index * 0.58 + worm.phase) * 0.11;
    segment.position.y = Math.sin(elapsed * 5.4 - index * 0.32 + worm.phase) * 0.08;
    segment.position.z = -index * 0.42 + Math.cos(elapsed * 6.4 - index * 0.26 + worm.phase) * 0.06;
  }

  const colliderRadius = 0.78;
  worm.collider.min.set(
    worm.group.position.x - colliderRadius,
    worm.group.position.y - 0.5,
    worm.group.position.z - colliderRadius
  );
  worm.collider.max.set(
    worm.group.position.x + colliderRadius,
    worm.group.position.y + 0.5,
    worm.group.position.z + colliderRadius
  );
}

function updateCaveStorm(elapsed) {
  if (!caveState.storm) {
    return;
  }

  const { mesh, data, tempMatrix } = caveState.storm;
  const totalHeight = caveLayout.cavern.height + 64;
  for (let index = 0; index < data.length; index += 1) {
    const fly = data[index];
    const height = fly.height * totalHeight;
    const spin = elapsed * fly.speed + fly.phase + height * 0.12;
    const spiral = 2.4 + fly.radius + Math.sin(elapsed * 1.2 + fly.phase) * 1.1;
    const x = Math.cos(spin) * spiral;
    const z = Math.sin(spin) * spiral;
    const y = height - totalHeight * 0.45;
    tempMatrix.makeScale(fly.scale, fly.scale * 0.72, fly.scale);
    tempMatrix.setPosition(x, y, z);
    mesh.setMatrixAt(index, tempMatrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  if (caveState.mother) {
    caveState.mother.jaw.rotation.x = 0.18 + Math.abs(Math.sin(elapsed * 1.6)) * 0.34;
  }
}

function updateCaveActors(delta, elapsed) {
  if (!caveState.initialized) {
    return;
  }

  caveState.portalCooldown = Math.max(0, caveState.portalCooldown - delta);
  if (caveState.portal) {
    caveState.portal.group.position.y = caveState.portal.baseY + Math.sin(elapsed * 2.4 + caveState.portal.phase) * 0.12;
    caveState.portal.group.rotation.y += delta * 0.9;
  }

  for (const worm of caveState.worms) {
    updateTunnelWorm(worm, delta, elapsed);
  }
  updateCaveStorm(elapsed);
}

function initializeCaveSystem() {
  if (caveState.initialized) {
    return;
  }

  caveState.initialized = true;
  caveState.group = new THREE.Group();
  caveState.group.name = "FlysWorldCaveSystem";
  scene.add(caveState.group);

  createCaveEntranceMarkers(caveState.group);

  const connections = [
    ["A", "B"],
    ["B", "C"],
    ["C", "D"],
    ["D", "E"],
    ["E", "F"],
    ["F", "H"],
    ["H", "G"],
    ["H", "R"],
    ["R", "Q"],
    ["Q", "P"],
    ["C", "L1"],
    ["L1", "L2"],
    ["D", "R1"],
    ["R1", "R2"],
  ];

  const degree = new Map();

  for (const [from, to] of connections) {
    degree.set(from, (degree.get(from) || 0) + 1);
    degree.set(to, (degree.get(to) || 0) + 1);
    createTunnelSegmentGeometry(
      caveState.group,
      caveLayout.tunnelKeys[from],
      caveLayout.tunnelKeys[to]
    );
  }

  for (const [key, count] of degree.entries()) {
    if (count === 1) {
      createTunnelEndCap(caveState.group, key);
    }
  }

  createCavern(caveState.group);

  caveState.tunnelRoutes = [
    createTunnelRoute(["D", "E", "F", "H", "G"]),
    createTunnelRoute(["D", "E", "F", "H", "R"]),
    createTunnelRoute(["D", "E", "F", "H", "G"]),
    createTunnelRoute(["R2", "R1", "D", "E", "F"]),
    createTunnelRoute(["G", "H", "F", "E", "D"]),
  ];

  caveState.tunnelRoutes.forEach((route, index) => {
    createTunnelWorm(route, index + 1);
  });
}

function createAntColony(chunk, rand) {
  const root = new THREE.Group();
  chunk.group.add(root);

  const ants = [];
  const antCount = 4 + Math.floor(rand() * 3);
  for (let index = 0; index < antCount; index += 1) {
    const ant = new THREE.Group();
    root.add(ant);
    createSphere(ant, materials.insectBlack, 0, 0.02, -0.03, 0.03, { cast: false, receive: false });
    createSphere(ant, materials.insectBlack, 0, 0.02, 0.01, 0.022, { cast: false, receive: false });
    createSphere(ant, materials.insectBlack, 0, 0.02, 0.05, 0.018, { cast: false, receive: false });
    addGlowingEyes(ant, -0.014, 0.03, 0.058, 0.028, 0.008);
    createBox(ant, materials.insectBlack, -0.035, 0.018, 0.005, 0.06, 0.005, 0.02, { rz: 0.55, cast: false, receive: false });
    createBox(ant, materials.insectBlack, 0.035, 0.018, 0.005, 0.06, 0.005, 0.02, { rz: -0.55, cast: false, receive: false });
    ants.push({ group: ant, offset: rand() * Math.PI * 2 });
  }

  const center = chooseForestGroundSpot(chunk, rand, 1.8);
  const radius = 0.55 + rand() * 0.5;
  const speed = 1.45 + rand() * 0.45;
  const phase = rand() * Math.PI * 2;

  const actor = {
    kind: "ants",
    homeCenter: center.clone(),
    alertFocus: center.clone(),
    alertUntil: 0,
    nextAlertAt: 0,
    update(delta, time) {
      updateAnimalRoamCenter(actor, center, delta, 0.16, 0.72);
      root.position.set(center.x, 0.01, center.z);

      ants.forEach((ant, index) => {
        const t = time * speed + ant.offset + phase + index * 0.4;
        const x = Math.cos(t) * radius;
        const z = Math.sin(t * 1.3) * radius * 0.7;
        const nextX = Math.cos(t + 0.12) * radius;
        const nextZ = Math.sin((t + 0.12) * 1.3) * radius * 0.7;

        ant.group.position.set(x, 0, z);
        ant.group.lookAt(nextX, 0.02, nextZ);
        ant.group.position.y = 0.01 + Math.abs(Math.sin(time * 9 + ant.offset)) * 0.015;
      });

      updateAnimalAwareness(actor, delta, ants[0].group, {
        senseDistance: 10,
        verticalRange: 8,
        lookThreshold: 0.74,
        cooldownMs: 8500,
        roamDurationMs: 7000,
        growlIntensity: 0.035,
        lookSource: ants[0].group,
      });
    },
  };

  chunk.actors.push(actor);
}

function createCicada(chunk, rand) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  chunk.group.add(root);

  createSphere(rig, materials.insectShell, 0, 0.06, 0, 0.1, { cast: false, receive: false });
  createSphere(rig, materials.insectAmber, 0, 0.05, 0.12, 0.07, { cast: false, receive: false });
  addGlowingEyes(rig, -0.05, 0.09, 0.13, 0.1, 0.012);
  const wingLeft = createBox(rig, materials.insectWing, -0.12, 0.08, -0.02, 0.16, 0.01, 0.38, { rz: 0.18, cast: false, receive: false });
  const wingRight = createBox(rig, materials.insectWing, 0.12, 0.08, -0.02, 0.16, 0.01, 0.38, { rz: -0.18, cast: false, receive: false });
  createBox(rig, materials.insectBlack, -0.14, -0.02, 0.04, 0.14, 0.01, 0.02, { rz: 0.8, cast: false, receive: false });
  createBox(rig, materials.insectBlack, 0.14, -0.02, 0.04, 0.14, 0.01, 0.02, { rz: -0.8, cast: false, receive: false });

  const anchor = chooseForestTreeAnchor(chunk, rand);
  const angle = rand() * Math.PI * 2;
  const trunkRadius = 0.55 + rand() * 0.18;
  root.position.set(
    anchor.x + Math.cos(angle) * trunkRadius,
    anchor.y - 1.8 - rand() * 1.4,
    anchor.z + Math.sin(angle) * trunkRadius
  );
  root.rotation.y = angle + Math.PI;

  const phase = rand() * Math.PI * 2;
  const actor = {
    kind: "cicada",
    nextAlertAt: 0,
    update(delta, time) {
      rig.position.y = Math.sin(time * 2.6 + phase) * 0.03;
      const wingBuzz = Math.sin(time * 28 + phase) * 0.08;
      wingLeft.rotation.z = 0.18 + wingBuzz;
      wingRight.rotation.z = -0.18 - wingBuzz;
      rig.rotation.z = Math.sin(time * 5.2 + phase) * 0.04;

      updateAnimalAwareness(actor, delta, rig, {
        senseDistance: 15,
        verticalRange: 12,
        lookThreshold: 0.8,
        cooldownMs: 9000,
        roamDurationMs: 5000,
        growlIntensity: 0.03,
        lookSource: root,
      });
    },
  };

  chunk.actors.push(actor);
}

function createOwl(chunk, rand) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  chunk.group.add(root);

  createCylinder(rig, materials.bark, 0, 0.04, -0.06, 0.12, 0.18, { rx: Math.PI / 2, cast: false, receive: false });
  createSphere(rig, materials.animalDarkBrown, 0, 0.34, 0, 0.28, { cast: false, receive: false });
  createSphere(rig, materials.animalCream, 0, 0.34, 0.08, 0.17, { cast: false, receive: false });

  const head = new THREE.Group();
  head.position.set(0, 0.52, 0.02);
  rig.add(head);
  createSphere(head, materials.animalDarkBrown, 0, 0, 0, 0.2, { cast: false, receive: false });
  createSphere(head, materials.animalCream, -0.07, 0.02, 0.1, 0.08, { cast: false, receive: false });
  createSphere(head, materials.animalCream, 0.07, 0.02, 0.1, 0.08, { cast: false, receive: false });
  createSphere(head, materials.animalEye, -0.07, 0.02, 0.16, 0.03, { cast: false, receive: false });
  createSphere(head, materials.animalEye, 0.07, 0.02, 0.16, 0.03, { cast: false, receive: false });
  createCone(head, materials.beak, 0, -0.04, 0.16, 0.04, 0.1, 0.04, { rx: Math.PI / 2, cast: false, receive: false });

  const wingLeft = createBox(rig, materials.animalDarkBrown, -0.18, 0.3, 0, 0.14, 0.36, 0.28, { rz: 0.12, cast: false, receive: false });
  const wingRight = createBox(rig, materials.animalDarkBrown, 0.18, 0.3, 0, 0.14, 0.36, 0.28, { rz: -0.12, cast: false, receive: false });

  const anchor = chooseForestTreeAnchor(chunk, rand);
  const angle = rand() * Math.PI * 2;
  root.position.set(
    anchor.x + Math.cos(angle) * 0.92,
    anchor.y + 0.8 + rand() * 1.8,
    anchor.z + Math.sin(angle) * 0.92
  );
  root.lookAt(anchor.x, root.position.y + 0.1, anchor.z);

  const phase = rand() * Math.PI * 2;
  const actor = {
    kind: "owl",
    nextAlertAt: 0,
    update(delta, time) {
      rig.position.y = Math.abs(Math.sin(time * 1.4 + phase)) * 0.04;
      head.rotation.y = Math.sin(time * 0.7 + phase) * 0.55;
      head.rotation.x = Math.sin(time * 1.2 + phase) * 0.08;
      wingLeft.rotation.z = 0.12 + Math.sin(time * 2 + phase) * 0.04;
      wingRight.rotation.z = -0.12 - Math.sin(time * 2 + phase) * 0.04;

      updateAnimalAwareness(actor, delta, head, {
        senseDistance: 26,
        verticalRange: 18,
        lookThreshold: 0.83,
        cooldownMs: 9500,
        roamDurationMs: 6500,
        growlIntensity: 0.06,
        lookSource: head,
      });
    },
  };

  chunk.actors.push(actor);
}

function createDeer(chunk, rand) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  chunk.group.add(root);

  createBox(rig, materials.animalTan, 0, 0.9, 0, 0.62, 0.62, 1.7, { cast: false, receive: false });
  createSphere(rig, materials.animalCream, 0, 0.86, 0.16, 0.2, { cast: false, receive: false });

  const neck = new THREE.Group();
  neck.position.set(0, 1.02, 0.64);
  rig.add(neck);
  createBox(neck, materials.animalTan, 0, 0.18, 0.08, 0.18, 0.54, 0.24, { rx: -0.22, cast: false, receive: false });

  const head = new THREE.Group();
  head.position.set(0, 0.38, 0.18);
  neck.add(head);
  createBox(head, materials.animalTan, 0, 0.02, 0, 0.26, 0.24, 0.44, { cast: false, receive: false });
  createBox(head, materials.animalCream, 0, -0.05, 0.2, 0.18, 0.12, 0.22, { cast: false, receive: false });
  createBox(head, materials.animalTan, -0.08, 0.18, -0.06, 0.05, 0.14, 0.05, { rz: -0.2, cast: false, receive: false });
  createBox(head, materials.animalTan, 0.08, 0.18, -0.06, 0.05, 0.14, 0.05, { rz: 0.2, cast: false, receive: false });
  addGlowingEyes(head, -0.08, 0.03, 0.16, 0.16, 0.022);
  createBox(head, materials.antler, -0.06, 0.32, -0.02, 0.04, 0.32, 0.04, { rz: -0.08, cast: false, receive: false });
  createBox(head, materials.antler, 0.06, 0.32, -0.02, 0.04, 0.32, 0.04, { rz: 0.08, cast: false, receive: false });
  createBox(head, materials.antler, -0.14, 0.48, 0, 0.16, 0.04, 0.04, { rz: -0.42, cast: false, receive: false });
  createBox(head, materials.antler, 0.14, 0.48, 0, 0.16, 0.04, 0.04, { rz: 0.42, cast: false, receive: false });
  createBox(head, materials.antler, -0.1, 0.58, 0.08, 0.12, 0.04, 0.04, { rz: -0.32, cast: false, receive: false });
  createBox(head, materials.antler, 0.1, 0.58, 0.08, 0.12, 0.04, 0.04, { rz: 0.32, cast: false, receive: false });

  const tail = new THREE.Group();
  tail.position.set(0, 0.98, -0.82);
  rig.add(tail);
  createBox(tail, materials.animalCream, 0, 0.02, -0.08, 0.12, 0.08, 0.14, { cast: false, receive: false });

  const frontLeft = createAnimalLeg(rig, materials.animalDarkBrown, -0.18, 0.44, 0.5, 0.05, 0.88);
  const frontRight = createAnimalLeg(rig, materials.animalDarkBrown, 0.18, 0.44, 0.5, 0.05, 0.88);
  const backLeft = createAnimalLeg(rig, materials.animalDarkBrown, -0.18, 0.44, -0.5, 0.05, 0.88);
  const backRight = createAnimalLeg(rig, materials.animalDarkBrown, 0.18, 0.44, -0.5, 0.05, 0.88);

  createGroundAnimalMotion(chunk, rand, "deer", root, rig, {
    radiusX: 2 + rand() * 1.9,
    radiusZ: 1.3 + rand() * 1.5,
    speed: 0.16 + rand() * 0.06,
    bodyLift: 0.04,
    stride: 0.48,
    bodyRoll: 0.04,
    frontLegs: [frontLeft],
    crossFrontLegs: [frontRight],
    backLegs: [backRight],
    crossBackLegs: [backLeft],
    head,
    neck,
    headPitch: 0.08,
    headYaw: 0.1,
    neckPitch: 0.05,
    tail,
    tailSwing: 0.08,
    tailYaw: 0.05,
    senseDistance: 30,
    lookThreshold: 0.8,
    growlIntensity: 0.07,
    treeClearance: 3.2,
  });
}

function createMoose(chunk, rand) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  chunk.group.add(root);

  createBox(rig, materials.animalMoose, 0, 1.18, 0.02, 0.94, 0.88, 2.2, { cast: false, receive: false });
  createSphere(rig, materials.animalDarkBrown, 0, 1.4, -0.18, 0.36, { cast: false, receive: false });

  const neck = new THREE.Group();
  neck.position.set(0, 1.3, 0.86);
  rig.add(neck);
  createBox(neck, materials.animalMoose, 0, 0.26, 0.12, 0.24, 0.76, 0.34, { rx: -0.2, cast: false, receive: false });

  const head = new THREE.Group();
  head.position.set(0, 0.48, 0.26);
  neck.add(head);
  createBox(head, materials.animalMoose, 0, 0.04, 0.04, 0.34, 0.28, 0.62, { cast: false, receive: false });
  createBox(head, materials.animalDarkBrown, 0, -0.06, 0.28, 0.22, 0.16, 0.28, { cast: false, receive: false });
  createBox(head, materials.animalMoose, -0.12, 0.22, -0.1, 0.08, 0.18, 0.06, { rz: -0.18, cast: false, receive: false });
  createBox(head, materials.animalMoose, 0.12, 0.22, -0.1, 0.08, 0.18, 0.06, { rz: 0.18, cast: false, receive: false });
  addGlowingEyes(head, -0.09, 0.04, 0.18, 0.18, 0.024);
  createBox(head, materials.antler, -0.1, 0.48, -0.06, 0.05, 0.46, 0.05, { rz: -0.12, cast: false, receive: false });
  createBox(head, materials.antler, 0.1, 0.48, -0.06, 0.05, 0.46, 0.05, { rz: 0.12, cast: false, receive: false });
  createBox(head, materials.antler, -0.3, 0.7, 0, 0.42, 0.18, 0.05, { rz: -0.28, cast: false, receive: false });
  createBox(head, materials.antler, 0.3, 0.7, 0, 0.42, 0.18, 0.05, { rz: 0.28, cast: false, receive: false });
  createBox(head, materials.antler, -0.24, 0.88, 0.12, 0.28, 0.12, 0.05, { rz: -0.18, cast: false, receive: false });
  createBox(head, materials.antler, 0.24, 0.88, 0.12, 0.28, 0.12, 0.05, { rz: 0.18, cast: false, receive: false });

  const tail = new THREE.Group();
  tail.position.set(0, 1.2, -1.08);
  rig.add(tail);
  createBox(tail, materials.animalDarkBrown, 0, 0.03, -0.1, 0.16, 0.1, 0.16, { cast: false, receive: false });

  const frontLeft = createAnimalLeg(rig, materials.animalDarkBrown, -0.28, 0.56, 0.66, 0.06, 1.12);
  const frontRight = createAnimalLeg(rig, materials.animalDarkBrown, 0.28, 0.56, 0.66, 0.06, 1.12);
  const backLeft = createAnimalLeg(rig, materials.animalDarkBrown, -0.28, 0.56, -0.66, 0.06, 1.12);
  const backRight = createAnimalLeg(rig, materials.animalDarkBrown, 0.28, 0.56, -0.66, 0.06, 1.12);

  createGroundAnimalMotion(chunk, rand, "moose", root, rig, {
    radiusX: 2.2 + rand() * 1.8,
    radiusZ: 1.4 + rand() * 1.6,
    speed: 0.11 + rand() * 0.05,
    bodyLift: 0.035,
    stride: 0.34,
    bodyRoll: 0.03,
    frontLegs: [frontLeft],
    crossFrontLegs: [frontRight],
    backLegs: [backRight],
    crossBackLegs: [backLeft],
    head,
    neck,
    headPitch: 0.06,
    headYaw: 0.08,
    neckPitch: 0.04,
    tail,
    tailSwing: 0.05,
    tailYaw: 0.04,
    senseDistance: 34,
    lookThreshold: 0.79,
    growlIntensity: 0.08,
    treeClearance: 4.2,
  });
}

function createPorcupine(chunk, rand) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  chunk.group.add(root);

  createSphere(rig, materials.animalDarkBrown, 0, 0.46, 0, 0.42, { cast: false, receive: false });
  createBox(rig, materials.animalDarkBrown, 0, 0.42, -0.14, 0.7, 0.42, 1.04, { cast: false, receive: false });

  const head = new THREE.Group();
  head.position.set(0, 0.42, 0.46);
  rig.add(head);
  createSphere(head, materials.animalTan, 0, 0, 0.04, 0.18, { cast: false, receive: false });
  createSphere(head, materials.animalBlack, 0, -0.02, 0.24, 0.03, { cast: false, receive: false });
  addGlowingEyes(head, -0.05, 0.03, 0.14, 0.1, 0.016);

  for (let row = 0; row < 4; row += 1) {
    for (let index = 0; index < 4; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const z = -0.38 + row * 0.25 + index * 0.03;
      const quillMaterial = index % 2 === 0 ? materials.quill : materials.animalBlack;
      createBox(rig, quillMaterial, side * (0.18 + row * 0.03), 0.72 + row * 0.05, z, 0.04, 0.34, 0.04, {
        rx: -0.85,
        rz: side * 0.32,
        cast: false,
        receive: false,
      });
    }
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0.5, -0.6);
  rig.add(tail);
  createBox(tail, materials.quill, 0, 0.04, -0.1, 0.12, 0.16, 0.18, { rx: -0.5, cast: false, receive: false });

  const frontLeft = createAnimalLeg(rig, materials.animalDarkBrown, -0.16, 0.18, 0.26, 0.05, 0.36);
  const frontRight = createAnimalLeg(rig, materials.animalDarkBrown, 0.16, 0.18, 0.26, 0.05, 0.36);
  const backLeft = createAnimalLeg(rig, materials.animalDarkBrown, -0.16, 0.18, -0.26, 0.05, 0.36);
  const backRight = createAnimalLeg(rig, materials.animalDarkBrown, 0.16, 0.18, -0.26, 0.05, 0.36);

  createGroundAnimalMotion(chunk, rand, "porcupine", root, rig, {
    radiusX: 1 + rand() * 1.2,
    radiusZ: 0.8 + rand() * 1,
    speed: 0.1 + rand() * 0.05,
    bodyLift: 0.022,
    stride: 0.2,
    bodyRoll: 0.03,
    frontLegs: [frontLeft],
    crossFrontLegs: [frontRight],
    backLegs: [backRight],
    crossBackLegs: [backLeft],
    head,
    headPitch: 0.08,
    headYaw: 0.06,
    tail,
    tailBasePitch: -0.3,
    tailSwing: 0.08,
    tailYaw: 0.06,
    senseDistance: 16,
    lookThreshold: 0.78,
    growlIntensity: 0.055,
    treeClearance: 2.4,
  });
}

function createForestMonster() {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const rig = new THREE.Group();
  group.add(rig);

  createSphere(rig, materials.monsterHide, 0, 6.2, -0.38, 1.1, { cast: false, receive: false });
  createBox(rig, materials.monsterMuscle, 0, 7.4, 0.08, 3.2, 4.2, 2.2, { cast: false, receive: false });
  createSphere(rig, materials.monsterMuscle, 0, 8.8, 0.34, 1.48, { cast: false, receive: false });
  createSphere(rig, materials.monsterMuscle, -1.05, 8.86, 0.18, 0.76, { cast: false, receive: false });
  createSphere(rig, materials.monsterMuscle, 1.05, 8.86, 0.18, 0.76, { cast: false, receive: false });
  createSphere(rig, materials.monsterHide, 0, 10.2, -0.22, 0.92, { cast: false, receive: false });

  const neck = new THREE.Group();
  neck.position.set(0, 9.9, 0.86);
  rig.add(neck);
  createBox(neck, materials.monsterMuscle, 0, 0.78, 0.08, 1.12, 1.8, 1.12, { rx: -0.18, cast: false, receive: false });

  const head = new THREE.Group();
  head.position.set(0, 1.32, 0.28);
  neck.add(head);
  createSphere(head, materials.monsterHide, 0, 0.42, 0, 1.04, { cast: false, receive: false });
  createSphere(head, materials.monsterMuscle, 0, 0.52, 0.42, 0.84, { cast: false, receive: false });
  createSphere(head, materials.monsterHide, -0.8, 0.76, -0.16, 0.28, { cast: false, receive: false });
  createSphere(head, materials.monsterHide, 0.8, 0.76, -0.16, 0.28, { cast: false, receive: false });

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.08, 0.44);
  head.add(jaw);
  createBox(jaw, materials.monsterMouth, 0, -0.06, 0.24, 1.04, 0.48, 1.12, { cast: false, receive: false });

  createBox(head, materials.monsterMouth, 0, 0.08, 0.34, 0.96, 0.34, 1.04, { cast: false, receive: false });
  createBox(head, materials.monsterHide, 0, 0.14, 0.94, 0.78, 0.44, 1.28, { cast: false, receive: false });

  for (let row = 0; row < 2; row += 1) {
    for (let index = 0; index < 8; index += 1) {
      const x = -0.34 + index * 0.1;
      const z = 0.56 + Math.abs(index - 3.5) * 0.05;
      createCone(head, materials.monsterTooth, x, row * 0.08, z, 0.06, 0.16, 0.06, { rx: Math.PI, cast: false, receive: false });
      createCone(jaw, materials.monsterTooth, x, -0.08 - row * 0.08, z - 0.04, 0.06, 0.18, 0.06, { cast: false, receive: false });
    }
  }

  addGlowingEyes(head, -0.24, 0.56, 0.94, 0.48, 0.08, materials.monsterEye);
  createSphere(head, materials.monsterHide, 0, 0.48, 1.22, 0.14, { cast: false, receive: false });

  const leftHorn = new THREE.Group();
  leftHorn.position.set(-0.56, 1.02, 0.06);
  head.add(leftHorn);
  createCone(leftHorn, materials.monsterHorn, 0, 0.38, -0.02, 0.22, 1.3, 0.22, { rz: 0.38, rx: -0.12, cast: false, receive: false });
  createCone(leftHorn, materials.monsterHorn, -0.14, 0.92, -0.2, 0.14, 0.76, 0.14, { rz: 0.82, rx: -0.24, cast: false, receive: false });

  const rightHorn = new THREE.Group();
  rightHorn.position.set(0.56, 1.02, 0.06);
  head.add(rightHorn);
  createCone(rightHorn, materials.monsterHorn, 0, 0.38, -0.02, 0.22, 1.3, 0.22, { rz: -0.38, rx: -0.12, cast: false, receive: false });
  createCone(rightHorn, materials.monsterHorn, 0.14, 0.92, -0.2, 0.14, 0.76, 0.14, { rz: -0.82, rx: -0.24, cast: false, receive: false });

  function buildArm(side = 1) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 1.55, 9.18, -0.04);
    rig.add(shoulder);

    createSphere(shoulder, materials.monsterMuscle, side * 0.12, 0, 0.04, 0.56, { cast: false, receive: false });
    const upper = createBox(shoulder, materials.monsterMuscle, side * 0.42, -2.1, 0.08, 0.8, 4.6, 0.9, {
      rz: side * 0.18,
      cast: false,
      receive: false,
    });

    const elbow = new THREE.Group();
    elbow.position.set(side * 0.72, -4.14, 0.12);
    shoulder.add(elbow);
    createSphere(elbow, materials.monsterMuscle, 0, 0, 0, 0.42, { cast: false, receive: false });
    const forearm = createBox(elbow, materials.monsterHide, side * 0.24, -2.34, 0, 0.74, 4.8, 0.76, {
      rz: side * 0.14,
      cast: false,
      receive: false,
    });

    const wrist = new THREE.Group();
    wrist.position.set(side * 0.5, -4.64, 0.08);
    elbow.add(wrist);
    createSphere(wrist, materials.monsterHide, 0, 0, 0, 0.3, { cast: false, receive: false });
    const hand = createBox(wrist, materials.monsterHide, side * 0.22, -0.24, 0.28, 0.5, 0.76, 1.04, { cast: false, receive: false });

    const fingers = [];
    for (let index = 0; index < 4; index += 1) {
      const finger = new THREE.Group();
      finger.position.set(side * (0.08 + index * 0.08), -0.4, 0.56 - index * 0.18);
      wrist.add(finger);
      createBox(finger, materials.monsterHide, side * 0.08, -0.26, 0.14, 0.12, 0.52, 0.18, { cast: false, receive: false });
      createCone(finger, materials.monsterTooth, side * 0.08, -0.58, 0.28, 0.08, 0.28, 0.08, { cast: false, receive: false });
      fingers.push(finger);
    }

    return { shoulder, upper, elbow, forearm, wrist, hand, fingers };
  }

  function buildLeg(side = 1) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.72, 5.74, -0.36);
    rig.add(hip);

    createSphere(hip, materials.monsterMuscle, 0, 0, 0, 0.46, { cast: false, receive: false });
    const thigh = createBox(hip, materials.monsterMuscle, side * 0.08, -1.44, 0.06, 0.72, 3.2, 0.86, {
      rz: side * 0.06,
      cast: false,
      receive: false,
    });

    const knee = new THREE.Group();
    knee.position.set(side * 0.12, -2.82, 0.08);
    hip.add(knee);
    createSphere(knee, materials.monsterMuscle, 0, 0, 0, 0.3, { cast: false, receive: false });
    const shin = createBox(knee, materials.monsterHide, side * 0.04, -1.54, -0.02, 0.62, 3.5, 0.72, {
      cast: false,
      receive: false,
    });
    createBox(knee, materials.monsterHide, side * 0.14, -3.44, 0.42, 0.58, 0.32, 1.28, { cast: false, receive: false });
    createCone(knee, materials.monsterTooth, side * 0.26, -3.5, 0.9, 0.08, 0.22, 0.08, { cast: false, receive: false });
    createCone(knee, materials.monsterTooth, side * 0.08, -3.54, 1.02, 0.08, 0.22, 0.08, { cast: false, receive: false });

    return { hip, thigh, knee, shin };
  }

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    group,
    rig,
    neck,
    head,
    jaw,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    phase: Math.random() * Math.PI * 2,
    state: "hidden",
    stateTime: 0,
    speed: 0,
    roamTarget: new THREE.Vector3(),
    investigateTarget: null,
    lastSeenPlayer: new THREE.Vector3(),
    playerSeenAt: 0,
    lastKillAt: 0,
    didRoar: false,
    spawnReady: false,
  };
}

function createSnailMonster() {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const rig = new THREE.Group();
  group.add(rig);

  const body = new THREE.Group();
  body.position.set(0, 0.4, 0);
  rig.add(body);

  createSphere(body, materials.snailBodyDark, 0, 1.2, -1.2, 2.8, { cast: false, receive: false });
  createBox(body, materials.snailBody, 0, 1.6, 1.8, 6.8, 2.2, 9.8, { cast: false, receive: false });
  createSphere(body, materials.snailBody, 0, 1.45, 5.8, 2.2, { cast: false, receive: false });
  createSphere(body, materials.snailBodyDark, 0, 1.1, 8.1, 1.7, { cast: false, receive: false });
  createSphere(body, materials.snailBody, -2.05, 1.5, 2.5, 1.5, { cast: false, receive: false });
  createSphere(body, materials.snailBody, 2.05, 1.5, 2.5, 1.5, { cast: false, receive: false });
  createBox(body, materials.snailBodyDark, 0, 0.82, 3.4, 7.6, 0.64, 11.4, { cast: false, receive: false });
  createBox(body, materials.snailSlime, 0, 0.2, 2.8, 8.2, 0.06, 13.2, { cast: false, receive: false });

  const shellRoot = new THREE.Group();
  shellRoot.position.set(0, 3.1, -1.6);
  rig.add(shellRoot);
  createSphere(shellRoot, materials.snailShellOuter, 0, 0, 0, 3.7, { cast: false, receive: false });
  createSphere(shellRoot, materials.snailShellBand, 0.18, 0.26, 0.32, 3.04, { cast: false, receive: false });
  createSphere(shellRoot, materials.snailShellOuter, 0.34, 0.4, 0.74, 2.46, { cast: false, receive: false });
  createSphere(shellRoot, materials.snailShellBand, 0.48, 0.5, 1.08, 1.98, { cast: false, receive: false });
  createSphere(shellRoot, materials.snailShellOuter, 0.62, 0.56, 1.34, 1.52, { cast: false, receive: false });
  createSphere(shellRoot, materials.snailShellInner, 0.78, 0.62, 1.58, 1.12, { cast: false, receive: false });
  createCone(shellRoot, materials.snailShellOuter, 0.9, 0.72, 1.9, 0.92, 1.8, 0.92, { rx: Math.PI / 2, cast: false, receive: false });
  createSphere(shellRoot, materials.snailShellBand, -1.28, -1.04, 2.76, 0.92, { cast: false, receive: false });
  createSphere(shellRoot, materials.snailShellInner, -1.02, -0.86, 3.06, 0.62, { cast: false, receive: false });

  const head = new THREE.Group();
  head.position.set(0, 2.0, 7.5);
  rig.add(head);
  createSphere(head, materials.snailBody, 0, 0.2, 0.55, 1.42, { cast: false, receive: false });
  createSphere(head, materials.snailBodyDark, 0, -0.06, 1.2, 1.08, { cast: false, receive: false });

  const mouth = new THREE.Group();
  mouth.position.set(0, -0.14, 1.8);
  head.add(mouth);
  createBox(mouth, materials.monsterMouth, 0, 0, 0.18, 1.74, 0.64, 1.2, { cast: false, receive: false });
  createSphere(mouth, materials.snailBodyDark, 0, 0.16, 0.48, 0.52, { cast: false, receive: false });

  const tentacles = [];
  for (const side of [-1, 1]) {
    const stalk = new THREE.Group();
    stalk.position.set(side * 0.68, 0.74, 0.94);
    head.add(stalk);
    createBox(stalk, materials.snailBody, side * 0.06, 0.7, 0.04, 0.24, 1.56, 0.24, {
      rz: side * -0.14,
      cast: false,
      receive: false,
    });
    createSphere(stalk, materials.snailBodyDark, side * 0.1, 1.52, 0.12, 0.24, { cast: false, receive: false });
    tentacles.push(stalk);
  }

  for (let fold = 0; fold < 5; fold += 1) {
    createSphere(rig, materials.snailBodyDark, 0, 0.96 + fold * 0.08, 7.4 - fold * 1.9, 1.04 - fold * 0.1, {
      cast: false,
      receive: false,
    });
  }

  return {
    group,
    rig,
    body,
    head,
    mouth,
    shellRoot,
    tentacles,
    phase: Math.random() * Math.PI * 2,
    state: "hidden",
    stateTime: 0,
    speed: 0,
    roamTarget: new THREE.Vector3(),
    investigateTarget: null,
    lastHeardPosition: new THREE.Vector3(),
    lastTeleportAt: 0,
    spawnReady: false,
    rand: null,
  };
}

function createBird(chunk, rand) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  chunk.group.add(root);

  createSphere(rig, materials.birdBody, 0, 0.03, 0, 0.23, { cast: false, receive: false });
  createSphere(rig, materials.birdWing, 0, 0.02, -0.16, 0.14, { cast: false, receive: false });

  const head = new THREE.Group();
  head.position.set(0, 0.08, 0.26);
  rig.add(head);
  createSphere(head, materials.birdBody, 0, 0, 0, 0.15, { cast: false, receive: false });
  createCone(head, materials.beak, 0, -0.01, 0.13, 0.06, 0.12, 0.06, { rx: Math.PI / 2, cast: false, receive: false });
  createSphere(head, materials.animalEye, -0.05, 0.01, 0.08, 0.025, { cast: false, receive: false });
  createSphere(head, materials.animalEye, 0.05, 0.01, 0.08, 0.025, { cast: false, receive: false });

  const wingLeftPivot = new THREE.Group();
  wingLeftPivot.position.set(-0.2, 0.05, -0.02);
  rig.add(wingLeftPivot);
  const wingLeft = createBox(wingLeftPivot, materials.birdWing, -0.24, 0, 0, 0.52, 0.04, 0.24, { cast: false, receive: false });

  const wingRightPivot = new THREE.Group();
  wingRightPivot.position.set(0.2, 0.05, -0.02);
  rig.add(wingRightPivot);
  const wingRight = createBox(wingRightPivot, materials.birdWing, 0.24, 0, 0, 0.52, 0.04, 0.24, { cast: false, receive: false });

  const tail = createBox(rig, materials.birdWing, 0, 0.02, -0.3, 0.18, 0.03, 0.2, { rx: -0.28, cast: false, receive: false });

  const center = new THREE.Vector3((rand() - 0.5) * 30, 9 + rand() * 7, (rand() - 0.5) * 30);
  const radiusX = 9 + rand() * 10;
  const radiusZ = radiusX * (0.62 + rand() * 0.2);
  const speed = 0.26 + rand() * 0.18;
  const phase = rand() * Math.PI * 2;
  const verticalPhase = rand() * Math.PI * 2;

  const actor = {
    kind: "bird",
    homeCenter: center.clone(),
    alertFocus: center.clone(),
    alertUntil: 0,
    nextAlertAt: 0,
    update(delta, time) {
      updateAnimalRoamCenter(actor, center, delta, 0.18, 0.64);
      const angle = time * speed + phase;
      const localX = center.x + Math.cos(angle) * radiusX;
      const localZ = center.z + Math.sin(angle) * radiusZ;
      const localY = center.y + Math.sin(time * speed * 3.1 + verticalPhase) * 1.2;
      const ahead = angle + 0.16;
      const nextX = center.x + Math.cos(ahead) * radiusX;
      const nextZ = center.z + Math.sin(ahead) * radiusZ;
      const headingX = nextX - localX;
      const headingZ = nextZ - localZ;

      root.position.set(localX, localY, localZ);
      root.rotation.y = Math.atan2(headingX, headingZ);
      rig.rotation.z = Math.sin(time * 11 + phase) * 0.07;

      const flap = Math.sin(time * 20 + phase) * 0.92;
      wingLeftPivot.rotation.z = 0.28 + flap;
      wingRightPivot.rotation.z = -0.28 - flap;
      head.rotation.x = Math.sin(time * 6 + verticalPhase) * 0.08;
      tail.rotation.x = -0.22 + Math.sin(time * 10 + phase) * 0.1;

      updateAnimalAwareness(actor, delta, head, {
        senseDistance: 24,
        verticalRange: 20,
        lookThreshold: 0.78,
        cooldownMs: 7000,
        roamDurationMs: 8000,
        growlIntensity: 0.05,
        lookSource: root,
      });
    },
  };

  chunk.actors.push(actor);
}

function createButterfly(chunk, rand, anchor) {
  const group = new THREE.Group();
  chunk.group.add(group);

  createBox(group, materials.butterflyBody, 0, 0, 0, 0.08, 0.34, 0.08, { cast: false, receive: false });
  const wingMaterial = rand() > 0.5 ? materials.butterflyWingA : materials.butterflyWingB;
  const wingLeft = createBox(group, wingMaterial, -0.14, 0.02, 0, 0.24, 0.02, 0.36, { cast: false, receive: false });
  const wingRight = createBox(group, wingMaterial, 0.14, 0.02, 0, 0.24, 0.02, 0.36, { cast: false, receive: false });

  const center = anchor.clone();
  center.y += 0.8 + rand() * 1.4;
  const radius = 0.7 + rand() * 1.5;
  const speed = 1.1 + rand() * 1.4;
  const phase = rand() * Math.PI * 2;

  chunk.actors.push({
    kind: "butterfly",
    update(delta, time) {
      group.position.set(
        center.x + Math.cos(time * speed + phase) * radius,
        center.y + Math.sin(time * speed * 1.8 + phase) * 0.4,
        center.z + Math.sin(time * speed * 1.3 + phase) * radius
      );
      group.rotation.y = Math.sin(time * speed + phase) * 0.6;
      group.rotation.z = Math.cos(time * speed * 2 + phase) * 0.18;

      const flap = Math.sin(time * 24 + phase) * 1.05;
      wingLeft.rotation.y = flap;
      wingRight.rotation.y = -flap;
    },
  });
}

function createSquirrel(chunk, rand, anchor) {
  const group = new THREE.Group();
  chunk.group.add(group);

  createSphere(group, materials.squirrel, 0, 0.22, 0, 0.22, { cast: false });
  createSphere(group, materials.squirrel, 0.22, 0.27, 0, 0.16, { cast: false });
  createSphere(group, materials.squirrel, -0.28, 0.43, 0, 0.18, { cast: false });
  addGlowingEyes(group, -0.34, 0.45, 0.07, 0.08, 0.02);

  const center = anchor.clone();
  center.y = 0.1;
  const radius = 0.9 + rand() * 1.8;
  const speed = 0.7 + rand() * 0.7;
  const phase = rand() * Math.PI * 2;

  const actor = {
    kind: "squirrel",
    homeCenter: center.clone(),
    alertFocus: center.clone(),
    alertUntil: 0,
    nextAlertAt: 0,
    update(delta, time) {
      updateAnimalRoamCenter(actor, center, delta, 0.18, 0.82);
      const angle = time * speed + phase;
      group.position.set(
        center.x + Math.cos(angle) * radius,
        0.1 + Math.abs(Math.sin(time * speed * 5 + phase)) * 0.12,
        center.z + Math.sin(angle) * radius * 0.7
      );
      group.rotation.y = Math.atan2(
        center.x + Math.cos(angle + 0.12) * radius - group.position.x,
        center.z + Math.sin(angle + 0.12) * radius * 0.7 - group.position.z
      );

      updateAnimalAwareness(actor, delta, group, {
        senseDistance: 15,
        verticalRange: 10,
        lookThreshold: 0.78,
        cooldownMs: 7800,
        roamDurationMs: 7000,
        growlIntensity: 0.05,
        lookSource: group,
      });
    },
  };

  chunk.actors.push(actor);
}

function createCloud(index) {
  const cloud = new THREE.Group();
  scene.add(cloud);

  const puffs = 3 + (index % 3);
  for (let puff = 0; puff < puffs; puff += 1) {
    createSphere(
      cloud,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 }),
      (puff - puffs / 2) * 6,
      Math.sin(puff) * 1.6,
      Math.cos(puff) * 2,
      4 + (puff % 2) * 1.5,
      { cast: false, receive: false }
    );
  }

  const drift = 2 + (index % 5) * 0.3;
  const radius = 150 + index * 12;
  const height = 56 + (index % 4) * 7;
  const phase = index * 0.9;

  cloudActors.push({
    group: cloud,
    update(time) {
      const angle = time * 0.02 * drift + phase;
      cloud.position.set(
        flyer.position.x + Math.cos(angle) * radius,
        height,
        flyer.position.z + Math.sin(angle) * radius * 0.7
      );
      cloud.rotation.y = angle;
    },
  });
}

function ensureForestMonster() {
  if (!forestState.monster) {
    forestState.monster = createForestMonster();
    forestState.monster.rand = createRng(hash2(91, 37));
  }
  return forestState.monster;
}

function ensureSnailMonster() {
  if (!forestState.snail) {
    forestState.snail = createSnailMonster();
    forestState.snail.rand = createRng(hash2(143, 211));
  }
  return forestState.snail;
}

function placeForestMonster(monster, minimumDistance = 24, maximumDistance = 68) {
  const deepForestTarget = sampleLoadedForestPoint(
    monster.rand,
    Math.max(chunkSize * 2.1, minimumDistance),
    Math.max(chunkSize * 3.8, maximumDistance),
    (chunk) => chunk.type === "Skyshroud Forest" && getChunkRingDistance(chunk.cx, chunk.cz) >= neighborhoodChunkRadius + 4
  );
  if (!deepForestTarget) {
    monster.group.visible = false;
    monster.spawnReady = false;
    return false;
  }

  monster.group.position.set(deepForestTarget.x, 0, deepForestTarget.z);
  monster.roamTarget.copy(deepForestTarget);
  monster.group.rotation.y = Math.atan2(flyer.position.x - deepForestTarget.x, flyer.position.z - deepForestTarget.z);
  monster.spawnReady = true;
  monster.group.visible = true;
  return true;
}

function placeSnailMonster(snail, minimumDistance = 70, maximumDistance = 180) {
  const target = sampleLoadedForestPoint(
    snail.rand,
    minimumDistance,
    maximumDistance,
    (chunk) => chunk.type === "Skyshroud Forest" && getChunkRingDistance(chunk.cx, chunk.cz) >= neighborhoodChunkRadius + 3
  );
  if (!target) {
    snail.group.visible = false;
    snail.spawnReady = false;
    return false;
  }

  snail.group.position.set(target.x, 0, target.z);
  snail.roamTarget.copy(target);
  snail.lastHeardPosition.copy(target);
  snail.group.rotation.y = snail.rand() * Math.PI * 2;
  snail.spawnReady = true;
  snail.group.visible = true;
  return true;
}

function moveForestMonster(monster, target, delta, speed, stopDistance = 1.2) {
  const dx = target.x - monster.group.position.x;
  const dz = target.z - monster.group.position.z;
  const distance = Math.hypot(dx, dz);

  if (distance <= stopDistance) {
    monster.speed = 0;
    return distance;
  }

  const headingX = dx / distance;
  const headingZ = dz / distance;
  const moveDistance = Math.min(distance - stopDistance, speed * delta);

  monster.group.position.x += headingX * moveDistance;
  monster.group.position.z += headingZ * moveDistance;
  monster.group.rotation.y = lerpAngle(monster.group.rotation.y, Math.atan2(headingX, headingZ), Math.min(1, delta * 5.8));
  monster.speed = moveDistance / Math.max(delta, 0.0001);

  return distance;
}

function moveSnailMonster(snail, target, delta, speed, stopDistance = 2.4) {
  const dx = target.x - snail.group.position.x;
  const dz = target.z - snail.group.position.z;
  const distance = Math.hypot(dx, dz);

  if (distance <= stopDistance) {
    snail.speed = 0;
    return distance;
  }

  const headingX = dx / distance;
  const headingZ = dz / distance;
  const moveDistance = Math.min(distance - stopDistance, speed * delta);
  snail.group.position.x += headingX * moveDistance;
  snail.group.position.z += headingZ * moveDistance;
  snail.group.rotation.y = lerpAngle(snail.group.rotation.y, Math.atan2(headingX, headingZ), Math.min(1, delta * 2.6));
  snail.speed = moveDistance / Math.max(delta, 0.0001);
  return distance;
}

function updateForestMonsterRig(monster, elapsed) {
  const investigateBlend = monster.state === "investigate" ? 1 : 0;
  const chaseBlend = monster.state === "chase" ? 1 : 0;
  const roarBlend = monster.state === "roar" ? 1 : 0;
  const locomotion = chaseBlend > 0 ? 1 : investigateBlend > 0 ? 0.55 : 0.32;
  const strideRate = 2.2 + monster.speed * 0.18 + chaseBlend * 2.8;
  const stride = Math.sin(elapsed * strideRate + monster.phase) * (0.22 + locomotion * 0.46);
  const bob = Math.abs(Math.sin(elapsed * strideRate * 2 + monster.phase)) * (0.06 + locomotion * 0.18);
  const jawOpen = roarBlend > 0
    ? 0.95
    : chaseBlend > 0
      ? 0.28 + Math.abs(Math.sin(elapsed * 7.2 + monster.phase)) * 0.14
      : 0.08;

  monster.rig.position.y = bob;
  monster.rig.rotation.z = Math.sin(elapsed * 1.9 + monster.phase) * (0.02 + locomotion * 0.03);
  monster.neck.rotation.x = -0.16 + chaseBlend * 0.18 - roarBlend * 0.22 + Math.sin(elapsed * 2.1 + monster.phase) * 0.04;
  monster.head.rotation.x = -0.02 + chaseBlend * 0.14 - roarBlend * 0.38 + Math.sin(elapsed * 2.8 + monster.phase) * 0.05;
  monster.head.rotation.y = Math.sin(elapsed * (roarBlend > 0 ? 5.2 : 1.2) + monster.phase) * (roarBlend > 0 ? 0.12 : 0.05);
  monster.jaw.rotation.x = jawOpen;

  const armReach = chaseBlend > 0 ? 1 : roarBlend > 0 ? 0.82 : 0;
  const leftArmSwing = -0.88 + armReach * 1.68 + stride * (chaseBlend > 0 ? 0.24 : 0.1);
  const rightArmSwing = -0.88 + armReach * 1.68 - stride * (chaseBlend > 0 ? 0.24 : 0.1);

  monster.leftArm.shoulder.rotation.x = leftArmSwing;
  monster.rightArm.shoulder.rotation.x = rightArmSwing;
  monster.leftArm.shoulder.rotation.z = -0.22 - roarBlend * 0.22 - chaseBlend * 0.28;
  monster.rightArm.shoulder.rotation.z = 0.22 + roarBlend * 0.22 + chaseBlend * 0.28;
  monster.leftArm.elbow.rotation.x = -0.32 - armReach * 0.56 - Math.abs(stride) * 0.16;
  monster.rightArm.elbow.rotation.x = -0.32 - armReach * 0.56 - Math.abs(stride) * 0.16;
  monster.leftArm.wrist.rotation.x = 0.42 + armReach * 0.34 + Math.sin(elapsed * 7 + monster.phase) * 0.08;
  monster.rightArm.wrist.rotation.x = 0.42 + armReach * 0.34 - Math.sin(elapsed * 7 + monster.phase) * 0.08;

  for (const finger of monster.leftArm.fingers) {
    finger.rotation.x = 0.18 + chaseBlend * 0.58 + roarBlend * 0.14;
  }
  for (const finger of monster.rightArm.fingers) {
    finger.rotation.x = 0.18 + chaseBlend * 0.58 + roarBlend * 0.14;
  }

  monster.leftLeg.hip.rotation.x = stride * 0.42;
  monster.rightLeg.hip.rotation.x = -stride * 0.42;
  monster.leftLeg.knee.rotation.x = 0.2 + Math.abs(stride) * 0.3;
  monster.rightLeg.knee.rotation.x = 0.2 + Math.abs(stride) * 0.3;
}

function updateSnailMonsterRig(snail, elapsed) {
  const investigateBlend = snail.state === "investigate" ? 1 : 0;
  const rushBlend = snail.state === "rush" ? 1 : 0;
  const locomotion = rushBlend > 0 ? 1 : investigateBlend > 0 ? 0.58 : 0.22;
  const crawl = elapsed * (0.72 + snail.speed * 0.08) + snail.phase;
  const wave = Math.sin(crawl * 1.8);
  const headLift = 0.08 + locomotion * 0.46 + Math.sin(crawl * 1.4) * 0.06;

  snail.rig.position.y = Math.abs(Math.sin(crawl * 1.25)) * (0.05 + locomotion * 0.1);
  snail.body.rotation.z = Math.sin(crawl * 0.8) * 0.02;
  snail.head.position.y = 2 + headLift;
  snail.head.rotation.x = -0.08 + locomotion * 0.18 + Math.sin(crawl * 1.3) * 0.04;
  snail.head.rotation.y = Math.sin(crawl * 0.9) * (rushBlend > 0 ? 0.06 : 0.12);
  snail.mouth.rotation.x = 0.1 + locomotion * 0.28 + Math.abs(Math.sin(crawl * 2.4)) * 0.12;
  snail.shellRoot.rotation.z = Math.sin(crawl * 0.55) * 0.05;
  snail.shellRoot.rotation.x = 0.08 + Math.cos(crawl * 0.72) * 0.04;

  snail.tentacles[0].rotation.x = 0.22 + wave * 0.16 + locomotion * 0.08;
  snail.tentacles[1].rotation.x = 0.22 - wave * 0.16 + locomotion * 0.08;
  snail.tentacles[0].rotation.z = -0.18 + Math.sin(crawl * 1.2) * 0.08;
  snail.tentacles[1].rotation.z = 0.18 - Math.sin(crawl * 1.2) * 0.08;
}

function updateForestMonster(delta, elapsed) {
  const monster = ensureForestMonster();
  if (!network.joined || !isPlayerInForest()) {
    monster.group.visible = false;
    monster.state = "hidden";
    monster.spawnReady = false;
    return;
  }

  if (!monster.spawnReady || !isWorldPositionInForest(monster.group.position)) {
    if (!placeForestMonster(monster)) {
      return;
    }
    monster.state = "roam";
    monster.stateTime = 0;
    monster.didRoar = false;
  }

  monster.group.visible = true;
  monster.stateTime += delta;

  const now = performance.now();
  const headPosition = monster.head.getWorldPosition(tempWorldPositionA);
  const toPlayer = tempWorldPositionB.copy(flyer.position).sub(headPosition);
  const playerDistance = toPlayer.length();
  const monsterForward = getForwardVector(monster.head, tempWorldPositionC);
  const hasCover = hasVisibilityBlockerBetween(headPosition, flyer.position, 0.18);
  const seesPlayer = playerDistance < 54
    && Math.abs(flyer.position.y - headPosition.y) < 18
    && monsterForward.dot(toPlayer.normalize()) > 0.68
    && !hasCover
    && now > forestState.deathUntil;

  if (seesPlayer) {
    monster.lastSeenPlayer.copy(flyer.position);
    monster.playerSeenAt = now;
    if (monster.state !== "roar" && monster.state !== "chase") {
      monster.state = "roar";
      monster.stateTime = 0;
      monster.didRoar = false;
    }
  } else if (forestState.alertExpiresAt > now && monster.state !== "chase" && monster.state !== "roar") {
    monster.state = "investigate";
    monster.investigateTarget = forestState.alertPosition.clone();
  }

  if (monster.state === "roar") {
    monster.speed = 0;
    triggerFearShake(0.92);
    if (!monster.didRoar) {
      playMonsterRoar(headPosition);
      monster.didRoar = true;
    }
    if (monster.stateTime > 0.42) {
      monster.state = "chase";
      monster.stateTime = 0;
    }
  } else if (monster.state === "chase") {
    monster.lastSeenPlayer.copy(flyer.position);
    moveForestMonster(monster, monster.lastSeenPlayer, delta, 33, 0.8);
    const catchDistance = Math.hypot(
      flyer.position.x - monster.group.position.x,
      flyer.position.z - monster.group.position.z
    );
    const verticalCatchDelta = Math.abs(flyer.position.y - monster.group.position.y);
    triggerFearShake(Math.max(0.12, 0.42 - playerDistance * 0.006));

    if (catchDistance < 2.7 && verticalCatchDelta < 4.8 && now - monster.lastKillAt > 1800) {
      monster.lastKillAt = now;
      respawnPlayer();
      monster.state = "roam";
      monster.stateTime = 0;
      placeForestMonster(monster, 28, 70);
    } else if (now - monster.playerSeenAt > 4200) {
      monster.state = "investigate";
      monster.investigateTarget = monster.lastSeenPlayer.clone();
      monster.stateTime = 0;
    }
  } else if (monster.state === "investigate" && monster.investigateTarget) {
    const distance = moveForestMonster(monster, monster.investigateTarget, delta, 10.5, 1.8);
    if (distance < 3 || forestState.alertExpiresAt <= now) {
      monster.state = "roam";
      monster.stateTime = 0;
      monster.investigateTarget = null;
    }
  } else {
    if (!monster.roamTarget || monster.group.position.distanceTo(monster.roamTarget) < 4) {
      const nextPoint = sampleLoadedForestPoint(monster.rand, 20, 74);
      if (nextPoint) {
        monster.roamTarget.copy(nextPoint);
      }
    }

    if (monster.roamTarget) {
      moveForestMonster(monster, monster.roamTarget, delta, 5.6, 2.6);
    } else {
      monster.speed = 0;
    }
  }

  updateForestMonsterRig(monster, elapsed);
}

function updateSnailMonster(delta, elapsed) {
  const snail = ensureSnailMonster();
  if (!network.joined || !isPlayerInForest()) {
    snail.group.visible = false;
    snail.state = "hidden";
    snail.spawnReady = false;
    return;
  }

  if (!snail.spawnReady || !isWorldPositionInForest(snail.group.position)) {
    if (!placeSnailMonster(snail)) {
      return;
    }
    snail.state = "roam";
    snail.stateTime = 0;
  }

  snail.group.visible = true;
  snail.stateTime += delta;

  const now = performance.now();
  const noiseActive = forestState.noiseExpiresAt > now;
  const strongNoise = noiseActive && forestState.noiseIntensity >= 0.72;

  if (noiseActive) {
    snail.lastHeardPosition.copy(forestState.noisePosition);
    if (strongNoise) {
      if (snail.state !== "rush") {
        snail.state = "rush";
        snail.stateTime = 0;
      }
      snail.investigateTarget = snail.lastHeardPosition.clone();
    } else if (snail.state !== "rush") {
      if (snail.state !== "investigate") {
        snail.state = "investigate";
        snail.stateTime = 0;
      }
      snail.investigateTarget = snail.lastHeardPosition.clone();
    }
  } else if ((forestState.alertExpiresAt > now || snail.state === "investigate") && snail.state !== "rush" && snail.investigateTarget) {
    snail.state = "investigate";
  }

  if (snail.state === "rush" && !noiseActive && snail.stateTime > 3.2) {
    snail.state = "investigate";
    snail.stateTime = 0;
    snail.investigateTarget = snail.lastHeardPosition.clone();
  }

  if (snail.state === "rush") {
    if (noiseActive) {
      snail.investigateTarget = snail.lastHeardPosition.clone();
    }
    moveSnailMonster(snail, snail.investigateTarget || snail.lastHeardPosition, delta, 22, 2.2);
    triggerFearShake(0.22 + Math.max(0, 0.42 - Math.hypot(flyer.position.x - snail.group.position.x, flyer.position.z - snail.group.position.z) * 0.004));

    const catchDistance = Math.hypot(flyer.position.x - snail.group.position.x, flyer.position.z - snail.group.position.z);
    const verticalCatchDelta = Math.abs(flyer.position.y - snail.group.position.y);
    if (catchDistance < 5.8 && verticalCatchDelta < 8 && now - snail.lastTeleportAt > 2400) {
      snail.lastTeleportAt = now;
      const teleportState = sampleWorldSpawnState(snail.rand);
      applyLocalSpawnState(teleportState);
      triggerFearShake(0.88);
      snail.state = "roam";
      snail.stateTime = 0;
      placeSnailMonster(snail, 90, 220);
      syncSessionNow(false);
    }
  } else if (snail.state === "investigate" && snail.investigateTarget) {
    const distance = moveSnailMonster(snail, snail.investigateTarget, delta, 4.8, 2.5);
    if (distance < 3.2 || !noiseActive) {
      snail.state = "roam";
      snail.stateTime = 0;
      snail.investigateTarget = null;
    }
  } else {
    if (!snail.roamTarget || snail.group.position.distanceTo(snail.roamTarget) < 7) {
      const nextPoint = sampleLoadedForestPoint(
        snail.rand,
        0,
        chunkSize * 2.8,
        (chunk) => chunk.type === "Skyshroud Forest"
      );
      if (nextPoint) {
        snail.roamTarget.copy(nextPoint);
      }
    }
    moveSnailMonster(snail, snail.roamTarget, delta, 2.3, 2.7);
  }

  updateSnailMonsterRig(snail, elapsed);
}

function createForestCanopySheet(parent, x, z, width, depth, y, tiltX = 0, tiltZ = 0) {
  const canopy = new THREE.Mesh(geometries.plane, materials.forestCanopy);
  canopy.position.set(x, y, z);
  canopy.scale.set(width, depth, 1);
  canopy.rotation.set(-Math.PI / 2 + tiltX, 0, tiltZ);
  canopy.castShadow = false;
  canopy.receiveShadow = false;
  parent.add(canopy);
  return canopy;
}

function createPatchBounds(parent, material, minX, maxX, minZ, maxZ, y = 0.02) {
  const width = maxX - minX;
  const depth = maxZ - minZ;
  if (width < 0.2 || depth < 0.2) {
    return;
  }
  createPatch(parent, material, (minX + maxX) * 0.5, (minZ + maxZ) * 0.5, width, depth, y);
}

function createChunkGroundWithSinkhole(chunk, material) {
  const localX = caveLayout.sinkhole.x - chunk.cx * chunkSize;
  const localZ = caveLayout.sinkhole.z - chunk.cz * chunkSize;
  createGroundHolePatch(
    chunk.group,
    material,
    0,
    0,
    chunkSize,
    chunkSize,
    localX,
    localZ,
    caveLayout.sinkhole.radius + 0.22
  );
  createRingPatch(chunk.group, material, localX, localZ, caveLayout.sinkhole.radius + 0.15, caveLayout.sinkhole.radius + 4.8, 0.002, 48);
}

function createChunkBase(chunk, rand) {
  const grassMaterial = rand() > 0.5 ? materials.grassA : materials.grassB;
  if (chunkContainsCaveEntrance(chunk.cx, chunk.cz)) {
    createPatch(chunk.group, grassMaterial, 0, 0, chunkSize, chunkSize, 0);
    return;
  }
  createPatch(chunk.group, grassMaterial, 0, 0, chunkSize, chunkSize, 0);

  createPatch(chunk.group, materials.road, -halfChunk + roadHalfWidth / 2, 0, roadHalfWidth, chunkSize, 0.015);
  createPatch(chunk.group, materials.road, halfChunk - roadHalfWidth / 2, 0, roadHalfWidth, chunkSize, 0.015);
  createPatch(chunk.group, materials.road, 0, -halfChunk + roadHalfWidth / 2, chunkSize, roadHalfWidth, 0.015);
  createPatch(chunk.group, materials.road, 0, halfChunk - roadHalfWidth / 2, chunkSize, roadHalfWidth, 0.015);

  createPatch(chunk.group, materials.sidewalk, -halfChunk + roadHalfWidth + sidewalkWidth / 2, 0, sidewalkWidth, chunkSize - roadHalfWidth * 2, 0.02);
  createPatch(chunk.group, materials.sidewalk, halfChunk - roadHalfWidth - sidewalkWidth / 2, 0, sidewalkWidth, chunkSize - roadHalfWidth * 2, 0.02);
  createPatch(chunk.group, materials.sidewalk, 0, -halfChunk + roadHalfWidth + sidewalkWidth / 2, chunkSize - roadHalfWidth * 2, sidewalkWidth, 0.02);
  createPatch(chunk.group, materials.sidewalk, 0, halfChunk - roadHalfWidth - sidewalkWidth / 2, chunkSize - roadHalfWidth * 2, sidewalkWidth, 0.02);

  for (const [x, z] of [
    [-walkEdge, -walkEdge],
    [walkEdge, -walkEdge],
    [-walkEdge, walkEdge],
    [walkEdge, walkEdge],
  ]) {
    createLamp(chunk.group, x, z);
  }
}

function createForestTree(chunk, rand, x, z, scale = 1) {
  const foliage = pick(rand, [materials.forestFoliageA, materials.forestFoliageB, materials.forestFoliageC]);
  const trunkHeight = (30 + rand() * 20) * scale;
  const trunkRadius = (0.45 + rand() * 0.18) * scale;
  const canopyRadius = (11.4 + rand() * 5.2) * scale;

  createCylinder(chunk.group, materials.bark, x, trunkHeight / 2, z, trunkRadius, trunkHeight, { cast: false });
  createSphere(chunk.group, foliage, x, trunkHeight + canopyRadius * 0.02, z, canopyRadius * 1.14, { cast: false });
  createSphere(chunk.group, foliage, x - canopyRadius * 0.42, trunkHeight - canopyRadius * 0.02, z + canopyRadius * 0.18, canopyRadius * 1.02, { cast: false });
  createSphere(chunk.group, foliage, x + canopyRadius * 0.44, trunkHeight + canopyRadius * 0.01, z - canopyRadius * 0.2, canopyRadius * 1.04, { cast: false });
  createSphere(chunk.group, foliage, x, trunkHeight + canopyRadius * 0.24, z - canopyRadius * 0.08, canopyRadius * 0.98, { cast: false });
  createSphere(chunk.group, foliage, x - canopyRadius * 0.18, trunkHeight + canopyRadius * 0.34, z + canopyRadius * 0.2, canopyRadius * 0.88, { cast: false });
  createSphere(chunk.group, foliage, x + canopyRadius * 0.22, trunkHeight + canopyRadius * 0.36, z - canopyRadius * 0.18, canopyRadius * 0.86, { cast: false });

  const treeColliderWidth = Math.max(trunkRadius * 2.35, canopyRadius * 0.16);
  addCollider(chunk, x, 0, z, treeColliderWidth, trunkHeight + canopyRadius * 0.08, treeColliderWidth);
  chunk.treeAnchors.push(new THREE.Vector3(x, trunkHeight * 0.72, z));
}

function fillForestChunk(chunk, rand) {
  const ringDistance = getChunkRingDistance(chunk.cx, chunk.cz);
  const nearNeighborhood = ringDistance <= neighborhoodChunkRadius + 1;
  chunk.type = nearNeighborhood ? "Forest Verge" : "Skyshroud Forest";

  createPatch(chunk.group, rand() > 0.5 ? materials.forestGroundA : materials.forestGroundB, 0, 0, chunkSize, chunkSize, 0);

  for (let index = 0; index < 6 + Math.floor(rand() * 4); index += 1) {
    createPatch(
      chunk.group,
      rand() > 0.5 ? materials.forestGroundA : materials.forestGroundB,
      (rand() - 0.5) * 44,
      (rand() - 0.5) * 44,
      8 + rand() * 16,
      8 + rand() * 16,
      0.012 + rand() * 0.01
    );
  }

  const treePositions = [];
  const targetTrees = nearNeighborhood ? 19 + Math.floor(rand() * 5) : 24 + Math.floor(rand() * 6);
  const minSpacing = nearNeighborhood ? 5.2 : 4.8;

  for (let attempt = 0; attempt < targetTrees * 12 && treePositions.length < targetTrees; attempt += 1) {
    const tx = (rand() - 0.5) * 66;
    const tz = (rand() - 0.5) * 66;

    if (Math.abs(tx) < 3.2 && Math.abs(tz) < 3.2 && rand() > 0.28) {
      continue;
    }

    const hasNeighbor = treePositions.some((entry) => {
      const dx = entry.x - tx;
      const dz = entry.z - tz;
      return dx * dx + dz * dz < minSpacing * minSpacing;
    });

    if (!hasNeighbor) {
      treePositions.push({ x: tx, z: tz });
    }
  }

  for (const tree of treePositions) {
    createForestTree(chunk, rand, tree.x, tree.z, 1.02 + rand() * 0.48);
    addNoiseZone(chunk, tree.x, tree.z, 2.4, 0.22);
  }

  for (let index = 0; index < 18 + Math.floor(rand() * 8); index += 1) {
    const bushX = (rand() - 0.5) * 60;
    const bushZ = (rand() - 0.5) * 60;
    const bushScale = 0.7 + rand() * 0.8;
    const bushRadius = createForestBush(chunk.group, rand, bushX, bushZ, bushScale);
    addVisibilityBlocker(chunk, bushX, 0, bushZ, bushRadius * 1.5, Math.max(0.95, bushScale * 1.35), bushRadius * 1.5);
    addNoiseZone(chunk, bushX, bushZ, bushRadius * 1.95, 0.38);
  }

  for (let index = 0; index < 15 + Math.floor(rand() * 7); index += 1) {
    const patchX = (rand() - 0.5) * 60;
    const patchZ = (rand() - 0.5) * 60;
    const patchRadius = 1 + rand() * 1.4;
    createForestPlantPatch(chunk.group, rand, patchX, patchZ, patchRadius, 6 + Math.floor(rand() * 5));
    addNoiseZone(chunk, patchX, patchZ, patchRadius * 1.6, 0.24);
  }

  for (let index = 0; index < 5 + Math.floor(rand() * 4); index += 1) {
    createFlowerPatch(chunk.group, (rand() - 0.5) * 54, (rand() - 0.5) * 54, 1.2 + rand() * 1.4, 6 + Math.floor(rand() * 5), rand);
  }

  for (let index = 0; index < 3 + Math.floor(rand() * 3); index += 1) {
    createCylinder(
      chunk.group,
      materials.bark,
      (rand() - 0.5) * 48,
      0.42,
      (rand() - 0.5) * 48,
      0.18 + rand() * 0.12,
      2.8 + rand() * 2.6,
      { rx: Math.PI / 2, ry: rand() * Math.PI * 2, cast: false }
    );
  }

  createForestCanopySheet(chunk.group, 0, 0, 128, 128, 32 + rand() * 3, 0.01, -0.02);
  createForestCanopySheet(chunk.group, -22, -18, 108, 106, 36 + rand() * 3, 0.03, -0.08);
  createForestCanopySheet(chunk.group, 24, 16, 106, 108, 38 + rand() * 3, -0.04, 0.05);
  createForestCanopySheet(chunk.group, 0, -28, 94, 92, 41 + rand() * 2, 0.02, 0.1);
  createForestCanopySheet(chunk.group, -30, 22, 92, 94, 43 + rand() * 3, -0.03, -0.05);
  createForestCanopySheet(chunk.group, 28, -24, 90, 92, 44 + rand() * 3, 0.04, 0.06);

  for (let index = 0; index < 1 + Math.floor(rand() * 2); index += 1) {
    createForestLeafDrift(chunk, rand, (rand() - 0.5) * 22, (rand() - 0.5) * 22, 7 + rand() * 5);
  }

  const dreadRoll = rand();
  if (dreadRoll > 0.75) {
    createFallenLog(chunk.group, rand, (rand() - 0.5) * 38, (rand() - 0.5) * 38, 5 + rand() * 4);
  }
  if (dreadRoll > 0.84) {
    createClothPile(chunk.group, rand, (rand() - 0.5) * 34, (rand() - 0.5) * 34);
  }
  if (dreadRoll > 0.9) {
    createForestCampfire(chunk.group, rand, (rand() - 0.5) * 28, (rand() - 0.5) * 28);
  }
  if (dreadRoll > 0.94) {
    createBrokenMarker(chunk.group, rand, (rand() - 0.5) * 30, (rand() - 0.5) * 30);
  }
  if (dreadRoll > 0.965) {
    createBloodSplatters(chunk.group, rand, (rand() - 0.5) * 24, (rand() - 0.5) * 24, 1.4 + rand(), 7 + Math.floor(rand() * 6));
  }
  if (dreadRoll > 0.982) {
    createBonePile(chunk.group, rand, (rand() - 0.5) * 20, (rand() - 0.5) * 20);
  }
}

function fillResidentialChunk(chunk, rand) {
  chunk.type = "Residential Block";

  const lots = shuffle(rand, [
    [-16, -16],
    [17, -15],
    [-18, 17],
    [16, 16],
  ]);
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
  const civicWall = pick(rand, cityWallMaterials);
  createRetroBox(chunk.group, { wall: civicWall, roof: retroRoofVentMaterial, front: civicWall, back: civicWall }, -12, 5.8, -4, 20, 11.6, 14);
  createBox(chunk.group, materials.trim, -12, 9.8, 3.3, 18, 0.4, 0.45);
  createBox(chunk.group, materials.window, -12, 6.6, 3.2, 16, 4.2, 0.18);
  createBox(chunk.group, retroSigns.police, -12, 10.75, 3.35, 8, 1.05, 0.18);
  createBox(chunk.group, pick(rand, roofMaterials), -12, 12.8, -4, 21.2, 1.5, 15.2);
  addCornerTrim(chunk.group, retroWallDark, -12, 5.8, -4, 20.1, 11.6, 14.1, 0.16);
  addRoofVents(chunk.group, -12, 13.8, -4, 16, 10, rand, 2);
  addCollider(chunk, -12, 0, -4, 19.2, 13.6, 13.4);

  createHedge(chunk.group, 2, 16, 20, 1.1);
  createBench(chunk.group, -10, 14.8, 0);
  createBench(chunk.group, 2, 14.8, 0);
  createCar(chunk.group, 8, -11, 0, rand);
  createCar(chunk.group, 8, -3.8, 0, rand);
  createCar(chunk.group, 8, 3.2, 0, rand);

  for (let index = 0; index < 6; index += 1) {
    const tx = (rand() - 0.5) * 52;
    const tz = (rand() - 0.5) * 52;
    if (tx > -2 || Math.abs(tz) > 10) {
      createTree(chunk, rand, tx, tz, 0.7 + rand() * 0.5);
    }
  }
}

function fillApartmentChunk(chunk, rand) {
  chunk.type = "Apartment Court";

  createApartmentBlock(chunk, rand, -5, -4);
  createPool(chunk.group, 14, 10, 10, 6);
  createPatch(chunk.group, materials.asphaltLot, 13, -12, 18, 16, 0.025);
  createCar(chunk.group, 8, -15, 0, rand);
  createCar(chunk.group, 15, -15, 0, rand);
  createCar(chunk.group, 20, -9, Math.PI / 2, rand);
  createBusStop(chunk.group, -17, 16, 0);
  createHedge(chunk.group, 0, 18, 20, 1.1);

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
  createBusStop(chunk.group, -2, 15.8, Math.PI);
  createBench(chunk.group, 10, 16, 0);
  createCar(chunk.group, -6, -17, 0, rand);
  createCar(chunk.group, 1, -17, 0, rand);
  createCar(chunk.group, 8, -17, 0, rand);
  createFlowerPatch(chunk.group, 14, 18, 2.5, 8, rand);

  for (let index = 0; index < 4; index += 1) {
    const tx = (rand() - 0.5) * 46;
    const tz = (rand() - 0.5) * 46;
    if (Math.abs(tx) > 10 || Math.abs(tz) > 10) {
      createTree(chunk, rand, tx, tz, 0.75 + rand() * 0.4);
    }
  }
}

function createCityChunkBase(chunk, rand) {
  createPatch(chunk.group, materials.asphaltLot, 0, 0, chunkSize, chunkSize, 0);

  createPatch(chunk.group, materials.road, -halfChunk + roadHalfWidth / 2, 0, roadHalfWidth, chunkSize, 0.015);
  createPatch(chunk.group, materials.road, halfChunk - roadHalfWidth / 2, 0, roadHalfWidth, chunkSize, 0.015);
  createPatch(chunk.group, materials.road, 0, -halfChunk + roadHalfWidth / 2, chunkSize, roadHalfWidth, 0.015);
  createPatch(chunk.group, materials.road, 0, halfChunk - roadHalfWidth / 2, chunkSize, roadHalfWidth, 0.015);

  createPatch(chunk.group, materials.sidewalk, -halfChunk + roadHalfWidth + sidewalkWidth / 2, 0, sidewalkWidth, chunkSize - roadHalfWidth * 2, 0.02);
  createPatch(chunk.group, materials.sidewalk, halfChunk - roadHalfWidth - sidewalkWidth / 2, 0, sidewalkWidth, chunkSize - roadHalfWidth * 2, 0.02);
  createPatch(chunk.group, materials.sidewalk, 0, -halfChunk + roadHalfWidth + sidewalkWidth / 2, chunkSize - roadHalfWidth * 2, sidewalkWidth, 0.02);
  createPatch(chunk.group, materials.sidewalk, 0, halfChunk - roadHalfWidth - sidewalkWidth / 2, chunkSize - roadHalfWidth * 2, sidewalkWidth, 0.02);

  for (const z of [-roadHalfWidth / 2, roadHalfWidth / 2]) {
    for (let x = -30; x <= 30; x += 12) {
      createRoadStripe(chunk.group, x, z, 4.2, 0.24);
    }
  }
  for (const x of [-roadHalfWidth / 2, roadHalfWidth / 2]) {
    for (let z = -30; z <= 30; z += 12) {
      createRoadStripe(chunk.group, x, z, 0.24, 4.2);
    }
  }

  for (const [x, z] of [
    [-walkEdge, -walkEdge],
    [walkEdge, -walkEdge],
    [-walkEdge, walkEdge],
    [walkEdge, walkEdge],
  ]) {
    createLamp(chunk.group, x, z);
  }
}

function fillCityConnectorChunk(chunk, rand) {
  chunk.type = "Commuter Tunnel";
  createPatch(chunk.group, materials.asphaltLot, 0, 0, chunkSize, chunkSize, 0);

  const alongX = cityDirection.x !== 0;
  const tunnelRoofSpan = 39.2;
  if (alongX) {
    createPatch(chunk.group, materials.road, 0, 0, chunkSize, 18, 0.02);
    createPatch(chunk.group, materials.sidewalk, 0, -13.5, chunkSize, 7, 0.03);
    createPatch(chunk.group, materials.sidewalk, 0, 13.5, chunkSize, 7, 0.03);
    createBox(chunk.group, materials.caveRockDark, 0, 5.2, -18, chunkSize, 10.4, 2.8, { cast: false });
    createBox(chunk.group, materials.caveRockDark, 0, 5.2, 18, chunkSize, 10.4, 2.8, { cast: false });
    createBox(chunk.group, retroSigns.warning, -18, 5.9, -16.54, 7.5, 1.4, 0.14, { cast: false, receive: false });
    createBox(chunk.group, retroSigns.warning, 18, 5.9, 16.54, 7.5, 1.4, 0.14, { ry: Math.PI, cast: false, receive: false });
    addCollider(chunk, 0, 0, -18, chunkSize, 10.8, 2.8);
    addCollider(chunk, 0, 0, 18, chunkSize, 10.8, 2.8);
    for (let x = -28; x <= 28; x += 14) {
      createRoadStripe(chunk.group, x, 0, 5.5, 0.28);
      createLamp(chunk.group, x, -12);
      createLamp(chunk.group, x, 12);
    }
  } else {
    createPatch(chunk.group, materials.road, 0, 0, 18, chunkSize, 0.02);
    createPatch(chunk.group, materials.sidewalk, -13.5, 0, 7, chunkSize, 0.03);
    createPatch(chunk.group, materials.sidewalk, 13.5, 0, 7, chunkSize, 0.03);
    createBox(chunk.group, materials.caveRockDark, -18, 5.2, 0, 2.8, 10.4, chunkSize, { cast: false });
    createBox(chunk.group, materials.caveRockDark, 18, 5.2, 0, 2.8, 10.4, chunkSize, { cast: false });
    createBox(chunk.group, retroSigns.warning, -16.54, 5.9, -18, 0.14, 1.4, 7.5, { ry: Math.PI / 2, cast: false, receive: false });
    createBox(chunk.group, retroSigns.warning, 16.54, 5.9, 18, 0.14, 1.4, 7.5, { ry: -Math.PI / 2, cast: false, receive: false });
    addCollider(chunk, -18, 0, 0, 2.8, 10.8, chunkSize);
    addCollider(chunk, 18, 0, 0, 2.8, 10.8, chunkSize);
    for (let z = -28; z <= 28; z += 14) {
      createRoadStripe(chunk.group, 0, z, 0.28, 5.5);
      createLamp(chunk.group, -12, z);
      createLamp(chunk.group, 12, z);
    }
  }

  createBox(
    chunk.group,
    materials.caveRockDark,
    0,
    10.4,
    0,
    alongX ? chunkSize : tunnelRoofSpan,
    0.7,
    alongX ? tunnelRoofSpan : chunkSize,
    { cast: false }
  );
  addCollider(
    chunk,
    0,
    10,
    0,
    alongX ? chunkSize : tunnelRoofSpan,
    0.9,
    alongX ? tunnelRoofSpan : chunkSize
  );
}

function fillDowntownChunk(chunk, rand) {
  chunk.type = "Downtown Towers";
  createCityChunkBase(chunk, rand);
  createUrbanTower(chunk, rand, -16, -14, { width: 16 + rand() * 4, depth: 15 + rand() * 4, floors: 10 + Math.floor(rand() * 5) });
  createUrbanTower(chunk, rand, 15, 15, { width: 13 + rand() * 4, depth: 13 + rand() * 4, floors: 8 + Math.floor(rand() * 5) });
  createPatch(chunk.group, materials.sidewalk, 0, 0, 18, 18, 0.03);
  createBench(chunk.group, -10, 0, Math.PI / 2);
  createBench(chunk.group, 10, 0, -Math.PI / 2);
  createStreetTrash(chunk.group, rand, 3, -9, 2);
}

function fillBankChunk(chunk, rand) {
  chunk.type = "Bank Plaza";
  createCityChunkBase(chunk, rand);
  createBankBuilding(chunk, rand, -12, -10, 0);
  createUrbanTower(chunk, rand, 17, 12, { width: 14, depth: 14, floors: 9 + Math.floor(rand() * 4) });
  createLimo(chunk.group, 0, -17, 0, rand, { driver: false });
  createDumpster(chunk.group, 19, -19, Math.PI / 2);
  createStreetTrash(chunk.group, rand, 15, -12, 1.8);
}

function fillHotelChunk(chunk, rand) {
  chunk.type = "Hotel Row";
  createCityChunkBase(chunk, rand);
  createHotelBuilding(chunk, rand, -14, -8, 0);
  createStorefrontRow(chunk, rand, 14, 12, Math.PI);
  createCityBus(chunk.group, 0, 17, 0, rand, { driver: false });
  createBusStop(chunk.group, -1, 15.8, Math.PI);
  createStreetTrash(chunk.group, rand, 11, -13, 2.4);
}

function fillCityApartmentChunk(chunk, rand) {
  chunk.type = "Highrise Apartments";
  createCityChunkBase(chunk, rand);
  createUrbanTower(chunk, rand, -16, -12, { width: 16, depth: 14, floors: 8 + Math.floor(rand() * 3) });
  createUrbanTower(chunk, rand, 14, 14, { width: 12 + rand() * 3, depth: 12 + rand() * 3, floors: 7 + Math.floor(rand() * 3) });
  createPatch(chunk.group, materials.asphaltLot, 15, -15, 18, 12, 0.025);
  createCar(chunk.group, 10, -15, 0, rand);
  createCar(chunk.group, 17, -15, 0, rand);
  createDumpster(chunk.group, -19, 18, 0);
  createStreetTrash(chunk.group, rand, -17, 11, 2);
}

function fillCommercialChunk(chunk, rand) {
  chunk.type = "Commercial Strip";
  createCityChunkBase(chunk, rand);
  createStorefrontRow(chunk, rand, -14, -10, 0);
  createStorefrontRow(chunk, rand, 14, 12, Math.PI);
  createUrbanTower(chunk, rand, 16, -14, { width: 12, depth: 12, floors: 7 + Math.floor(rand() * 4) });
  createCityTruck(chunk.group, -16, 17, 0, rand, { driver: false });
  createBusStop(chunk.group, 0, 16, Math.PI);
  createStreetTrash(chunk.group, rand, -2, -16, 2.6);
}

function populateForestAnimals(chunk, rand) {
  const birdCount = 1;
  for (let index = 0; index < birdCount; index += 1) {
    createBird(chunk, rand);
  }

  const cicadaCount = 1;
  for (let index = 0; index < cicadaCount; index += 1) {
    createCicada(chunk, rand);
  }

  const antCount = rand() > 0.45 ? 1 : 0;
  for (let index = 0; index < antCount; index += 1) {
    createAntColony(chunk, rand);
  }

  if (rand() > 0.45) {
    createWorm(chunk, rand);
  }

  if (rand() > 0.58) {
    createOwl(chunk, rand);
  }

  const commonMammals = shuffle(rand, [createFox, createWolf, createDeer, createPorcupine]);
  const mammalCount = 1 + Math.floor(rand() * 2);
  for (let index = 0; index < mammalCount; index += 1) {
    const createAnimal = commonMammals[index % commonMammals.length];
    createAnimal(chunk, rand);
  }

  if (rand() > 0.84) {
    pick(rand, [createBear, createMoose])(chunk, rand);
  }
}

function populateLife(chunk, rand) {
  const isForestChunk = chunk.type === "Skyshroud Forest" || chunk.type === "Forest Verge";
  if (isForestChunk) {
    populateForestAnimals(chunk, rand);
    return;
  }

  const isCityChunk = chunk.region === "city";
  const isCityConnector = chunk.region === "cityConnector";
  if (isCityConnector) {
    return;
  }

  if (isCityChunk) {
    const walkerCount = chunk.type === "Downtown Towers"
      ? 10
      : chunk.type === "Commercial Strip"
        ? 12
        : chunk.type === "Hotel Row"
          ? 9
          : chunk.type === "Bank Plaza"
            ? 8
            : 7;

    for (let index = 0; index < walkerCount; index += 1) {
      const variant = chunk.type === "Bank Plaza" || (chunk.type === "Downtown Towers" && rand() > 0.45)
        ? "suit"
        : "casual";
      createWalker(chunk, rand, {
        variant,
        edge: walkEdge,
        innerEdge: walkEdge - 1.2,
        speedMin: 2.4,
        speedRange: 1.8,
      });
    }

    const homelessCount = chunk.type === "Commercial Strip" || chunk.type === "Highrise Apartments" ? 2 : 1;
    const homelessSpots = [
      [-walkEdge + 1.6, -18],
      [walkEdge - 1.6, 18],
      [-18, walkEdge - 1.4],
      [18, -walkEdge + 1.4],
    ];
    for (let index = 0; index < homelessCount; index += 1) {
      const [x, z] = homelessSpots[(index + Math.floor(rand() * homelessSpots.length)) % homelessSpots.length];
      createHomelessPerson(chunk, rand, x + (rand() - 0.5) * 1.1, z + (rand() - 0.5) * 1.1, rand() * Math.PI * 2);
    }

    const trafficCount = chunk.type === "Downtown Towers"
      ? 8
      : chunk.type === "Commercial Strip"
        ? 7
        : 6;

    for (let index = 0; index < trafficCount; index += 1) {
      createCityTrafficVehicle(chunk, rand);
    }
    return;
  }

  if (chunk.type === "Cave Entrance") {
    createBird(chunk, rand);
    return;
  }

  const walkers = isForestChunk
    ? 0
    : chunk.type === "Park Loop"
      ? 3
      : chunk.type === "Civic Corner" || chunk.type === "Neighborhood Shops"
        ? 4
        : chunk.type === "Apartment Court"
          ? 3
          : 2 + Math.floor(rand() * 2);

  for (let index = 0; index < walkers; index += 1) {
    createWalker(chunk, rand);
  }

  const birdCount = 1 + Math.floor(rand() * 2);
  for (let index = 0; index < birdCount; index += 1) {
    createBird(chunk, rand);
  }

  const butterflyAnchors = chunk.treeAnchors.length > 0 ? shuffle(rand, chunk.treeAnchors) : [new THREE.Vector3(0, 1.6, 0)];
  const butterflyCount = Math.min(4, 1 + Math.floor(rand() * 4));
  for (let index = 0; index < butterflyCount; index += 1) {
    createButterfly(chunk, rand, butterflyAnchors[index % butterflyAnchors.length]);
  }

  if (chunk.treeAnchors.length > 0) {
    const squirrelCount = 1;
    for (let index = 0; index < squirrelCount; index += 1) {
      createSquirrel(chunk, rand, butterflyAnchors[index % butterflyAnchors.length]);
    }
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
  const region = getChunkRegion(cx, cz);
  const chunk = {
    cx,
    cz,
    region,
    type: "Residential Block",
    group: new THREE.Group(),
    actors: [],
    colliders: [],
    visibilityBlockers: [],
    noiseZones: [],
    treeAnchors: [],
  };

  chunk.group.position.set(cx * chunkSize, 0, cz * chunkSize);
  scene.add(chunk.group);

  if (region === "forest") {
    fillForestChunk(chunk, rand);
  } else if (region === "cityConnector") {
    fillCityConnectorChunk(chunk, rand);
  } else if (region === "city") {
    const roll = rand();
    if (roll < 0.24) {
      fillDowntownChunk(chunk, rand);
    } else if (roll < 0.42) {
      fillBankChunk(chunk, rand);
    } else if (roll < 0.58) {
      fillHotelChunk(chunk, rand);
    } else if (roll < 0.78) {
      fillCityApartmentChunk(chunk, rand);
    } else {
      fillCommercialChunk(chunk, rand);
    }
  } else {
    createChunkBase(chunk, rand);

    if (chunkContainsCaveEntrance(cx, cz)) {
      chunk.type = "Cave Entrance";
    } else {
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
    }
  }

  populateLife(chunk, rand);
  chunks.set(`${cx},${cz}`, chunk);
}

function queueChunkBuild(cx, cz, centerX = currentChunkX, centerZ = currentChunkZ) {
  const key = `${cx},${cz}`;
  if (chunks.has(key) || pendingChunkKeys.has(key)) {
    return;
  }

  pendingChunkKeys.add(key);
  chunkBuildQueue.push({
    key,
    cx,
    cz,
    priority: (cx - centerX) ** 2 + (cz - centerZ) ** 2,
  });
}

function trimChunkBuildQueue(neededKeys, centerX = currentChunkX, centerZ = currentChunkZ) {
  chunkBuildQueue = chunkBuildQueue
    .filter((entry) => {
      const keep = neededKeys.has(entry.key) && !chunks.has(entry.key);
      if (!keep) {
        pendingChunkKeys.delete(entry.key);
      }
      return keep;
    })
    .map((entry) => ({
      ...entry,
      priority: (entry.cx - centerX) ** 2 + (entry.cz - centerZ) ** 2,
    }))
    .sort((a, b) => a.priority - b.priority);
}

function refreshWorldStats(centerX = currentChunkX, centerZ = currentChunkZ) {
  if (isPlayerInCave()) {
    lastKnownDistrict = getCaveDistrictLabel(flyer.position);
  } else {
    const currentChunk = chunks.get(`${centerX},${centerZ}`);
    if (currentChunk) {
      lastKnownDistrict = currentChunk.type;
    } else {
      lastKnownDistrict = getRegionFallbackLabel(getChunkRegion(centerX, centerZ));
    }
  }
  activeLifeCount = [...chunks.values()].reduce((sum, chunk) => sum + chunk.actors.length, 0) + caveState.worms.length;
}

function drainChunkBuildQueue() {
  if (chunkBuildQueue.length === 0) {
    return;
  }

  const start = performance.now();
  let builtCount = 0;

  while (
    chunkBuildQueue.length > 0 &&
    builtCount < chunkBuildsPerFrame &&
    performance.now() - start < chunkBuildBudgetMs
  ) {
    const next = chunkBuildQueue.shift();
    pendingChunkKeys.delete(next.key);

    if (!chunks.has(next.key)) {
      createChunk(next.cx, next.cz);
      builtCount += 1;
    }
  }

  if (builtCount > 0) {
    refreshWorldStats();
  }
}

function removeChunk(chunk) {
  scene.remove(chunk.group);
  chunk.group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
}

function getChunkCoord(value) {
  return Math.floor((value + chunkSize / 2) / chunkSize);
}

function syncChunks() {
  const centerX = getChunkCoord(flyer.position.x);
  const centerZ = getChunkCoord(flyer.position.z);

  currentChunkX = centerX;
  currentChunkZ = centerZ;

  const needed = new Set();

  for (let dz = -renderRadius; dz <= renderRadius; dz += 1) {
    for (let dx = -renderRadius; dx <= renderRadius; dx += 1) {
      const cx = centerX + dx;
      const cz = centerZ + dz;
      if (getChunkRegion(cx, cz) === "outside") {
        continue;
      }
      const key = `${cx},${cz}`;
      needed.add(key);

      if (!chunks.has(key)) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) <= immediateChunkRadius) {
          createChunk(cx, cz);
        } else {
          queueChunkBuild(cx, cz, centerX, centerZ);
        }
      }
    }
  }

  trimChunkBuildQueue(needed, centerX, centerZ);

  for (const [key, chunk] of chunks) {
    if (!needed.has(key)) {
      removeChunk(chunk);
      chunks.delete(key);
    }
  }

  refreshWorldStats(centerX, centerZ);
}

function resolveCollisionBoxes(position, boxes) {
  let collided = false;

  for (const box of boxes) {
    const minX = box.min.x - flyRadius;
    const maxX = box.max.x + flyRadius;
    const minY = box.min.y - flyRadius;
    const maxY = box.max.y + flyRadius;
    const minZ = box.min.z - flyRadius;
    const maxZ = box.max.z + flyRadius;

    if (
      position.x <= minX ||
      position.x >= maxX ||
      position.y <= minY ||
      position.y >= maxY ||
      position.z <= minZ ||
      position.z >= maxZ
    ) {
      continue;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const pushX = position.x < centerX ? minX - position.x : maxX - position.x;
    const pushY = position.y < centerY ? minY - position.y : maxY - position.y;
    const pushZ = position.z < centerZ ? minZ - position.z : maxZ - position.z;

    const absX = Math.abs(pushX);
    const absY = Math.abs(pushY);
    const absZ = Math.abs(pushZ);

    if (absX <= absY && absX <= absZ) {
      position.x += pushX;
    } else if (absY <= absZ) {
      position.y += pushY;
    } else {
      position.z += pushZ;
    }
    collided = true;
  }

  return collided;
}

function resolveCollisions(position) {
  const baseChunkX = getChunkCoord(position.x);
  const baseChunkZ = getChunkCoord(position.z);
  let collided = false;

  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const chunk = chunks.get(`${baseChunkX + dx},${baseChunkZ + dz}`);
      if (chunk) {
        collided = resolveCollisionBoxes(position, chunk.colliders) || collided;
      }
    }
  }

  if (isWithinCaveBounds(position, 18) || isWithinCaveAccess(position, 6)) {
    collided = resolveCollisionBoxes(position, caveState.colliders) || collided;
    collided = resolveCollisionBoxes(position, caveState.worms.map((worm) => worm.collider)) || collided;
  }

  return collided;
}

function updateFlight(delta, elapsed) {
  fearShake = Math.max(0, fearShake - delta * 0.42);
  fearPulse += delta * (18 + fearShake * 26);

  if (!network.joined || !pointerLocked) {
    stamina = Math.min(maxStamina, stamina + staminaRegenPerSecond * delta);
    sprintBlend = THREE.MathUtils.lerp(sprintBlend, 0, 6 * delta);
    camera.position.set(0, 0, 0);
    camera.rotation.set(pitch, yaw, roll);
    velocity.multiplyScalar(Math.exp(-4 * delta));
    return;
  }

  desiredMove.set(0, 0, 0);

  if (keys.has("KeyW")) {
    desiredMove.z -= 1;
  }
  if (keys.has("KeyS")) {
    desiredMove.z += 1;
  }
  if (keys.has("KeyA")) {
    desiredMove.x -= 1;
  }
  if (keys.has("KeyD")) {
    desiredMove.x += 1;
  }

  const moving = desiredMove.lengthSq() > 0;
  const sprintRequested = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const wantsSprint = sprintRequested && moving && (stamina > 18 || sprinting);
  sprinting = wantsSprint;

  if (sprinting) {
    stamina = Math.max(0, stamina - sprintDrainPerSecond * delta);
    if (stamina === 0) {
      sprinting = false;
    }
  } else {
    stamina = Math.min(maxStamina, stamina + staminaRegenPerSecond * delta);
  }

  sprintBlend = THREE.MathUtils.lerp(sprintBlend, sprinting ? 1 : 0, 6 * delta);

  const boost = sprinting;
  const acceleration = boost ? 60 : 24;
  const drag = Math.exp(-2.4 * delta);
  velocity.multiplyScalar(drag);

  if (moving) {
    desiredMove.normalize();

    forward.set(0, 0, -1).applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
    right.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    collisionPush
      .set(0, 0, 0)
      .addScaledVector(forward, -desiredMove.z)
      .addScaledVector(right, desiredMove.x);

    if (collisionPush.lengthSq() > 0) {
      collisionPush.normalize();
      velocity.addScaledVector(collisionPush, acceleration * delta);
    }
  }

  const maxSpeed = boost ? 36 : 16;
  velocity.clampLength(0, maxSpeed);

  nextPosition.copy(flyer.position).addScaledVector(velocity, delta);
  const caveAccessible = isWithinCaveAccess(nextPosition, 1.2) || isWorldPositionInCave(nextPosition);
  const minY = caveAccessible ? caveLayout.bounds.minY : 1.2;
  nextPosition.y = THREE.MathUtils.clamp(nextPosition.y, minY, 48);

  const tunnelSegment = getTunnelSegmentForPosition(nextPosition, 0.18);
  if (tunnelSegment) {
    nextPosition.y = THREE.MathUtils.lerp(nextPosition.y, tunnelSegment.centerY, 0.74);
    if (tunnelSegment.axis === "x") {
      nextPosition.z = THREE.MathUtils.lerp(nextPosition.z, tunnelSegment.centerZ, 0.18);
    } else {
      nextPosition.x = THREE.MathUtils.lerp(nextPosition.x, tunnelSegment.centerX, 0.18);
    }
  }

  const collided = resolveCollisions(nextPosition);

  if (!caveAccessible && nextPosition.y <= 1.21) {
    nextPosition.y = 1.2;
    velocity.y = Math.max(velocity.y, 0);
  }

  if (nextPosition.distanceToSquared(flyer.position) < 0.00001 && velocity.lengthSq() > 0.001) {
    velocity.multiplyScalar(0.6);
  }

  flyer.position.copy(nextPosition);
  if (tryUseCavePortal(flyer.position)) {
    camera.position.set(0, 0, 0);
    camera.rotation.set(pitch, yaw, roll);
    return;
  }

  shakeTime += delta * (12 + velocity.length() * 0.6 + sprintBlend * 18);
  const shakeStrength = 0.0038 + sprintBlend * 0.026 + fearShake * 0.028;
  const shakeX = (Math.sin(shakeTime * 2.8) + Math.sin(fearPulse * 3.4) * fearShake * 0.85) * shakeStrength * 0.8;
  const shakeY = (Math.cos(shakeTime * 4.4) + Math.cos(fearPulse * 4.8) * fearShake * 0.72) * shakeStrength * 0.65;
  const shakePitch = (Math.sin(shakeTime * 5.1) + Math.sin(fearPulse * 6.2) * fearShake * 0.76) * shakeStrength * 0.7;
  const shakeYaw = (Math.cos(shakeTime * 3.9) + Math.cos(fearPulse * 5.3) * fearShake * 0.42) * shakeStrength * 0.35;
  const shakeRoll = (Math.sin(shakeTime * 6.4) + Math.sin(fearPulse * 7.1) * fearShake) * shakeStrength * 1.25;

  roll = THREE.MathUtils.lerp(
    roll,
    THREE.MathUtils.clamp(-desiredMove.x * 0.16 + Math.sin(elapsed * 34) * 0.012, -0.22, 0.22),
    4 * delta
  );
  camera.position.set(shakeX, shakeY, -0.02 - sprintBlend * 0.04);
  camera.rotation.set(pitch + shakePitch, yaw + shakeYaw, roll + shakeRoll);
}

function updateActors(delta, elapsed) {
  for (const cloud of cloudActors) {
    cloud.update(elapsed);
  }

  for (const chunk of chunks.values()) {
    for (const actor of chunk.actors) {
      actor.update(delta, elapsed);
    }
  }

  updateCaveActors(delta, elapsed);
  updateForestMonster(delta, elapsed);
}

function updateRemotePlayerViews(delta, elapsed) {
  for (const remote of network.remotePlayers.values()) {
    remote.group.position.lerp(remote.targetPosition, 4 * delta);
    remote.group.position.y += Math.sin(elapsed * 9 + remote.bobPhase) * 0.02;
    remote.group.rotation.y = THREE.MathUtils.lerp(remote.group.rotation.y, remote.targetYaw, 5 * delta);
    remote.rig.rotation.x = Math.sin(elapsed * 4.2 + remote.bobPhase) * 0.08;
    remote.rig.rotation.z = Math.sin(elapsed * 5.6 + remote.bobPhase) * 0.06;

    const flap = Math.sin(elapsed * 22 + remote.bobPhase) * 1.05;
    remote.wings[0].rotation.z = 0.44 + flap;
    remote.wings[1].rotation.z = -0.44 - flap;
  }
}

function updateHud() {
  const staminaPercent = (stamina / maxStamina) * 100;
  const districtName = isPlayerInCave() ? getCaveDistrictLabel(flyer.position) : lastKnownDistrict;

  districtEl.textContent = districtName;
  speedEl.textContent = velocity.length().toFixed(1);
  altitudeEl.textContent = flyer.position.y.toFixed(1);
  lifeCountEl.textContent = `${activeLifeCount} active`;
  staminaLabelEl.textContent = `${Math.round(staminaPercent)}%`;
  staminaFillEl.style.width = `${staminaPercent}%`;
  staminaFillEl.classList.toggle("is-low", staminaPercent < 30);

  if (!network.joined) {
    setStatus("In menu");
  } else if (performance.now() < forestState.deathUntil) {
    setStatus("Respawning");
  } else if (forestState.monster?.state === "chase") {
    setStatus("Hunted");
  } else if (!pointerLocked) {
    setStatus("Click Enter Flight");
  } else if (sprinting) {
    setStatus("Sprinting");
  } else if (staminaPercent < 20) {
    setStatus("Recovering");
  } else {
    setStatus("Flying");
  }

  if (!sessionPanel.classList.contains("is-hidden")) {
    updateMapPicker();
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  const chunkX = getChunkCoord(flyer.position.x);
  const chunkZ = getChunkCoord(flyer.position.z);

  if (chunkX !== currentChunkX || chunkZ !== currentChunkZ) {
    syncChunks();
  }

  updateAtmosphere(delta);
  updateBodyLight(delta);
  drainChunkBuildQueue();
  updateFlight(delta, elapsed);
  updateActors(delta, elapsed);
  updateRemotePlayerViews(delta, elapsed);
  updateHud();
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

function requestFlight() {
  if (!network.joined) {
    setMenuStatus("Join or create a server before entering flight.", true);
    showMenu("servers");
    return;
  }
  getForestAudioContext();
  renderer.domElement.requestPointerLock();
}

async function runSmokeTest() {
  if (!smokeTestMode) {
    return;
  }

  const lines = [`mode=${smokeTestMode}`];
  const pushLine = (line) => {
    lines.push(line);
    setSmokeTestState("running", lines);
  };

  try {
    const smokeParams = new URLSearchParams(window.location.search);
    const smokeLobbyName = smokeParams.get("lobbyName") || "Smoke Test Lobby";
    displayNameInput.value = "SmokeFly";
    getSavedDisplayName();
    menuPlayButton.click();
    await waitForUiCondition(() => network.menuView === "servers", 4000, "server browser");
    pushLine("opened-server-browser");

    if (
      smokeTestMode === "create-public-leave" ||
      smokeTestMode === "create-public-hold" ||
      smokeTestMode === "create-private-leave"
    ) {
      const privateCode = normalizeCode(smokeParams.get("privateCode") || "TEST42");
      openCreateButton.click();
      await waitForUiCondition(() => network.menuView === "create", 4000, "create menu");
      createLobbyNameInput.value = smokeLobbyName;
      if (smokeTestMode === "create-private-leave") {
        visibilityPrivateButton.click();
        createCodeInput.value = privateCode;
      } else {
        visibilityPublicButton.click();
      }
      createLobbyButton.click();
      await waitForUiCondition(() => network.joined && Boolean(network.lobby), 8000, "create and join");
      pushLine(`created=${network.lobby.id}`);
      pushLine(`visibility=${network.lobby.visibility}`);
      pushLine(`spawn=${flyer.position.x.toFixed(1)},${flyer.position.y.toFixed(1)},${flyer.position.z.toFixed(1)}`);
      if (smokeTestMode === "create-private-leave") {
        pushLine(`code=${network.lobby.code}`);
        await leaveCurrentLobby();
        await waitForUiCondition(() => !network.joined, 4000, "leave after private create");
        pushLine("left-created-private-lobby");
      } else if (smokeTestMode === "create-public-leave") {
        await leaveCurrentLobby();
        await waitForUiCondition(() => !network.joined, 4000, "leave after create");
        pushLine("left-created-lobby");
      } else {
        for (let index = 0; index < 8; index += 1) {
          const snapshot = await apiRequest("/heartbeat", {
            playerToken: network.playerToken,
            state: buildPlayerStatePayload(),
          }, "POST");
          applyLobbySnapshot(snapshot);
          await sleep(1000);
        }
        pushLine("held-created-lobby");
      }
    } else if (smokeTestMode === "join-public-leave") {
      const targetLobbyId = smokeParams.get("targetLobbyId");
      const targetLobbyName = smokeParams.get("targetLobbyName");
      let joinButton = null;

      for (let index = 0; index < 10; index += 1) {
        const lobbies = await refreshPublicServers(true);
        pushLine(`lobbies=${lobbies.map((lobby) => lobby.name).join("|") || "none"}`);
        joinButton = [...publicServerListEl.querySelectorAll("button")].find((button) => {
          const idMatches = !targetLobbyId || button.dataset.lobbyId === targetLobbyId;
          const nameMatches = !targetLobbyName || button.dataset.lobbyName === targetLobbyName;
          return idMatches && nameMatches && !button.disabled && button.textContent.trim() === "Join";
        });

        if (joinButton) {
          break;
        }

        await sleep(1000);
      }

      if (!joinButton) {
        throw new Error("public server row timed out.");
      }

      joinButton?.click();
      await waitForUiCondition(() => network.joined && Boolean(network.lobby), 8000, "join public lobby");
      pushLine(`joined=${network.lobby.id}`);
      pushLine(`spawn=${flyer.position.x.toFixed(1)},${flyer.position.y.toFixed(1)},${flyer.position.z.toFixed(1)}`);
      await leaveCurrentLobby();
      await waitForUiCondition(() => !network.joined, 4000, "leave after join");
      pushLine("left-joined-lobby");
    } else if (smokeTestMode === "join-private-leave") {
      const targetCode = normalizeCode(smokeParams.get("targetCode") || "");
      joinCodeInput.value = targetCode;
      await sleep(600);
      joinCodeButton.click();
      await waitForUiCondition(() => network.joined && Boolean(network.lobby), 8000, "join private lobby");
      pushLine(`joined=${network.lobby.id}`);
      pushLine(`code=${network.lobby.code}`);
      pushLine(`spawn=${flyer.position.x.toFixed(1)},${flyer.position.y.toFixed(1)},${flyer.position.z.toFixed(1)}`);
      await leaveCurrentLobby();
      await waitForUiCondition(() => !network.joined, 4000, "leave after private join");
      pushLine("left-joined-private-lobby");
    } else {
      throw new Error(`Unknown smoke test mode: ${smokeTestMode}`);
    }

    setSmokeTestState("passed", [...lines, "result=passed"]);
  } catch (error) {
    setSmokeTestState("failed", [...lines, `result=failed`, `error=${error.message}`]);
  }
}

async function handleRefreshServers() {
  setPendingAction("refresh");

  try {
    await refreshPublicServers();
  } finally {
    setPendingAction("");
  }
}

function sendBackgroundKeepalive() {
  if (!network.playerToken) {
    return;
  }

  const payload = JSON.stringify({
    playerToken: network.playerToken,
    state: buildPlayerStatePayload(),
    color: network.playerColor,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `${apiBase}/heartbeat`,
      new Blob([payload], { type: "application/json" })
    );
    return;
  }

  fetch(`${apiBase}/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

async function restoreStoredSession() {
  if (smokeTestMode) {
    return false;
  }

  const stored = readStoredSession();
  if (!stored?.playerToken) {
    return false;
  }

  try {
    network.playerToken = stored.playerToken;
    if (stored.displayName) {
      network.displayName = stored.displayName;
      displayNameInput.value = stored.displayName;
    }

    const snapshot = await apiRequest(buildSessionQuery(stored.playerToken));
    applyLobbySnapshot(snapshot, { syncLocalPlayer: true });
    stopBrowserRefresh();
    hideMenu();
    startHeartbeatLoop(true);
    setMenuStatus("Reconnected to your last server.");
    return true;
  } catch {
    network.playerToken = "";
    clearStoredSession();
    return false;
  }
}

menuPlayButton.addEventListener("click", () => {
  getForestAudioContext();
  setMenuView("servers");
  if (Date.now() - network.lastPublicRefreshAt > 1200) {
    refreshPublicServers();
  }
  startBrowserRefresh();
});

menuBackHomeButton.addEventListener("click", () => {
  setMenuView("home");
  setMenuStatus("");
});

menuBackBrowserButton.addEventListener("click", () => {
  setMenuView("servers");
  setMenuStatus("");
});

openCreateButton.addEventListener("click", () => {
  createLobbyNameInput.value = `${getSavedDisplayName()}'s Lobby`;
  setMenuView("create");
  setMenuStatus("");
});

refreshServersButton.addEventListener("click", () => {
  handleRefreshServers();
});

joinCodeButton.addEventListener("click", () => {
  joinPrivateLobby();
});

createLobbyButton.addEventListener("click", () => {
  createLobbyAndJoin();
});

visibilityPublicButton.addEventListener("click", () => {
  setVisibilityMode("public");
});

visibilityPrivateButton.addEventListener("click", () => {
  setVisibilityMode("private");
});

displayNameInput.addEventListener("change", () => {
  getSavedDisplayName();
});

joinCodeInput.addEventListener("input", () => {
  joinCodeInput.value = normalizeCode(joinCodeInput.value);
});

createCodeInput.addEventListener("input", () => {
  createCodeInput.value = normalizeCode(createCodeInput.value);
});

joinCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    joinPrivateLobby();
  }
});

createCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    createLobbyAndJoin();
  }
});

createLobbyNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    createLobbyAndJoin();
  }
});

enterFlightButton.addEventListener("click", requestFlight);
copyServerCodeButton.addEventListener("click", async () => {
  if (!network.lobby?.code) {
    return;
  }

  try {
    await copyTextToClipboard(network.lobby.code);
    clearCopyFeedback();
    network.copiedCode = true;
    updateUiInteractivity();
    network.codeCopyTimer = window.setTimeout(() => {
      network.copiedCode = false;
      network.codeCopyTimer = null;
      updateUiInteractivity();
    }, 1600);
  } catch (error) {
    setMenuStatus(error.message, true);
  }
});
leaveServerButton.addEventListener("click", () => {
  leaveCurrentLobby();
});
mapNeighborhoodButton.addEventListener("click", () => {
  teleportToMap("neighborhood");
});
mapForestButton.addEventListener("click", () => {
  teleportToMap("forest");
});
mapCityButton.addEventListener("click", () => {
  teleportToMap("city");
});
mapCaveButton.addEventListener("click", () => {
  teleportToMap("cave");
});

renderer.domElement.addEventListener("click", () => {
  getForestAudioContext();
  if (network.joined && !pointerLocked) {
    requestFlight();
  }
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
  document.body.classList.toggle("is-locked", pointerLocked);
  sessionPanel.classList.toggle("is-hidden", pointerLocked || !network.joined);
  sprinting = false;
  updateHud();
});

document.addEventListener("mousemove", (event) => {
  if (!pointerLocked) {
    return;
  }

  yaw -= event.movementX * 0.0022;
  pitch -= event.movementY * 0.0017;
  pitch = THREE.MathUtils.clamp(pitch, -1.18, 1.18);
});

window.addEventListener("keydown", (event) => {
  getForestAudioContext();
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  keys.add(event.code);

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "KeyR" && network.joined) {
    flyer.position.set(0, 3.8, 0);
    velocity.set(0, 0, 0);
    yaw = 0;
    pitch = -0.1;
    roll = 0;
    syncChunks();
  }

  if (event.code === "Tab" && network.joined && pointerLocked) {
    event.preventDefault();
    document.exitPointerLock?.();
  }

  if (event.code === "Escape" && network.joined && !pointerLocked) {
    sessionPanel.classList.remove("is-hidden");
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("blur", () => {
  keys.clear();
});

window.addEventListener("visibilitychange", () => {
  if (!network.playerToken) {
    return;
  }

  if (document.visibilityState === "hidden") {
    sendBackgroundKeepalive();
  } else {
    syncSessionNow(false);
  }
});

window.addEventListener("focus", () => {
  if (network.playerToken) {
    syncSessionNow(false);
  }
});

window.addEventListener("online", () => {
  if (network.playerToken) {
    syncSessionNow(false);
  }
});

window.addEventListener("beforeunload", () => {
  if (!network.playerToken) {
    return;
  }

  sendBackgroundKeepalive();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

for (let index = 0; index < 12; index += 1) {
  createCloud(index);
}

setVisibilityMode("public");
showMenu("home");
renderPlayerColorPicker();
setPlayerColor(network.playerColor, false);
startBrowserRefresh();
refreshPublicServers(true);
initializeCaveSystem();
syncChunks();
resetSessionUi();
updateHud();
setStatus("In menu");
updateUiInteractivity();
restoreStoredSession().finally(() => {
  runSmokeTest();
});
window.requestAnimationFrame(animate);
