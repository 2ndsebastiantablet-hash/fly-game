import { ungzip } from "https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.esm.mjs";

const bundlePath = new URL("./game.bundle.b64", import.meta.url);

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

function decodeBase64ToBytes(base64Text) {
  const sanitized = base64Text.replace(/=+$/, "");
  const padded = sanitized.padEnd(Math.ceil(sanitized.length / 4) * 4, "=");
  const chunkSize = 16384;
  const chunks = [];
  let totalLength = 0;

  for (let index = 0; index < padded.length; index += chunkSize) {
    const chunk = padded.slice(index, index + chunkSize);
    let binary = "";

    try {
      binary = atob(chunk);
    } catch {
      throw new Error("Game bundle base64 decode failed.");
    }

    const bytes = new Uint8Array(binary.length);
    for (let binaryIndex = 0; binaryIndex < binary.length; binaryIndex += 1) {
      bytes[binaryIndex] = binary.charCodeAt(binaryIndex);
    }

    totalLength += bytes.length;
    chunks.push(bytes);
  }

  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function unpackGameBundle(compressedBytes) {
  try {
    const sourceBytes = ungzip(compressedBytes);
    return new TextDecoder().decode(sourceBytes);
  } catch (error) {
    throw new Error(`Failed to unpack game bundle: ${error.message}`);
  }
}

async function loadBundleSource() {
  const response = await fetch(bundlePath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load game bundle (${response.status})`);
  }

  const encoded = normalizeBase64Payload(await response.text(), response);
  const compressedBytes = decodeBase64ToBytes(encoded);
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
  pre.textContent = `Flys World failed to load.\n\n${error.message}`;
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
