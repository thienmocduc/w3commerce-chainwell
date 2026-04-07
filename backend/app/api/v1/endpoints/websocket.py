"""
WellKOC — WebSocket Real-time Layer
Events: order_update, commission_paid, live_viewer_count, groupbuy_progress
"""
import json
from typing import Dict, Set
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt

from app.core.config import settings

router = APIRouter(tags=["WebSocket"])
ALGORITHM = "HS256"


class ConnectionManager:
    """Manage WebSocket connections per user"""

    def __init__(self):
        # user_id → set of WebSocket connections
        self.active: Dict[str, Set[WebSocket]] = {}
        # room_id → set of WebSocket connections (for live/groupbuy rooms)
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, ws: WebSocket, user_id: str) -> None:
        await ws.accept()
        if user_id not in self.active:
            self.active[user_id] = set()
        self.active[user_id].add(ws)

    def disconnect(self, ws: WebSocket, user_id: str) -> None:
        if user_id in self.active:
            self.active[user_id].discard(ws)
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to_user(self, user_id: str, event: str, data: dict) -> None:
        if user_id in self.active:
            msg = json.dumps({"event": event, "data": data})
            dead = set()
            for ws in self.active[user_id]:
                try:
                    await ws.send_text(msg)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.active[user_id].discard(ws)

    async def broadcast_room(self, room_id: str, event: str, data: dict) -> None:
        if room_id in self.rooms:
            msg = json.dumps({"event": event, "data": data})
            dead = set()
            for ws in self.rooms[room_id]:
                try:
                    await ws.send_text(msg)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.rooms[room_id].discard(ws)

    async def join_room(self, ws: WebSocket, room_id: str) -> None:
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(ws)

    def leave_room(self, ws: WebSocket, room_id: str) -> None:
        if room_id in self.rooms:
            self.rooms[room_id].discard(ws)

    @property
    def total_connections(self) -> int:
        return sum(len(ws_set) for ws_set in self.active.values())


manager = ConnectionManager()


def verify_ws_token(token: str) -> tuple[str, str] | None:
    """Returns (user_id, role) tuple or None if invalid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        role = payload.get("role", "buyer")
        if not user_id:
            return None
        return (user_id, role)
    except JWTError:
        return None


def _can_subscribe_room(room: str, user_id: str, role: str) -> bool:
    """
    Room access control rules:
    - live:*       → any authenticated user (public live streams)
    - groupbuy:*   → any authenticated user
    - koc:{id}     → only the KOC themselves or admins
    - admin:*      → only admins
    - others       → deny
    """
    if room.startswith("live:") or room.startswith("groupbuy:"):
        return True
    if room.startswith("koc:"):
        koc_id = room.split(":", 1)[1]
        return role == "admin" or user_id == koc_id
    if room.startswith("admin:"):
        return role == "admin"
    return False


@router.websocket("/ws")
async def websocket_endpoint(
    ws: WebSocket,
    token: str = Query(...),
):
    """
    Main WebSocket connection.
    Client subscribes to events after connecting.

    Events received from client:
      {"action": "subscribe", "room": "live:session_id"}
      {"action": "unsubscribe", "room": "live:session_id"}
      {"action": "ping"}

    Events sent to client:
      {"event": "order_update", "data": {...}}
      {"event": "commission_paid", "data": {"amount": 840000, "tx_hash": "0x..."}}
      {"event": "live_viewer_count", "data": {"session_id": "...", "count": 4283}}
      {"event": "groupbuy_progress", "data": {"id": "...", "count": 156, "target": 200}}
      {"event": "notification", "data": {"title": "...", "body": "..."}}
    """
    identity = verify_ws_token(token)
    if not identity:
        await ws.close(code=4001, reason="Invalid token")
        return

    user_id, role = identity
    await manager.connect(ws, user_id)
    try:
        # Send connection confirmation
        await ws.send_text(json.dumps({
            "event": "connected",
            "data": {
                "user_id": user_id,
                "connections": manager.total_connections,
            }
        }))

        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
                action = msg.get("action")

                if action == "ping":
                    await ws.send_text(json.dumps({"event": "pong"}))

                elif action == "subscribe" and msg.get("room"):
                    room = msg["room"]
                    if _can_subscribe_room(room, user_id, role):
                        await manager.join_room(ws, room)
                        await ws.send_text(json.dumps({
                            "event": "subscribed",
                            "data": {"room": room}
                        }))
                    else:
                        await ws.send_text(json.dumps({
                            "event": "error",
                            "data": {"code": "forbidden", "room": room}
                        }))

                elif action == "unsubscribe" and msg.get("room"):
                    manager.leave_room(ws, msg["room"])

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(ws, user_id)


# ── Helper to send events from backend services ──────────────
async def notify_user(user_id: str, event: str, data: dict) -> None:
    """Called by services/workers to push real-time events to users"""
    await manager.send_to_user(user_id, event, data)


async def broadcast_live(session_id: str, event: str, data: dict) -> None:
    """Broadcast to all viewers in a live session"""
    await manager.broadcast_room(f"live:{session_id}", event, data)


async def broadcast_groupbuy(gb_id: str, data: dict) -> None:
    """Broadcast group buy progress update"""
    await manager.broadcast_room(f"groupbuy:{gb_id}", "groupbuy_progress", data)
