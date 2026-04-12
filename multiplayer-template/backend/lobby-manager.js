import { clamp, cleanCode, generateCode, now, randomId } from "./utils.js";

export class LobbyManager {
  constructor(options = {}) {
    this.maxPlayersPerLobby = Number(options.maxPlayersPerLobby || 20);
    this.idleTimeoutMs = Number(options.idleTimeoutMs || 50000);
    this.reconnectGraceMs = Number(options.reconnectGraceMs || 20000);
    this.authority = options.authority;

    this.lobbies = new Map();
    this.sessionToLobby = new Map();
    this.codeToLobby = new Map();
    this.joinSeq = 0;
  }

  nextJoinSeq() {
    this.joinSeq += 1;
    return this.joinSeq;
  }

  createPlayer({ playerName, state, meta, isHost = false }) {
    return {
      sessionToken: randomId(24),
      playerId: randomId(8),
      name: String(playerName || "Player").trim().slice(0, 24) || "Player",
      joinedSeq: this.nextJoinSeq(),
      joinedAt: now(),
      lastSeen: now(),
      disconnectedAt: null,
      isHost,
      state: state || {},
      meta: meta || {},
    };
  }

  createLobby({ playerName, lobbyName, privateLobby, code, maxPlayers, playerState, playerMeta }) {
    this.cleanupIdlePlayers();

    let finalCode = null;
    if (privateLobby) {
      const requestedCode = cleanCode(code);
      if (requestedCode) {
        if (this.codeToLobby.has(requestedCode)) {
          throw new Error("That lobby code is already in use.");
        }
        finalCode = requestedCode;
      } else {
        do {
          finalCode = generateCode(6);
        } while (this.codeToLobby.has(finalCode));
      }
    }

    const lobby = {
      lobbyId: randomId(12),
      name: String(lobbyName || "Lobby").trim().slice(0, 48) || "Lobby",
      private: Boolean(privateLobby),
      code: finalCode,
      maxPlayers: clamp(Number(maxPlayers || this.maxPlayersPerLobby), 2, this.maxPlayersPerLobby),
      createdAt: now(),
      players: new Map(),
    };

    const initialState =
      playerState && typeof playerState === "object"
        ? playerState
        : this.authority.createInitialPlayerState({ lobby });

    const player = this.createPlayer({
      playerName,
      state: initialState,
      meta: playerMeta,
      isHost: true,
    });

    lobby.players.set(player.sessionToken, player);
    this.lobbies.set(lobby.lobbyId, lobby);
    this.sessionToLobby.set(player.sessionToken, lobby.lobbyId);
    if (lobby.code) this.codeToLobby.set(lobby.code, lobby.lobbyId);

    this.authority.onPlayerJoin({ lobby, player });

    return {
      sessionToken: player.sessionToken,
      lobby: this.snapshotLobby(lobby, player.sessionToken),
    };
  }

  joinLobby({ playerName, lobbyId, code, playerState, playerMeta }) {
    this.cleanupIdlePlayers();

    let lobby = null;
    if (code) {
      const codeLobbyId = this.codeToLobby.get(cleanCode(code));
      if (codeLobbyId) lobby = this.lobbies.get(codeLobbyId);
    } else if (lobbyId) {
      lobby = this.lobbies.get(lobbyId);
    }

    if (!lobby) throw new Error("Lobby not found.");
    if (lobby.players.size >= lobby.maxPlayers) throw new Error("Lobby is full.");

    const initialState =
      playerState && typeof playerState === "object"
        ? playerState
        : this.authority.createInitialPlayerState({ lobby });

    const player = this.createPlayer({
      playerName,
      state: initialState,
      meta: playerMeta,
      isHost: false,
    });

    lobby.players.set(player.sessionToken, player);
    this.sessionToLobby.set(player.sessionToken, lobby.lobbyId);
    this.authority.onPlayerJoin({ lobby, player });

    return {
      sessionToken: player.sessionToken,
      lobby: this.snapshotLobby(lobby, player.sessionToken),
    };
  }

  restoreSession(sessionToken) {
    const { lobby, player } = this.getSession(sessionToken);
    player.lastSeen = now();
    player.disconnectedAt = null;
    return {
      sessionToken,
      lobby: this.snapshotLobby(lobby, sessionToken),
    };
  }

  getSession(sessionToken) {
    const lobbyId = this.sessionToLobby.get(sessionToken);
    if (!lobbyId) throw new Error("Session not found.");
    const lobby = this.lobbies.get(lobbyId);
    const player = lobby?.players.get(sessionToken);
    if (!lobby || !player) throw new Error("Session not found.");
    return { lobby, player };
  }

  updatePlayerPresence(sessionToken) {
    const { player } = this.getSession(sessionToken);
    player.lastSeen = now();
    player.disconnectedAt = null;
  }

  markDisconnected(sessionToken) {
    const { player } = this.getSession(sessionToken);
    player.disconnectedAt = now();
  }

  updatePlayerState(sessionToken, nextState, nextMeta) {
    const { lobby, player } = this.getSession(sessionToken);
    const filtered = this.authority.filterClientStateUpdate({
      lobby,
      player,
      proposedState: nextState,
      proposedMeta: nextMeta,
    });
    player.lastSeen = now();
    player.disconnectedAt = null;
    player.state = filtered.state;
    player.meta = filtered.meta;
    return { lobby, player };
  }

  listPublicLobbies() {
    this.cleanupIdlePlayers();
    return [...this.lobbies.values()]
      .filter((lobby) => !lobby.private)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((lobby) => {
        const players = [...lobby.players.values()].sort((a, b) => a.joinedSeq - b.joinedSeq);
        const host = players.find((player) => player.isHost);
        return {
          lobbyId: lobby.lobbyId,
          name: lobby.name,
          private: false,
          playerCount: players.length,
          maxPlayers: lobby.maxPlayers,
          hostName: host?.name || null,
          createdAt: lobby.createdAt,
        };
      });
  }

  leaveLobby(sessionToken, reason = "leave") {
    const lobbyId = this.sessionToLobby.get(sessionToken);
    if (!lobbyId) return { left: true, ended: false };

    const lobby = this.lobbies.get(lobbyId);
    const player = lobby?.players.get(sessionToken);
    if (!lobby || !player) {
      this.sessionToLobby.delete(sessionToken);
      return { left: true, ended: false };
    }

    lobby.players.delete(sessionToken);
    this.sessionToLobby.delete(sessionToken);
    this.authority.onPlayerLeave({ lobby, player, reason });

    if (lobby.players.size === 0) {
      this.deleteLobby(lobby);
      return { left: true, ended: true };
    }

    if (![...lobby.players.values()].some((entry) => entry.isHost)) {
      this.assignNextHost(lobby);
    }

    return {
      left: true,
      ended: false,
      lobby: this.snapshotLobby(lobby),
    };
  }

  kickPlayer(hostSessionToken, targetPlayerId) {
    const { lobby, player: host } = this.getSession(hostSessionToken);
    if (!host.isHost) throw new Error("Only the host can kick players.");

    const target = [...lobby.players.values()].find((player) => player.playerId === targetPlayerId);
    if (!target) throw new Error("Target player not found.");
    if (target.sessionToken === hostSessionToken) throw new Error("Host cannot kick themselves.");

    return this.leaveLobby(target.sessionToken, "kick");
  }

  closeLobby(hostSessionToken) {
    const { lobby, player: host } = this.getSession(hostSessionToken);
    if (!host.isHost) throw new Error("Only the host can close the lobby.");
    this.deleteLobby(lobby);
    return { closed: true };
  }

  assignNextHost(lobby) {
    const orderedPlayers = [...lobby.players.values()].sort((a, b) => a.joinedSeq - b.joinedSeq);
    for (const player of orderedPlayers) player.isHost = false;
    if (orderedPlayers[0]) orderedPlayers[0].isHost = true;
  }

  deleteLobby(lobby) {
    for (const sessionToken of lobby.players.keys()) {
      this.sessionToLobby.delete(sessionToken);
    }
    if (lobby.code) this.codeToLobby.delete(lobby.code);
    this.lobbies.delete(lobby.lobbyId);
    this.authority.onLobbyEmpty({ lobby });
  }

  snapshotLobby(lobby, yourSessionToken = null) {
    const players = [...lobby.players.values()]
      .sort((a, b) => a.joinedSeq - b.joinedSeq)
      .map((player) => ({
        playerId: player.playerId,
        name: player.name,
        isHost: player.isHost,
        joinedAt: player.joinedAt,
        lastSeen: player.lastSeen,
        disconnectedAt: player.disconnectedAt,
        state: player.state,
        meta: player.meta,
      }));

    const snapshot = {
      lobbyId: lobby.lobbyId,
      name: lobby.name,
      private: lobby.private,
      code: lobby.private ? lobby.code : null,
      maxPlayers: lobby.maxPlayers,
      playerCount: players.length,
      createdAt: lobby.createdAt,
      you: yourSessionToken,
      players,
    };

    return this.authority.onBeforeBroadcast({ lobby, snapshot }) || snapshot;
  }

  cleanupIdlePlayers() {
    const currentTime = now();

    for (const lobby of [...this.lobbies.values()]) {
      for (const player of [...lobby.players.values()]) {
        const idleTooLong = currentTime - player.lastSeen > this.idleTimeoutMs;
        const reconnectExpired =
          player.disconnectedAt !== null && currentTime - player.disconnectedAt > this.reconnectGraceMs;

        if (idleTooLong || reconnectExpired) {
          this.leaveLobby(player.sessionToken, idleTooLong ? "idle_timeout" : "reconnect_timeout");
        }
      }
    }
  }
}
