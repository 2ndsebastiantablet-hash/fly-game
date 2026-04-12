import http from "node:http";
import { WebSocketServer } from "ws";
import { LobbyManager } from "./lobby-manager.js";
import { RealtimeServer } from "./realtime-server.js";
import { defaultAuthority } from "./server-authority.js";

const PORT = Number(process.env.PORT || 8100);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const IDLE_TIMEOUT_MS = Number(process.env.IDLE_TIMEOUT_MS || 50000);
const RECONNECT_GRACE_MS = Number(process.env.RECONNECT_GRACE_MS || 20000);
const CLEANUP_INTERVAL_MS = Number(process.env.CLEANUP_INTERVAL_MS || 5000);
const MAX_PLAYERS_PER_LOBBY = Number(process.env.MAX_PLAYERS_PER_LOBBY || 20);

const authority = defaultAuthority;
const lobbyManager = new LobbyManager({
  maxPlayersPerLobby: MAX_PLAYERS_PER_LOBBY,
  idleTimeoutMs: IDLE_TIMEOUT_MS,
  reconnectGraceMs: RECONNECT_GRACE_MS,
  authority,
});

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && req.url === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        status: "healthy",
        idleTimeoutMs: IDLE_TIMEOUT_MS,
        reconnectGraceMs: RECONNECT_GRACE_MS,
        maxPlayersPerLobby: MAX_PLAYERS_PER_LOBBY,
      });
      return;
    }

    if (req.method === "GET" && req.url === "/api/lobbies/public") {
      sendJson(res, 200, {
        ok: true,
        lobbies: lobbyManager.listPublicLobbies(),
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/lobbies/create") {
      const body = await readJson(req);
      sendJson(res, 200, {
        ok: true,
        ...lobbyManager.createLobby({
          playerName: body.playerName,
          lobbyName: body.lobbyName,
          privateLobby: body.privateLobby,
          code: body.code,
          maxPlayers: body.maxPlayers,
          playerState: body.playerState,
          playerMeta: body.playerMeta,
        }),
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/lobbies/join") {
      const body = await readJson(req);
      sendJson(res, 200, {
        ok: true,
        ...lobbyManager.joinLobby({
          playerName: body.playerName,
          lobbyId: body.lobbyId,
          code: body.code,
          playerState: body.playerState,
          playerMeta: body.playerMeta,
        }),
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/lobbies/restore") {
      const body = await readJson(req);
      sendJson(res, 200, {
        ok: true,
        ...lobbyManager.restoreSession(body.sessionToken),
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/lobbies/leave") {
      const body = await readJson(req);
      const result = lobbyManager.leaveLobby(body.sessionToken, "leave");
      realtime.removeSocket(body.sessionToken);
      if (result.lobby?.lobbyId) realtime.broadcastLobby(result.lobby.lobbyId);
      sendJson(res, 200, { ok: true, ...result });
      return;
    }

    if (req.method === "POST" && req.url === "/api/lobbies/kick") {
      const body = await readJson(req);
      const result = lobbyManager.kickPlayer(body.sessionToken, body.targetPlayerId);
      if (result.lobby?.lobbyId) realtime.broadcastLobby(result.lobby.lobbyId);
      sendJson(res, 200, { ok: true, ...result });
      return;
    }

    if (req.method === "POST" && req.url === "/api/lobbies/close") {
      const body = await readJson(req);
      const { lobby } = lobbyManager.getSession(body.sessionToken);
      realtime.removeSocketsForLobby(lobby);
      sendJson(res, 200, { ok: true, ...lobbyManager.closeLobby(body.sessionToken) });
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found." });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || "Request failed." });
  }
});

const realtime = new RealtimeServer({
  server,
  lobbyManager,
  authority,
  websocketServerClass: WebSocketServer,
});

realtime.setup();

setInterval(() => {
  lobbyManager.cleanupIdlePlayers();
  realtime.pruneMissingSessions();
  for (const lobby of lobbyManager.lobbies.values()) {
    realtime.broadcastLobby(lobby.lobbyId);
  }
}, CLEANUP_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`Reusable multiplayer template server running on http://127.0.0.1:${PORT}`);
});
