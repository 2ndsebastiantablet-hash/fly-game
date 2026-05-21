const statusEl = document.querySelector("#vr-status");
const startButton = document.querySelector("#vr-start-button");

function setStatus(message) {
  statusEl.textContent = message;
}

async function checkVrSupport() {
  if (!("xr" in navigator)) {
    setStatus("WebXR is not available in this browser yet. The PC game is unchanged on the main page.");
    return;
  }

  try {
    const supported = await navigator.xr.isSessionSupported("immersive-vr");
    setStatus(supported ? "VR is supported. Full Flys World VR gameplay will be built in a later phase." : "WebXR exists, but immersive VR is not supported on this device/browser.");
  } catch (error) {
    setStatus(`Could not check VR support: ${error?.message || String(error)}`);
  }
}

startButton.addEventListener("click", checkVrSupport);
setStatus("VR route loaded. Click the button to check this browser.");
