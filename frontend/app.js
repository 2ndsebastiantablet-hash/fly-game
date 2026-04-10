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
  new THREE.MeshStandardMaterial({ color: 0xefdfcf, roughness: 0.96 }),
  new THREE.MeshStandardMaterial({ color: 0xe4efdb, roughness: 0.96 }),
  new THREE.MeshStandardMaterial({ color: 0xd8e5f4, roughness: 0.96 }),
  new THREE.MeshStandardMaterial({ color: 0xf2d5cf, roughness: 0.96 }),
];

const roofMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x9b5348, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x5f6976, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x6b4739, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x496b52, roughness: 1 }),
];

const carMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xd94f43, roughness: 0.78 }),
  new THREE.MeshStandardMaterial({ color: 0x4b75d3, roughness: 0.78 }),
  new THREE.MeshStandardMaterial({ color: 0xe0b54c, roughness: 0.78 }),
  new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.78 }),
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

const chunkDistricts = [
  { name: "Cedar Blocks", homes: 0.85, trees: 0.4, parkChance: 0.12, civicChance: 0.05 },
  { name: "Playground Loop", homes: 0.72, trees: 0.55, parkChance: 0.18, civicChance: 0.04 },
  { name: "Garden Verge", homes: 0.64, trees: 0.7, parkChance: 0.14, civicChance: 0.06 },
  { name: "Maple Court", homes: 0.78, trees: 0.52, parkChance: 0.1, civicChance: 0.08 },
  { name: "Apartment Court", homes: 0.46, apartments: 0.3, trees: 0.48, parkChance: 0.08, civicChance: 0.12 },
  { name: "Neighborhood Shops", homes: 0.38, shops: 0.28, trees: 0.34, parkChance: 0.06, civicChance: 0.18 },
  { name: "Forest Verge", homes: 0.28, trees: 1.1, parkChance: 0.02, civicChance: 0.02 },
  { name: "Skyshroud Forest", homes: 0, trees: 2.6, parkChance: 0, civicChance: 0 },
  { name: "Cave Entrance", homes: 0, trees: 0.12, parkChance: 0, civicChance: 0 },
  { name: "Sinkhole Tunnels", homes: 0, trees: 0, parkChance: 0, civicChance: 0 },
  { name: "Mother's Cavern", homes: 0, trees: 0, parkChance: 0, civicChance: 0 },
  { name: "Outer Wilderness", homes: 0, trees: 0, parkChance: 0, civicChance: 0 },
];

const districtNameSet = new Set(chunkDistricts.map((entry) => entry.name));
const animalEyes = [];
const caveState = {
  root: new THREE.Group(),
  built: false,
  colliders: [],
  worms: [],
  flyStorms: [],
  glowingRocks: [],
  ambient: [],
  lights: [],
  entranceMarkers: [],
};
scene.add(caveState.root);
const forestState = {
  audioContext: null,
  masterGain: null,
  musicGain: null,
  noiseSources: [],
  plants: [],
  rareProps: [],
  animals: [],
  monster: null,
  cues: [],
  deathUntil: 0,
  deathPulse: 0,
  localPlayerCaught: false,
  noiseEvents: [],
  sightCheckAccumulator: 0,
};
const network = {
  joined: false,
  menuView: "home",
  playerToken: "",
  lobby: null,
  displayName: "Wings",
  playerColor: readStoredPlayerColor(),
  remotePlayers: new Map(),
  heartbeatTimer: null,
  browserRefreshTimer: null,
  pendingAction: "",
  menuMessage: "",
  menuError: false,
  publicLobbies: [],
  lastPublicRefreshAt: 0,
  codeCopyTimer: null,
  copiedCode: false,
};

... omitted for brevity ...

window.requestAnimationFrame(animate);
