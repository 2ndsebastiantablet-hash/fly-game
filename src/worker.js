const LOBBY_NAME = "global-lobby-directory";
const WORLD_SIZE = 2400;
const PLAYER_SPEED = 9;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function cleanText(value, fallback, max = 32) {
  const text = String(value || "").trim().replace(/\s+/g, " 