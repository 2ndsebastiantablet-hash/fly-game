import { LobbyDirectory } from "./lobby.js";
import { GameRoom } from "./room.js";
export { LobbyDirectory, GameRoom };

export default {
  fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/") || path.startsWith("/ws/")) {
      const id = env.LOBBY_DIRECTORY.idFromName("global");
      return env.LOBBY_DIRECTORY.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
