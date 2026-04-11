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
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  lookup.fill(255);

  for (let index = 0; index < alphabet.length; index += 1) {
    lookup[alphabet.charCodeAt(index)] = index;
  }

  const clean = base64Text.replace(/\s+/g, "");
  const padded = clean.padEnd(Math.ceil(clean.length / 4) * 4, "=");
  const padding = padded.endsWith("==") ? 2 : padded.endsWith("=") ? 1 : 0;
  const outputLength = (padded.length / 4) * 3 - padding;
  const bytes = new Uint8Array(outputLength);
  let outputIndex = 0;

  for (let index = 0; index < padded.length; index += 4) {
    const a = padded.charCodeAt(index);
    const b = padded.charCodeAt(index + 1);
    const c = padded.charCodeAt(index + 2);
    const d = padded.charCodeAt(index + 3);

    const valueA = a < 256 ? lookup[a] : 255;
    const valueB = b < 256 ? lookup[b] : 255;
    const valueC = c === 61 ? 0 : c < 256 ? lookup[c] : 255;
    const valueD = d === 61 ? 0 : d < 256 ? lookup[d] : 255;

    if (valueA === 255 || valueB === 255 || (c !== 61 && valueC === 255) || (d !== 61 && valueD === 255)) {
      throw new Error("Game bundle contains invalid base64 characters.");
    }

    bytes[outputIndex] = (valueA << 2) | (valueB >> 4);
    outputIndex += 1;

    if (c !== 61 && outputIndex < outputLength) {
      bytes[outputIndex] = ((valueB & 15) << 4) | (valueC >> 2);
      outputIndex += 1;
    }

    if (d !== 61 && outputIndex < outputLength) {
      bytes[outputIndex] = ((valueC & 3) << 6) | valueD;
      outputIndex += 1;
    }
  }

  return bytes;
}

async function loadBundleSource() {
  const response = await fetch(bundlePath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load game bundle (${response.status})`);
  }

  const encoded = normalizeBase64Payload(await response.text(), response);
  const compressedBytes = decodeBase64ToBytes(encoded);

  try {
    const stream = new Blob([compressedBytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  } catch (error) {
    throw new Error(`Failed to unpack game bundle: ${error.message}`);
  }
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
