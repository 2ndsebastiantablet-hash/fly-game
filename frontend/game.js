import { ungzip } from "https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.esm.mjs";

const bundlePath = new URL("./game.bundle.b64", import.meta.url);
const loaderDiagnostics = {
  loaderVersion: "2026-04-11-debug-bundle-fix",
  fetchUrl: bundlePath.href,
  fetchStatus: "not-started",
  rawTextLength: null,
  normalizedLength: null,
  normalizedMod4: null,
  tailPreview: null,
  decodedByteLength: null,
  first8Bytes: null,
  hasGzipMagic: null,
  failureStage: null,
};

function normalizeBase64Payload(rawText, response) {
  const strippedBom = rawText.replace(/^\uFEFF/, "").trim();
  const contentType = response.headers.get("content-type") || "";

  if (!strippedBom) {
    throw new Error("Game bundle was empty.");
  }

  if (/text\/html/i.test(contentType) || /<!doctype html/i.test(strippedBom) || /<html/i.test(strippedBom)) {
    throw new Error("Game bundle request returned HTML instead of the bundle file.");
  }

  const clean = strippedBom.replace(/[^A-Za-z0-9+/=]/g, "");
  if (!clean) {
    throw new Error("Game bundle did not contain decodable base64 data.");
  }

  return clean;
}

function describeThrownValue(error) {
  if (error instanceof Error) {
    return error.message || error.name || "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error === undefined) {
    return "undefined";
  }

  if (error === null) {
    return "null";
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function captureByteDiagnostics(bytes) {
  loaderDiagnostics.decodedByteLength = bytes.length;
  loaderDiagnostics.first8Bytes = Array.from(bytes.slice(0, 8))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join(" ");
  loaderDiagnostics.hasGzipMagic = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

function formatDiagnostics() {
  return [
    `loaderVersion: ${loaderDiagnostics.loaderVersion}`,
    `fetchUrl: ${loaderDiagnostics.fetchUrl}`,
    `fetchStatus: ${loaderDiagnostics.fetchStatus}`,
    `rawTextLength: ${loaderDiagnostics.rawTextLength ?? "n/a"}`,
    `normalizedLength: ${loaderDiagnostics.normalizedLength ?? "n/a"}`,
    `normalizedMod4: ${loaderDiagnostics.normalizedMod4 ?? "n/a"}`,
    `tailPreview: ${loaderDiagnostics.tailPreview ?? "n/a"}`,
    `decodedByteLength: ${loaderDiagnostics.decodedByteLength ?? "n/a"}`,
    `first8Bytes: ${loaderDiagnostics.first8Bytes ?? "n/a"}`,
    `hasGzipMagic: ${loaderDiagnostics.hasGzipMagic ?? "n/a"}`,
    `failureStage: ${loaderDiagnostics.failureStage ?? "none"}`,
  ].join("\n");
}

async function decodeBase64ToBytes(base64Text) {
  loaderDiagnostics.failureStage = "decodeBase64ToBytes";
  const sanitized = base64Text.replace(/\s+/g, "").replace(/=+$/, "");
  loaderDiagnostics.normalizedMod4 = sanitized.length % 4;
  loaderDiagnostics.tailPreview = sanitized.slice(-24);

  if (loaderDiagnostics.normalizedMod4 === 1) {
    throw new Error("Hosted game bundle is malformed or truncated: normalized base64 length has remainder 1.");
  }

  const padded = sanitized.padEnd(Math.ceil(sanitized.length / 4) * 4, "=");
  const dataUrl = `data:application/gzip;base64,${padded}`;

  try {
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error(`Data URL decode failed (${response.status})`);
    }

    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    throw new Error(`Game bundle base64 decode failed: ${describeThrownValue(error)}`);
  }
}

function unpackGameBundle(compressedBytes) {
  loaderDiagnostics.failureStage = "unpackGameBundle";
  captureByteDiagnostics(compressedBytes);
  if (compressedBytes.length < 2 || compressedBytes[0] !== 0x1f || compressedBytes[1] !== 0x8b) {
    throw new Error(`Decoded bundle is not valid gzip data. First bytes: ${loaderDiagnostics.first8Bytes || "empty"}`);
  }

  try {
    return ungzip(compressedBytes, { to: "string" });
  } catch (error) {
    throw new Error(`Failed to unpack game bundle at frontend/game.js:119: ${describeThrownValue(error)}`);
  }
}

async function loadBundleSource() {
  loaderDiagnostics.failureStage = "loadBundleSource.fetch";
  const response = await fetch(bundlePath, { cache: "no-store" });
  loaderDiagnostics.fetchStatus = `${response.status} ${response.statusText}`.trim();
  if (!response.ok) {
    throw new Error(`Failed to load game bundle (${response.status})`);
  }

  loaderDiagnostics.failureStage = "loadBundleSource.readText";
  const rawText = await response.text();
  loaderDiagnostics.rawTextLength = rawText.length;
  loaderDiagnostics.failureStage = "loadBundleSource.normalize";
  const encoded = normalizeBase64Payload(rawText, response);
  loaderDiagnostics.normalizedLength = encoded.length;
  const compressedBytes = await decodeBase64ToBytes(encoded);
  return unpackGameBundle(compressedBytes);
}

async function boot() {
  const source = await loadBundleSource();
  const moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));

  try {
    await import(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}

boot().catch((error) => {
  console.error(error);
  const pre = document.createElement("pre");
  const stack = error instanceof Error && error.stack ? `\n\nStack:\n${error.stack}` : "";
  pre.textContent = `Flys World failed to load.\n\n${describeThrownValue(error)}\n\nDiagnostics:\n${formatDiagnostics()}${stack}`;
  pre.style.position = "fixed";
  pre.style.inset = "24px";
  pre.style.padding = "16px";
  pre.style.background = "rgba(10, 17, 13, 0.92)";
  pre.style.color = "#f5fff8";
  pre.style.border = "1px solid rgba(255,255,255,0.15)";
  pre.style.borderRadius = "16px";
  pre.style.zIndex = "9999";
  document.body.appendChild(pre);
});
