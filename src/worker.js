export class LobbyDirectory {
  fetch() {
    return new Response(JSON.stringify({ ok: true, servers: [] }), { headers: { "content-type": "application/json" } });
  }
}

export class GameRoom {
  fetch() {
    return new Response(JSON.stringify({ ok: false, error: "Room backend not finished yet." }), { status: 501, headers: { "content-type": "application/json" } });
  }
}

export default {