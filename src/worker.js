import { LobbyDirectory } from "./lobby.js";
import { GameRoom } from "./room.js";
export { LobbyDirectory, GameRoom };

const LOBBY = "global";
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
async function read(request) {
  try { return await request.json(); } catch { return {}; }
}
function clean(value, fallback, max) {
  const text = String(value ? value : "").trim();
  return (text ? text : fallback