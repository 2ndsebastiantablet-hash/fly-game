const bundlePath = new URL("./game.bundle.b64", import.meta.url);

function decodeBase64(base64Text) {
  const clean = base64Text.replace(/\s+/g, "");
  const binary = atob(clean);
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

  const encoded = await response.text();
  const compressedBytes = decodeBase64(encoded);
  const stream = new Blob([compressedBytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
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
