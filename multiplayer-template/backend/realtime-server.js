import { TokenBucketRateLimiter } from "./rate-limit.js";
import { safeJsonParse } from "./utils.js";

export class RealtimeServer {
  constructor({ server, lobbyManager, authority, websocketServerClass, reconnectNotice = true }) {
    this.server = server;
    this.lobbyManager = lobbyManager;
    this.authority = authority;
    this.reconnectNotice = reconnectNotice;
    this.sockets = new Map();
    this.rateLimiter = new TokenBucketRateLimiter();
    this.wss = new websocketServerClass({ noServer: true });
  }

  setup() {
    this.server.on("upgrade", (req, socket, head) => {
      if (!req.url.startsWith("/ws")) {
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit("connection", ws, req);
      });
    });

    this.wss.on("connection", (ws) => {
      let sessionToken = null;

      ws.on("message", (raw) => {
        const rawText = String(raw);
        if (rawText.length > 16000) {
          this.send(ws, { type: "error", error: "Message too large." });
          return;
        }

        const message = safeJsonParse(rawText);
        if (!message || typeof message !== "object") {
          this.send(ws, { type: "error", error: "Invalid JSON message." });
          return;
        }

        if (!this.rateLimiter.allow(this.getRateLimitKey(ws, sessionToken), 1)) {
          this.send(ws, { type: "error", error: "Rate limit exceeded." });
          return;
        }

        try {
          if (message.type === "auth") {
            const restored = this.lobbyManager.restoreSession(message.sessionToken);
            sessionToken = restored.sessionToken;

            const previousSocket = this.sockets.get(sessionToken);
            if (previousSocket && previousSocket !== ws) {
              try {
                previousSocket.close();
              } catch {}
            }

            this.sockets.set(sessionToken, ws);
            this.send(ws, {
              type: "auth_ok",
              sessionToken,
              lobby: restored.lobby,
            });
            this.broadcastLobby(restored.lobby.lobbyId);
            return;
          }

          if (!sessionToken) {
            this.send(ws, { type: "error", error: "Authenticate first." });
            return;
          }

          if (message.type === "ping") {
            this.lobbyManager.updatePlayerPresence(sessionToken);
            this.send(ws, { type: "pong", ts: Date.now() });
            return;
          }

          if (message.type === "state_update") {
            if (message.state && typeof message.state !== "object") {
              throw new Error("State update must be an object.");
            }
            if (message.meta && typeof message.meta !== "object") {
              throw new Error("Meta update must be an object.");
            }

            const { lobby } = this.lobbyManager.updatePlayerState(
              sessionToken,
              message.state,
              message.meta,
            );
            this.broadcastLobby(lobby.lobbyId);
            return;
          }

          if (message.type === "chat") {
            const { lobby, player } = this.lobbyManager.getSession(sessionToken);
            this.lobbyManager.updatePlayerPresence(sessionToken);
            const text = String(message.text || "").slice(0, 300);
            if (!text.trim()) throw new Error("Chat message is empty.");

            this.broadcastRaw(lobby, {
              type: "chat",
              from: { playerId: player.playerId, name: player.name },
              text,
              sentAt: Date.now(),
            });
            return;
          }

          if (message.type === "custom") {
            const { lobby, player } = this.lobbyManager.getSession(sessionToken);
            this.lobbyManager.updatePlayerPresence(sessionToken);

            const response = this.authority.onCustomMessage({
              lobby,
              player,
              message,
              sendToPlayer: (payload) => this.send(ws, payload),
              broadcast: (payload) => this.broadcastRaw(lobby, payload),
            });

            if (!response?.handled) {
              throw new Error("Unknown custom message.");
            }
            return;
          }

          throw new Error("Unknown message type.");
        } catch (error) {
          this.send(ws, { type: "error", error: error.message || "Socket request failed." });
        }
      });

      ws.on("close", () => {
        if (!sessionToken) return;
        if (this.sockets.get(sessionToken) === ws) {
          this.sockets.delete(sessionToken);
        }

        try {
          this.lobbyManager.markDisconnected(sessionToken);
          if (this.reconnectNotice) {
            const { lobby, player } = this.lobbyManager.getSession(sessionToken);
            this.broadcastRaw(lobby, {
              type: "player_connection_changed",
              playerId: player.playerId,
              connected: false,
            });
          }
        } catch {}
      });
    });
  }

  removeSocket(sessionToken) {
    const socket = this.sockets.get(sessionToken);
    if (!socket) return;
    try {
      socket.close();
    } catch {}
    this.sockets.delete(sessionToken);
  }

  removeSocketsForLobby(lobby) {
    for (const player of lobby.players.values()) {
      this.removeSocket(player.sessionToken);
    }
  }

  pruneMissingSessions() {
    for (const sessionToken of [...this.sockets.keys()]) {
      if (!this.lobbyManager.sessionToLobby.has(sessionToken)) {
        this.removeSocket(sessionToken);
      }
    }
  }

  getRateLimitKey(ws, sessionToken) {
    if (sessionToken) return `session:${sessionToken}`;
    return `anon:${ws._socket?.remoteAddress || "unknown"}`;
  }

  send(socket, payload) {
    if (!socket || socket.readyState !== 1) return;
    socket.send(JSON.stringify(payload));
  }

  broadcastRaw(lobby, payload) {
    for (const player of lobby.players.values()) {
      const socket = this.sockets.get(player.sessionToken);
      this.send(socket, payload);
    }
  }

  broadcastLobby(lobbyId) {
    const lobby = this.lobbyManager.lobbies.get(lobbyId);
    if (!lobby) return;

    for (const player of lobby.players.values()) {
      const socket = this.sockets.get(player.sessionToken);
      this.send(socket, {
        type: "lobby_snapshot",
        lobby: this.lobbyManager.snapshotLobby(lobby, player.sessionToken),
      });
    }
  }
}
