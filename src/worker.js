export class LobbyDirectory {
  fetch() {
    const data = JSON.stringify({ ok: true, servers: [] });
    return new Response(data, { headers: { "content-type": "application/json" } });
  }
}

export class GameRoom {
  fetch() {
    const data = JSON.stringify({ ok: false, error: "Room backend pending." });
    return new Response(data, { status: 501, headers: { "content-type": "application/json" } });
  }
}

export default {
  fetch(request, env) {
    const url = new URL(request.url