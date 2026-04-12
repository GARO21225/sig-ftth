from fastapi import APIRouter, WebSocket
from fastapi import WebSocketDisconnect
from typing import Dict, List
import json
from datetime import datetime

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}
        self.users: Dict[str, WebSocket] = {}

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        room: str = "global"
    ):
        await websocket.accept()
        self.users[user_id] = websocket
        if room not in self.rooms:
            self.rooms[room] = []
        self.rooms[room].append(websocket)
        print(f"✅ WS connecté: {user_id} → {room}")

    def disconnect(
        self,
        user_id: str,
        room: str = "global"
    ):
        ws = self.users.pop(user_id, None)
        if ws and room in self.rooms:
            try:
                self.rooms[room].remove(ws)
            except ValueError:
                pass
        print(f"🔌 WS déconnecté: {user_id}")

    async def broadcast_room(
        self,
        room: str,
        message: dict
    ):
        if room not in self.rooms:
            return
        dead = []
        for ws in self.rooms[room]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                self.rooms[room].remove(ws)
            except ValueError:
                pass

    async def send_user(
        self,
        user_id: str,
        message: dict
    ):
        ws = self.users.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.users.pop(user_id, None)

    async def broadcast_all(self, message: dict):
        for room in list(self.rooms.keys()):
            await self.broadcast_room(room, message)

manager = ConnectionManager()

@router.websocket("/ws/{room}")
async def websocket_endpoint(
    websocket: WebSocket,
    room: str,
    token: str = None
):
    user_id = token or f"user_{id(websocket)}"

    await manager.connect(websocket, user_id, room)

    # Message de bienvenue
    await websocket.send_json({
        "type": "CONNECTED",
        "room": room,
        "timestamp": str(datetime.utcnow()),
        "message": f"Connecté à la room {room}"
    })

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Diffuser aux autres
                await manager.broadcast_room(room, {
                    "type": "MESSAGE",
                    "from": user_id,
                    "data": msg,
                    "timestamp": str(datetime.utcnow())
                })
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(user_id, room)

# Fonctions utilitaires pour notifier
async def notify_noeud_cree(noeud: dict):
    await manager.broadcast_room("map", {
        "type": "NOEUD_CREE",
        "data": noeud,
        "timestamp": str(datetime.utcnow())
    })

async def notify_ot_modifie(ot: dict):
    await manager.broadcast_room("travaux", {
        "type": "OT_MODIFIE",
        "data": ot,
        "timestamp": str(datetime.utcnow())
    })

async def notify_alerte(
    alerte: dict,
    user_id: str
):
    await manager.send_user(user_id, {
        "type": "ALERTE",
        "data": alerte,
        "timestamp": str(datetime.utcnow())
    })
