const LOBBY = "global";
const SIZE = 1800;
const SPEED = 8;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" },
});

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

function clean(value, fallback, max = 32) {
  value = String(value || "").trim();
  return (value || fallback).slice(0, max);
}

function roomStub(env, id) {
  return env.GAME_ROOM.get(env.GAME_ROOM.idFromName(id));
}

function lobbyStub(env) {
  return env.LOBBY_DIRECTORY.get(env.LOBBY_DIRECTORY.idFromName(LOBBY));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/servers") return lobbyStub(env).fetch(request);
    if (url.pathname === "/api/join-private") return lobbyStub(env).fetch(request);
    if (url.pathname === "/api/create-server" && request.method === "POST") {
      const data = await body(request);
      const roomId = crypto.randomUUID();
      const visibility = data.visibility === "private" ? "private" : "public";
      const code = visibility === "private" ? clean(data.code, "CODE", 16).toUpperCase() : "";
      const info = { roomId, name: clean(data.name