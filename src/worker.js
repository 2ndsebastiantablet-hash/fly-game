export class LobbyDirectory {
  fetch() {
    return new Response('{"ok":true,"servers":[]}', { headers: { "content-type": "application/json" } });
  }
}

export class GameRoom {
  fetch() {
    return new Response('{"ok":false,"error":"Room backend pending."}', { status: 501, headers: { "content-type": "application/json" } });
  }
}

export default {
  fetch() {
    return new Response('<!doctype html><title>Last Civilization Standing</title><h1>Last