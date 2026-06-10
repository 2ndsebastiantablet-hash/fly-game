export class LobbyDirectory {
  fetch() {
    return new Response('lobby');
  }
}

export class GameRoom {
  fetch() {
    return new Response('room');
  }
}

export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};
