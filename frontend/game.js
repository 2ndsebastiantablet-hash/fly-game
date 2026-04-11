import { ungzip } from "https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.esm.mjs";

const bundlePartPaths = Array.from({ length: 8 }, (_, index) =>
  new URL(`./game.bundle.part${String(index + 1).padStart(2, "0")}.b64`, import.meta.url)
);

const expectedBundleStats = {
  joinedBase64Length: 68500,
  decodedByteLength: 51375,
  first16Bytes: "1f 8b 08 00 00 00 00 00 04 00 ec bd fb 83 1b 37",
  joinedBase64Sha256: "ac44052f2c6f820f124af8db89f35e332dc931e9f5bc550fa5bab5d9ef29a795",
  decodedBytesSha256: "ce3db126aa168123f28f9384990fde05cdeefe4baf503c7383482094cf436dfc",
};

const runtimeDiagnostics = {
  failureStage: "init",
  joinedBase64Length: null,
  decodedByteLength: null,
  first16Bytes: null,
  hasGzipMagic: null,
  normalizedMod4: null,
  joinedBase64Sha256: null,
  decodedBytesSha256: null,
  partFetches: [],
};

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

function formatDiagnostics() {
  const lines = [
    `joinedBase64Length: ${runtimeDiagnostics.joinedBase64Length ?? "unknown"}`,
    `expectedJoinedBase64Length: ${expectedBundleStats.joinedBase64Length}`,
    `decodedByteLength: ${runtimeDiagnostics.decodedByteLength ?? "unknown"}`,
    `expectedDecodedByteLength: ${expectedBundleStats.decodedByteLength}`,
    `first16Bytes: ${runtimeDiagnostics.first16Bytes ?? "unknown"}`,
    `expectedFirst16Bytes: ${expectedBundleStats.first16Bytes}`,
    `hasGzipMagic: ${runtimeDiagnostics.hasGzipMagic ?? "unknown"}`,
    `normalizedMod4: ${runtimeDiagnostics.normalizedMod4 ?? "unknown"}`,
    `joinedBase64Sha256: ${runtimeDiagnostics.joinedBase64Sha256 ?? "pending"}`,
    `expectedJoinedBase64Sha256: ${expectedBundleStats.joinedBase64Sha256}`,
    `decodedBytesSha256: ${runtimeDiagnostics.decodedBytesSha256 ?? "pending"}`,
    `expectedDecodedBytesSha256: ${expectedBundleStats.decodedBytesSha256}`,
    `failureStage: ${runtimeDiagnostics.failureStage}`,
  ];

  if (runtimeDiagnostics.partFetches.length) {
    lines.push(`partFetches: ${runtimeDiagnostics.partFetches.join(", ")}`);
  }

  return lines.join("\n");
}

async function sha256Hex(input) {
  if (!globalThis.crypto?.subtle) {
    return "unavailable";
  }

  const data =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);

  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
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

async function fetchBundlePart(url, index) {
  runtimeDiagnostics.failureStage = `fetchBundlePart:${index + 1}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    runtimeDiagnostics.partFetches[index] = `p${String(index + 1).padStart(2, "0")}:${response.status}:0`;
    throw new Error(`Failed to load bundle part ${url.pathname} (${response.status})`);
  }

  const rawText = await response.text();
  const normalized = normalizeBase64Payload(rawText);
  runtimeDiagnostics.partFetches[index] = `p${String(index + 1).padStart(2, "0")}:${response.status}:${normalized.length}`;
  return normalized;
}

function decodeBase64Char(code, offset) {
  if (code >= 65 && code <= 90) {
    return code - 65;
  }
  if (code >= 97 && code <= 122) {
    return code - 71;
  }
  if (code >= 48 && code <= 57) {
    return code + 4;
  }
  if (code === 43) {
    return 62;
  }
  if (code === 47) {
    return 63;
  }
  throw new Error(`Game bundle contains invalid base64 data at offset ${offset}.`);
}

function decodeBase64ToBytes(base64Text) {
  runtimeDiagnostics.failureStage = "decodeBase64ToBytes";
  const sanitized = base64Text.replace(/\s+/g, "").replace(/=+$/, "");
  runtimeDiagnostics.joinedBase64Length = sanitized.length;
  runtimeDiagnostics.normalizedMod4 = sanitized.length % 4;

  if (sanitized.length % 4 === 1) {
    throw new Error("Hosted game bundle is malformed or truncated.");
  }

  const padded = sanitized.padEnd(Math.ceil(sanitized.length / 4) * 4, "=");
  const paddingLength = padded.endsWith("==") ? 2 : padded.endsWith("=") ? 1 : 0;
  const outputLength = (padded.length / 4) * 3 - paddingLength;
  const bytes = new Uint8Array(outputLength);

  let byteIndex = 0;
  for (let index = 0; index < padded.length; index += 4) {
    const c0 = decodeBase64Char(padded.charCodeAt(index), index);
    const c1 = decodeBase64Char(padded.charCodeAt(index + 1), index + 1);
    const c2Code = padded.charCodeAt(index + 2);
    const c3Code = padded.charCodeAt(index + 3);
    const c2Padding = c2Code === 61;
    const c3Padding = c3Code === 61;
    const c2 = c2Padding ? 0 : decodeBase64Char(c2Code, index + 2);
    const c3 = c3Padding ? 0 : decodeBase64Char(c3Code, index + 3);
    const chunk = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;

    bytes[byteIndex] = (chunk >> 16) & 0xff;
    byteIndex += 1;

    if (!c2Padding && byteIndex < bytes.length + 1) {
      bytes[byteIndex] = (chunk >> 8) & 0xff;
      byteIndex += 1;
    }

    if (!c3Padding && byteIndex < bytes.length + 1) {
      bytes[byteIndex] = chunk & 0xff;
      byteIndex += 1;
    }
  }

  runtimeDiagnostics.decodedByteLength = bytes.length;
  runtimeDiagnostics.first16Bytes = Array.from(bytes.slice(0, 16))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join(" ");
  runtimeDiagnostics.hasGzipMagic = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  return bytes;
}

function unpackGameBundle(compressedBytes) {
  runtimeDiagnostics.failureStage = "unpackGameBundle";

  if (compressedBytes.length < 2 || compressedBytes[0] !== 0x1f || compressedBytes[1] !== 0x8b) {
    throw new Error(`Decoded bundle is not valid gzip data. First bytes: ${runtimeDiagnostics.first16Bytes || "empty"}`);
  }

  try {
    return ungzip(compressedBytes, { to: "string" });
  } catch (error) {
    throw new Error(`Failed to unpack game bundle: ${describeThrownValue(error)}`);
  }
}

async function loadBundleSource() {
  runtimeDiagnostics.failureStage = "loadBundleSource";
  const encodedParts = await Promise.all(bundlePartPaths.map(fetchBundlePart));
  const encoded = encodedParts.join("");
  runtimeDiagnostics.joinedBase64Length = encoded.length;
  runtimeDiagnostics.joinedBase64Sha256 = await sha256Hex(encoded);

  const compressedBytes = decodeBase64ToBytes(encoded);
  runtimeDiagnostics.decodedBytesSha256 = await sha256Hex(compressedBytes);
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
  pre.style.whiteSpace = "pre-wrap";
  pre.style.overflow = "auto";
  document.body.appendChild(pre);
});
