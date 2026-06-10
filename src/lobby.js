const toText = data => JSON.stringify(data);
function reply(data, status = 200) {
  return new Response(toText(data), { status, headers: { "content-type": "application/json" } });
}
function safeName(value, fallback) {
  const text = String(value ? value : "").trim();
  if (text.length > 0) return text.slice(0, 32);
  return fallback;
}
function key(roomId) { return "room:" + roomId; }

export class LobbyDirectory {
  constructor(state, env) {
    this.state = state;
    this.env = env