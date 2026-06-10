export class LobbyDirectory { fetch() { return new Response('ok'); } }
export class GameRoom { fetch() { return new Response('room'); } }
export default { fetch() { return new Response('Last Civilization Standing'); } }
