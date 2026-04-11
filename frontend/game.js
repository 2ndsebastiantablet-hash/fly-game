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

  return clean.padEnd(Math.ceil(clean.length / 4) * 4, "=");
}

function decodeBase64(base64Text) {
  const binary = atob(base64Text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function loadBundleSource() {
  const response = await fetch(bundlePath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load game bundle (${response.status})`);
  }

  const encoded = normalizeBase64Payload(await response.text(), response);
  const compressedBytes = decodeBase64(encoded);

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
