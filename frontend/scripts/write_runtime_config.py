from __future__ import annotations

import json
import os
from pathlib import Path


def main() -> None:
    frontend_dir = Path(__file__).resolve().parent.parent
    target = frontend_dir / "config.js"
    api_origin = os.environ.get("FLYS_WORLD_API_ORIGIN", "").strip().rstrip("/")
    payload = {"apiOrigin": api_origin}
    target.write_text(
        f"window.FLYS_WORLD_CONFIG = {json.dumps(payload, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"Wrote runtime config to {target}")


if __name__ == "__main__":
    main()
