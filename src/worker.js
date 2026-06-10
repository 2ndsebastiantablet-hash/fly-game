import { LobbyDirectory } from "./lobby.js";
import { GameRoom } from "./room.js";
export { LobbyDirectory, GameRoom };

const LOBBY = "global";
function json(d, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } }); }
async function read(r) { try { return await r.json(); } catch { return {}; } }
function clean(v, f, m = 32) { const t = String(v ? v : "").trim(); return (t ? t : f).slice(