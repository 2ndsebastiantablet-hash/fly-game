# Reusable Browser Multiplayer Template

This is a beginner-friendly multiplayer starter for future browser games, built for Cloudflare Workers and Durable Objects.

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
  wrangler.toml
```

## What is separated

### Lobby management

`backend/lobby-manager.js`

Handles:

- public lobby listings
- private lobby code lookup
- room creation routing
- join-by-code routing
- lobby summary updates
- Durable Object directory coordination

### Realtime game sync

`backend/realtime-server.js`

Handles:

- one Durable Object per lobby/room
- WebSocket session acceptance
- reconnect grace period
- idle kicking
- host handoff
- live state updates
- chat/custom messages
- rate limiting and validation

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

## Durable Object design

### LobbyDirectory Durable Object

This is the global lobby index.

It keeps track of:

- public lobbies
- private lobby codes
- which room Durable Object belongs to each lobby

### GameRoom Durable Object

This is one room per lobby.

It keeps track of:

- players
- session tokens
- host assignment
- reconnect windows
- idle timeouts
- WebSocket connections
- live state snapshots

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

### 2. Log into Cloudflare

```bash
npx wrangler login
```

### 3. Run the Worker locally

```bash
npm run dev
```

The Worker will usually run on:

```text
http://127.0.0.1:8787
```

### 4. Serve the example frontend

Any static server works. For example:

```bash
python -m http.server 8000
```

Then open:

```text
http://127.0.0.1:8000/multiplayer-template/example/
```

Set the example page API base to:

```text
http://127.0.0.1:8787
```

### 5. Deploy to Cloudflare

```bash
npm run deploy
```

Wrangler will deploy the Worker and the Durable Object bindings defined in `wrangler.toml`.

## Cloudflare deployment notes

Before using this in a new project, update:

- the Worker `name` in `wrangler.toml`
- the migration `tag` when you change Durable Object classes later
- `ALLOWED_ORIGIN` if your frontend is hosted on a different domain

## Environment variables

Configured in `wrangler.toml` under `[vars]`:

- `ALLOWED_ORIGIN`
- `IDLE_TIMEOUT_MS`
- `RECONNECT_GRACE_MS`
- `CLEANUP_INTERVAL_MS`
- `MAX_PLAYERS_PER_LOBBY`

## How to use it in another game

### Backend

Copy `multiplayer-template/backend/` and `multiplayer-template/wrangler.toml` into the new project.

Keep `backend/server.js` as the Worker entry.

### Frontend

Copy `multiplayer-template/frontend/multiplayer-client.js` into the new project and use the client like this:

```js
import { MultiplayerClient } from "./multiplayer-client.js";

const multiplayer = new MultiplayerClient("http://127.0.0.1:8787", {
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

- one Durable Object per room
- not a full authoritative physics engine
- not a database-backed account system
- not a matchmaking service

That makes it great for multiplayer browser prototypes and real small-to-medium lobby games.

For a larger game, the next upgrade would be:

- account identity
- persisted profiles
- richer server simulation loops
- sharded world coordination
- deeper anti-cheat checks
