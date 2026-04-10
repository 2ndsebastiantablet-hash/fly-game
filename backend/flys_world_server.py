from __future__ import annotations

import json
import mimetypes
import os
import re
import secrets
import threading
import time
from dataclasses import dataclass, field
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse


ROOT = Path(__file__).resolve().parent.parent / "frontend"
MAX_PLAYERS = 20
STALE_PLAYER_SECONDS = 50
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "8100"))
SPAWN_STATE = {
    "x": 0.0,
    "y": 3.8,
    "z": 0.0,
    "yaw": 0.0,
    "pitch": 0.0,
    "roll": 0.0,
}


@dataclass
class Player:
    token: str
    player_id: str
    name: str
    color: str
    joined_at: float
    last_seen: float
    state: dict[str, float] = field(default_factory=dict)


@dataclass
class Lobby:
    lobby_id: str
    name: str
    visibility: str
    created_at: float
    host_token: str
    code: str | None = None
    players: dict[str, Player] = field(default_factory=dict)


STATE_LOCK = threading.Lock()
LOBBIES: dict[str, Lobby] = {}


def utc_now() -> float:
    return time.time()


def make_id(length: int = 8) -> str:
    return secrets.token_urlsafe(length).replace("-", "").replace("_", "")[:length].upper()


def normalize_name(value: str | None, fallback: str) -> str:
    text = (value or "").strip()
    if not text:
        return fallback
    return text[:28]


def normalize_code(value: str | None) -> str:
    raw = "".join(ch for ch in (value or "").upper() if ch.isalnum())
    return raw[:12]


def normalize_color(value: str | None) -> str:
    text = str(value or "").strip().upper()
    if not text:
        return ""

    if text.startswith("#"):
        text = text[1:]

    if re.fullmatch(r"[0-9A-F]{6}", text):
        return f"#{text}"

    return ""


def normalized_state(payload: dict[str, Any] | None) -> dict[str, float]:
    payload = payload or {}

    def read_number(key: str, default: float, minimum: float, maximum: float) -> float:
        try:
            value = float(payload.get(key, default))
        except (TypeError, ValueError):
            value = default
        return max(minimum, min(maximum, value))

    return {
        "x": read_number("x", 0.0, -20000.0, 20000.0),
        "y": read_number("y", 3.8, 0.0, 500.0),
        "z": read_number("z", 0.0, -20000.0, 20000.0),
        "yaw": read_number("yaw", 0.0, -1000.0, 1000.0),
        "pitch": read_number("pitch", 0.0, -1000.0, 1000.0),
        "roll": read_number("roll", 0.0, -1000.0, 1000.0),
    }


def random_color() -> str:
    return f"#{secrets.randbelow(0xC0C0C0) + 0x3A3A3A:06X}"


def serialize_player(player: Player, host_token: str, *, include_token: bool = False) -> dict[str, Any]:
    data = {
        "id": player.player_id,
        "name": player.name,
        "color": player.color,
        "isHost": player.token == host_token,
        "state": player.state,
    }
    if include_token:
        data["token"] = player.token
    return data


def serialize_lobby(lobby: Lobby) -> dict[str, Any]:
    players = sorted(lobby.players.values(), key=lambda current: current.joined_at)
    return {
        "id": lobby.lobby_id,
        "name": lobby.name,
        "visibility": lobby.visibility,
        "code": lobby.code,
        "maxPlayers": MAX_PLAYERS,
        "playerCount": len(players),
        "players": [serialize_player(player, lobby.host_token) for player in players],
    }


def serialize_public_lobby(lobby: Lobby) -> dict[str, Any]:
    return {
        "id": lobby.lobby_id,
        "name": lobby.name,
        "playerCount": len(lobby.players),
        "maxPlayers": MAX_PLAYERS,
    }


def assign_next_host_locked(lobby: Lobby) -> None:
    next_host = sorted(lobby.players.values(), key=lambda current: current.joined_at)[0]
    lobby.host_token = next_host.token


def remove_player_from_lobby(lobby: Lobby, token: str) -> None:
    lobby.players.pop(token, None)

    if not lobby.players:
        LOBBIES.pop(lobby.lobby_id, None)
        return

    if lobby.host_token not in lobby.players:
        assign_next_host_locked(lobby)


def cleanup_locked() -> None:
    now = utc_now()
    for lobby_id in list(LOBBIES.keys()):
        lobby = LOBBIES.get(lobby_id)
        if lobby is None:
            continue

        stale_tokens = [
            token
            for token, player in lobby.players.items()
            if now - player.last_seen > STALE_PLAYER_SECONDS
        ]

        for token in stale_tokens:
            remove_player_from_lobby(lobby, token)


def find_lobby_by_token(token: str) -> tuple[Lobby | None, Player | None]:
    for lobby in LOBBIES.values():
        player = lobby.players.get(token)
        if player is not None:
            return lobby, player
    return None, None


def find_private_lobby_by_code(code: str) -> Lobby | None:
    for lobby in LOBBIES.values():
        if lobby.visibility == "private" and lobby.code == code:
            return lobby
    return None


def build_snapshot(lobby: Lobby, player: Player) -> dict[str, Any]:
    return {
        "ok": True,
        "lobby": serialize_lobby(lobby),
        "player": serialize_player(player, lobby.host_token, include_token=True),
    }


def create_player(display_name: str, preferred_color: str | None = None) -> Player:
    color = normalize_color(preferred_color) or random_color()
    return Player(
        token=make_id(24),
        player_id=make_id(8),
        name=normalize_name(display_name, f"Fly {secrets.randbelow(9000) + 1000}"),
        color=color,
        joined_at=utc_now(),
        last_seen=utc_now(),
        state=dict(SPAWN_STATE),
    )


def api_public_lobbies() -> dict[str, Any]:
    with STATE_LOCK:
        cleanup_locked()
        lobbies = [
            serialize_public_lobby(lobby)
            for lobby in sorted(LOBBIES.values(), key=lambda current: current.created_at)
            if lobby.visibility == "public"
        ]
    return {"ok": True, "lobbies": lobbies}


def api_create_lobby(payload: dict[str, Any]) -> dict[str, Any]:
    visibility = "private" if payload.get("visibility") == "private" else "public"
    code = normalize_code(payload.get("code"))
    if visibility == "private" and len(code) < 4:
        raise ValueError("Private servers need a code with at least 4 letters or numbers.")

    with STATE_LOCK:
        cleanup_locked()

        if visibility == "private" and find_private_lobby_by_code(code):
            raise ValueError("That private code is already in use. Try a different one.")

        player = create_player(str(payload.get("displayName", "")), str(payload.get("color", "")))
        lobby = Lobby(
            lobby_id=make_id(10),
            name=normalize_name(payload.get("lobbyName"), f"{player.name}'s Lobby"),
            visibility=visibility,
            created_at=utc_now(),
            host_token=player.token,
            code=code if visibility == "private" else None,
            players={player.token: player},
        )
        LOBBIES[lobby.lobby_id] = lobby
        return build_snapshot(lobby, player)


def api_join_public(payload: dict[str, Any]) -> dict[str, Any]:
    lobby_id = str(payload.get("lobbyId", "")).strip()
    with STATE_LOCK:
        cleanup_locked()
        lobby = LOBBIES.get(lobby_id)
        if lobby is None or lobby.visibility != "public":
            raise ValueError("That public server is no longer available.")
        if len(lobby.players) >= MAX_PLAYERS:
            raise ValueError("That server is already full.")

        player = create_player(str(payload.get("displayName", "")), str(payload.get("color", "")))
        lobby.players[player.token] = player
        return build_snapshot(lobby, player)


def api_join_private(payload: dict[str, Any]) -> dict[str, Any]:
    code = normalize_code(payload.get("code"))
    if len(code) < 4:
        raise ValueError("Enter a valid private server code.")

    with STATE_LOCK:
        cleanup_locked()
        lobby = find_private_lobby_by_code(code)
        if lobby is None:
            raise ValueError("No private server is using that code right now.")
        if len(lobby.players) >= MAX_PLAYERS:
            raise ValueError("That private server is already full.")

        player = create_player(str(payload.get("displayName", "")), str(payload.get("color", "")))
        lobby.players[player.token] = player
        return build_snapshot(lobby, player)


def api_leave(payload: dict[str, Any]) -> dict[str, Any]:
    token = str(payload.get("playerToken", "")).strip()
    if not token:
        return {"ok": True}

    with STATE_LOCK:
        cleanup_locked()
        lobby, _player = find_lobby_by_token(token)
        if lobby is not None:
            remove_player_from_lobby(lobby, token)

    return {"ok": True}


def api_session(payload: dict[str, Any]) -> dict[str, Any]:
    token = str(payload.get("playerToken", "")).strip()
    with STATE_LOCK:
        cleanup_locked()
        lobby, player = find_lobby_by_token(token)
        if lobby is None or player is None:
            raise ValueError("That session is no longer active.")
        player.last_seen = utc_now()
        return build_snapshot(lobby, player)


def api_heartbeat(payload: dict[str, Any]) -> dict[str, Any]:
    token = str(payload.get("playerToken", "")).strip()
    with STATE_LOCK:
        cleanup_locked()
        lobby, player = find_lobby_by_token(token)
        if lobby is None or player is None:
            raise ValueError("That session is no longer active.")
        player.last_seen = utc_now()
        player.state = normalized_state(payload.get("state"))
        next_color = normalize_color(payload.get("color"))
        if next_color:
            player.color = next_color
        return build_snapshot(lobby, player)


class FlysWorldHandler(BaseHTTPRequestHandler):
    server_version = "FlysWorld/1.0"

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin", "*")
        self.send_header("Access-Control-Allow-Origin", origin or "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Vary", "Origin")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_get(parsed)
            return
        self.serve_static(parsed.path)

    def do_HEAD(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api_get(parsed, head_only=True)
            return
        self.serve_static(parsed.path, head_only=True)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"
        try:
            payload = json.loads(raw or "{}")
        except json.JSONDecodeError:
            self.write_json({"ok": False, "error": "Invalid JSON payload."}, status=HTTPStatus.BAD_REQUEST)
            return

        try:
            if parsed.path == "/api/create-lobby":
                data = api_create_lobby(payload)
            elif parsed.path == "/api/join-public":
                data = api_join_public(payload)
            elif parsed.path == "/api/join-private":
                data = api_join_private(payload)
            elif parsed.path == "/api/leave":
                data = api_leave(payload)
            elif parsed.path == "/api/heartbeat":
                data = api_heartbeat(payload)
            else:
                self.write_json({"ok": False, "error": "Unknown API route."}, status=HTTPStatus.NOT_FOUND)
                return
        except ValueError as error:
            self.write_json({"ok": False, "error": str(error)}, status=HTTPStatus.BAD_REQUEST)
            return

        self.write_json(data)

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, format: str, *args: Any) -> None:
        return

    def handle_api_get(self, parsed, *, head_only: bool = False) -> None:
        try:
            if parsed.path == "/api/health":
                data = {"ok": True, "status": "healthy"}
            elif parsed.path == "/api/public-lobbies":
                data = api_public_lobbies()
            elif parsed.path == "/api/session":
                query = parse_qs(parsed.query)
                data = api_session({"playerToken": query.get("playerToken", [""])[0]})
            else:
                self.write_json({"ok": False, "error": "Unknown API route."}, status=HTTPStatus.NOT_FOUND, head_only=head_only)
                return
        except ValueError as error:
            self.write_json({"ok": False, "error": str(error)}, status=HTTPStatus.BAD_REQUEST, head_only=head_only)
            return

        self.write_json(data, head_only=head_only)

    def serve_static(self, raw_path: str, *, head_only: bool = False) -> None:
        path = unquote(raw_path or "/")
        relative = "index.html" if path in {"", "/"} else path.lstrip("/")
        target = (ROOT / relative).resolve()

        if ROOT not in target.parents and target != ROOT:
            self.send_error(HTTPStatus.FORBIDDEN)
            return

        if target.is_dir():
            target = target / "index.html"

        if not target.exists() or not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        body = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head_only:
            self.wfile.write(body)

    def write_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK, *, head_only: bool = False) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if not head_only:
            self.wfile.write(body)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), FlysWorldHandler)
    print(f"Flys World server listening on port {PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
