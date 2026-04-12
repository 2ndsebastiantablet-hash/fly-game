import { MultiplayerClient } from "../frontend/multiplayer-client.js";

const gameEl = document.querySelector("#game");
const statusEl = document.querySelector("#status");
const lobbyListEl = document.querySelector("#public-lobbies");
const apiBaseInput = document.querySelector("#api-base");
const playerNameInput = document.querySelector("#player-name");
const lobbyNameInput = document.querySelector("#lobby-name");
const lobbyCodeInput = document.querySelector("#lobby-code");

const localPlayer = {
  x: 120,
  y: 120,
  color: "#ff7f63",
};

const keys = new Set();
let client = null;

function ensureClient() {
  if (client && client.apiBase === apiBaseInput.value.trim()) return client;

  client = new MultiplayerClient(apiBaseInput.value.trim(), {
    onSnapshot: renderSnapshot,
    onError: (error) => {
      statusEl.textContent = error.message;
    },
    onClose: () => {
      statusEl.textContent = "Realtime connection closed.";
    },
  });

  return client;
}

function renderSnapshot(snapshot) {
  statusEl.innerHTML = snapshot
    ? `<p><strong>${snapshot.name}</strong> | ${snapshot.playerCount}/${snapshot.maxPlayers} players${snapshot.code ? ` | code: ${snapshot.code}` : ""}</p>`
    : "<p>Not in a lobby.</p>";

  gameEl.innerHTML = "";
  if (!snapshot) return;

  for (const player of snapshot.players) {
    const dot = document.createElement("div");
    dot.className = "player-dot";
    dot.style.left = `${player.state.x || 0}px`;
    dot.style.top = `${player.state.y || 0}px`;
    dot.style.background = player.meta.color || "#7ec8ff";

    const label = document.createElement("div");
    label.className = "label";
    label.style.left = `${player.state.x || 0}px`;
    label.style.top = `${player.state.y || 0}px`;
    label.textContent = `${player.name}${player.isHost ? " (Host)" : ""}`;

    gameEl.appendChild(dot);
    gameEl.appendChild(label);
  }
}

async function refreshPublicLobbies() {
  const activeClient = ensureClient();
  const lobbies = await activeClient.listPublicLobbies();
  lobbyListEl.innerHTML = `
    <h3>Public Lobbies</h3>
    <ul>
      ${
        lobbies.length
          ? lobbies
              .map(
                (lobby) =>
                  `<li>${lobby.name} (${lobby.playerCount}/${lobby.maxPlayers}) <button data-lobby-id="${lobby.lobbyId}">Join</button></li>`,
              )
              .join("")
          : "<li>No public lobbies right now.</li>"
      }
    </ul>
  `;

  lobbyListEl.querySelectorAll("button[data-lobby-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      await activeClient.joinLobbyById({
        lobbyId: button.dataset.lobbyId,
        playerName: playerNameInput.value.trim(),
        playerState: { x: localPlayer.x, y: localPlayer.y },
        playerMeta: { color: localPlayer.color },
      });
    });
  });
}

function moveLoop() {
  const speed = 2.8;
  if (keys.has("arrowleft") || keys.has("a")) localPlayer.x -= speed;
  if (keys.has("arrowright") || keys.has("d")) localPlayer.x += speed;
  if (keys.has("arrowup") || keys.has("w")) localPlayer.y -= speed;
  if (keys.has("arrowdown") || keys.has("s")) localPlayer.y += speed;

  localPlayer.x = Math.max(10, Math.min(gameEl.clientWidth - 10, localPlayer.x));
  localPlayer.y = Math.max(10, Math.min(gameEl.clientHeight - 10, localPlayer.y));

  if (client?.snapshot) {
    client.pushState({ x: localPlayer.x, y: localPlayer.y }, { color: localPlayer.color });
  }

  requestAnimationFrame(moveLoop);
}

document.querySelector("#create-public").addEventListener("click", async () => {
  const activeClient = ensureClient();
  await activeClient.createLobby({
    playerName: playerNameInput.value.trim(),
    lobbyName: lobbyNameInput.value.trim(),
    privateLobby: false,
    maxPlayers: 20,
    playerState: { x: localPlayer.x, y: localPlayer.y },
    playerMeta: { color: localPlayer.color },
  });
});

document.querySelector("#create-private").addEventListener("click", async () => {
  const activeClient = ensureClient();
  await activeClient.createLobby({
    playerName: playerNameInput.value.trim(),
    lobbyName: lobbyNameInput.value.trim(),
    privateLobby: true,
    code: lobbyCodeInput.value.trim(),
    maxPlayers: 20,
    playerState: { x: localPlayer.x, y: localPlayer.y },
    playerMeta: { color: localPlayer.color },
  });
});

document.querySelector("#join-code").addEventListener("click", async () => {
  const activeClient = ensureClient();
  await activeClient.joinLobbyByCode({
    code: lobbyCodeInput.value.trim(),
    playerName: playerNameInput.value.trim(),
    playerState: { x: localPlayer.x, y: localPlayer.y },
    playerMeta: { color: localPlayer.color },
  });
});

document.querySelector("#refresh-lobbies").addEventListener("click", () => {
  refreshPublicLobbies().catch((error) => {
    statusEl.textContent = error.message;
  });
});

document.querySelector("#leave-lobby").addEventListener("click", async () => {
  if (client) await client.leave();
  renderSnapshot(null);
});

window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

const startupClient = ensureClient();
startupClient.restore().catch(() => {});
refreshPublicLobbies().catch(() => {});
moveLoop();
