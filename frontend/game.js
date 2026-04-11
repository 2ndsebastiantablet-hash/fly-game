import { ungzip } from "https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.esm.mjs";

const bundlePartPaths = Array.from({ length: 8 }, (_, index) =>
  new URL(`./game.bundle.part${String(index + 1).padStart(2, "0")}.b64`, import.meta.url)
);

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

function normalizeBase64Payload(rawText) {
  const strippedBom = rawText.replace(/^\uFEFF/, "").trim();
  if (!strippedBom) {
    throw new Error("Game bundle part was empty.");
  }

  const clean = strippedBom.replace(/[^A-Za-z0-9+/=]/g, "");
  if (!clean) {
    throw new Error("Game bundle part did not contain decodable base64 data.");
  }

  return clean;
}

async function fetchBundlePart(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load bundle part ${url.pathname} (${response.status})`);
  }

  return normalizeBase64Payload(await response.text());
}

function decodeBase64ToBytes(base64Text) {
  const sanitized = base64Text.replace(/\s+/g, "").replace(/=+$/, "");
  if (sanitized.length % 4 === 1) {
    throw new Error("Hosted game bundle is malformed or truncated.");
  }

  const padded = sanitized.padEnd(Math.ceil(sanitized.length / 4) * 4, "=");

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index) & 0xff;
    }
    return bytes;
  } catch (error) {
    throw new Error(`Game bundle base64 decode failed: ${describeThrownValue(error)}`);
  }
}

function unpackGameBundle(compressedBytes) {
  if (compressedBytes.length < 2 || compressedBytes[0] !== 0x1f || compressedBytes[1] !== 0x8b) {
    const firstBytes = Array.from(compressedBytes.slice(0, 8))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join(" ");
    throw new Error(`Decoded bundle is not valid gzip data. First bytes: ${firstBytes || "empty"}`);
  }

  try {
    return ungzip(compressedBytes, { to: "string" });
  } catch (error) {
    throw new Error(`Failed to unpack game bundle: ${describeThrownValue(error)}`);
  }
}

async function loadBundleSource() {
  const encodedParts = await Promise.all(bundlePartPaths.map(fetchBundlePart));
  const encoded = encodedParts.join("");
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
  const stack = error instanceof Error && error.stack ? `\n\nStack:\n${error.stack}` : "";
  pre.textContent = `Flys World failed to load.\n\n${describeThrownValue(error)}${stack}`;
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
