import crypto from "node:crypto";

export function now() {
  return Date.now();
}

export function randomId(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function cleanCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function generateCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
