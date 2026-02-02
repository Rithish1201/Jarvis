from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import asyncio
import json
from datetime import datetime
from app.services.data_reader import read_latest_data

router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, data: dict):
        """Send data to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


def calculate_health(machine: dict):
    """Calculate machine health score"""
    score = 100
    temperature = machine.get("temperature", 0)
    vibration = machine.get("vibration", 0)
    rpm = machine.get("rpm", 0)

    if temperature > 80:
        score -= 30
    if vibration > 0.7:
        score -= 25
    if rpm > 3000:
        score -= 20

    if score >= 70:
        status = "Healthy"
    elif score >= 40:
        status = "Warning"
    else:
        status = "Critical"

    return score, status


@router.websocket("/ws/machines")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time machine updates"""
    await manager.connect(websocket)
    print(f"[WS] Client connected. Active: {len(manager.active_connections)}")
    
    try:
        while True:
            # Read latest data
            raw_data = read_latest_data()
            enriched_data = []
            
            for machine in raw_data:
                health_score, status = calculate_health(machine)
                enriched_data.append({
                    "machine_id": machine.get("machine_id", "Unknown"),
                    "temperature": machine.get("temperature", 0),
                    "vibration": machine.get("vibration", 0),
                    "rpm": machine.get("rpm", 0),
                    "health_score": health_score,
                    "status": status,
                    "timestamp": datetime.utcnow().isoformat()
                })
            
            # Send to this client
            await websocket.send_json({
                "type": "machine_update",
                "count": len(enriched_data),
                "machines": enriched_data
            })
            
            # Wait before next update
            await asyncio.sleep(3)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"[WS] Client disconnected. Active: {len(manager.active_connections)}")
