# Reusable Browser Multiplayer Template

This is a beginner-friendly multiplayer starter for future browser games.

It gives you:

- public lobbies
- private lobbies
- lobby codes
- live WebSocket player sync
- reconnect grace period support
- idle cleanup
- host handoff to the next joined player
- rate limiting and message validation
- clear hooks for server-authoritative rules

## Folder layout

```text
multiplayer-template/
  backend/
    lobby-manager.js
    rate-limit.js
    realtime-server.js
    server-authority.js
    server.js
    utils.js
  frontend/
    multiplayer-client.js
  example/
    index.html
    example-game.js
  package.json
```

## What is separated

### Lobby management

`backend/lobby-manager.js`

Handles:

- creating lobbies
- joining by public lobby or private code
- player membership
- host handoff
- idle removal
- reconnect grace period
- empty-lobby deletion

### Realtime game sync

`backend/realtime-server.js`

Handles:

- WebSocket auth
- live player state updates
- chat/custom messages
- per-session rate limiting
- message validation
- broadcasting snapshots

### Server-authoritative hooks

`backend/server-authority.js`

This is where each future game can add rule logic without rewriting the lobby layer.

Hooks included:

- `createInitialPlayerState()`
- `filterClientStateUpdate()`
- `onPlayerJoin()`
- `onPlayerLeave()`
- `onLobbyEmpty()`
- `onBeforeBroadcast()`
- `onCustomMessage()`

## Reconnect grace period

If a player refreshes the page or briefly disconnects, the server does not remove them immediately.

Instead:

1. the socket is marked disconnected
2. their session stays reserved for `RECONNECT_GRACE_MS`
3. if they reconnect in time with the same session token, they keep their spot
4. if they do not reconnect in time, they are removed

## Basic safety features

Included by default:

- max message size guard
- JSON validation
- allowed message-type checks
- token-bucket rate limiting
- host-only kick/close actions

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start the backend

```bash
npm start
```

The server runs on:

```text
http://127.0.0.1:8100
```

### 3. Serve the example frontend

Any static server works. For example:

```bash
python -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/multiplayer-template/example/
```

## Environment variables

- `PORT`
- `ALLOWED_ORIGIN`
- `IDLE_TIMEOUT_MS`
- `RECONNECT_GRACE_MS`
- `CLEANUP_INTERVAL_MS`
- `MAX_PLAYERS_PER_LOBBY`

## How to use it in another game

### Backend

Copy `multiplayer-template/backend/` into the new project and keep `server.js` as your base server.

### Frontend

Copy `multiplayer-template/frontend/multiplayer-client.js` into the new project and use the client like this:

```js
import { MultiplayerClient } from "./multiplayer-client.js";

const multiplayer = new MultiplayerClient("http://127.0.0.1:8100", {
  onSnapshot: (lobby) => {
    console.log("Lobby snapshot:", lobby);
  },
});

await multiplayer.createLobby({
  playerName: "Host",
  lobbyName: "My Lobby",
  privateLobby: false,
  maxPlayers: 20,
  playerState: { x: 0, y: 0 },
  playerMeta: { color: "#ff7f63" },
});

multiplayer.pushState({ x: 120, y: 180 });
```

## Where to put game-specific rules

Edit `backend/server-authority.js`.

That is the right place for:

- spawn rules
- movement caps
- score validation
- inventory checks
- collision approval
- custom game commands

## Honest note

This is a strong reusable base, but it is still:

- single-process
- in-memory
- not database-backed
- not Redis-backed

That makes it great for prototypes and small multiplayer browser games.

For a larger game, the next upgrade would be:

- Redis or database persistence
- multi-instance room coordination
- authoritative simulation loops
- anti-cheat validation per game
