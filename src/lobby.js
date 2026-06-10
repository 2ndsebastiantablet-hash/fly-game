const SPEED = 7;
function res(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
async function read(request) {
  try { return await request.json(); } catch { return {}; }
}
function txt(value, fallback, max = 32) {
  const out = String(value ? value : "").trim();
  return (out.length ? out : fallback).slice(0, max);
}
function roomCode(value) { return txt(value, "CODE", 16).toUpperCase(); }

export class Lobby