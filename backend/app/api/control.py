"""
Machine Control API - Simulated control endpoints for voice commands
Allows Jarvis to "control" machines via voice commands
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/machines", tags=["Machine Control"])


# Simulated machine states
machine_states = {}

class ControlCommand(BaseModel):
    action: str  # "start", "stop", "adjust_speed", "schedule_maintenance"
    value: Optional[float] = None  # For speed adjustment (percentage)
    scheduled_time: Optional[str] = None  # For maintenance scheduling

class CommandResponse(BaseModel):
    success: bool
    message: str
    machine_id: str
    action: str
    timestamp: str


def get_machine_state(machine_id: str):
    """Get or initialize machine state"""
    if machine_id not in machine_states:
        machine_states[machine_id] = {
            "running": True,
            "speed": 100,
            "maintenance_scheduled": None,
            "last_action": None
        }
    return machine_states[machine_id]


@router.post("/{machine_id}/control")
def control_machine(machine_id: str, command: ControlCommand) -> CommandResponse:
    """
    Control a machine (simulated)
    
    Actions:
    - start: Start the machine
    - stop: Stop/shutdown the machine
    - adjust_speed: Adjust machine speed (value: 0-150%)
    - schedule_maintenance: Schedule maintenance
    """
    state = get_machine_state(machine_id)
    timestamp = datetime.now().isoformat()
    
    if command.action == "start":
        if state["running"]:
            return CommandResponse(
                success=False,
                message=f"{machine_id} is already running",
                machine_id=machine_id,
                action=command.action,
                timestamp=timestamp
            )
        state["running"] = True
        state["last_action"] = f"Started at {timestamp}"
        return CommandResponse(
            success=True,
            message=f"✅ {machine_id} has been started successfully",
            machine_id=machine_id,
            action=command.action,
            timestamp=timestamp
        )
    
    elif command.action == "stop":
        if not state["running"]:
            return CommandResponse(
                success=False,
                message=f"{machine_id} is already stopped",
                machine_id=machine_id,
                action=command.action,
                timestamp=timestamp
            )
        state["running"] = False
        state["last_action"] = f"Stopped at {timestamp}"
        return CommandResponse(
            success=True,
            message=f"🛑 {machine_id} has been shut down safely",
            machine_id=machine_id,
            action=command.action,
            timestamp=timestamp
        )
    
    elif command.action == "adjust_speed":
        if not state["running"]:
            return CommandResponse(
                success=False,
                message=f"Cannot adjust speed - {machine_id} is not running",
                machine_id=machine_id,
                action=command.action,
                timestamp=timestamp
            )
        
        new_speed = command.value or 100
        if new_speed < 0 or new_speed > 150:
            return CommandResponse(
                success=False,
                message=f"Invalid speed value. Must be between 0-150%",
                machine_id=machine_id,
                action=command.action,
                timestamp=timestamp
            )
        
        old_speed = state["speed"]
        state["speed"] = new_speed
        state["last_action"] = f"Speed adjusted from {old_speed}% to {new_speed}% at {timestamp}"
        
        return CommandResponse(
            success=True,
            message=f"⚡ {machine_id} speed adjusted from {old_speed}% to {new_speed}%",
            machine_id=machine_id,
            action=command.action,
            timestamp=timestamp
        )
    
    elif command.action == "schedule_maintenance":
        # Schedule for tomorrow if no time specified
        if command.scheduled_time:
            scheduled = command.scheduled_time
        else:
            scheduled = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d 09:00")
        
        state["maintenance_scheduled"] = scheduled
        state["last_action"] = f"Maintenance scheduled for {scheduled}"
        
        return CommandResponse(
            success=True,
            message=f"🔧 Maintenance scheduled for {machine_id} on {scheduled}",
            machine_id=machine_id,
            action=command.action,
            timestamp=timestamp
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {command.action}")


@router.get("/{machine_id}/state")
def get_state(machine_id: str):
    """Get current machine state"""
    state = get_machine_state(machine_id)
    return {
        "machine_id": machine_id,
        "running": state["running"],
        "speed": state["speed"],
        "maintenance_scheduled": state["maintenance_scheduled"],
        "last_action": state["last_action"]
    }


@router.get("/pending-maintenance")
def get_pending_maintenance():
    """Get all machines with scheduled maintenance"""
    pending = []
    for machine_id, state in machine_states.items():
        if state.get("maintenance_scheduled"):
            pending.append({
                "machine_id": machine_id,
                "scheduled_time": state["maintenance_scheduled"]
            })
    return {"pending_maintenance": pending}
