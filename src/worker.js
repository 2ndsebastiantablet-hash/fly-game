import { LobbyDirectory } from "./lobby.js";
import { GameRoom } from "./room.js";
export { LobbyDirectory, GameRoom };

const LOBBY = "global";
const ok = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const clean = (v, f, m = 32) => (String(v || "").trim() || f).slice(0, m);
const read = async r => { try { return await r.json(); } catch { return {}; } };