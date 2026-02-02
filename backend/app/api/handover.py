"""
Shift Handover Notes API
Operator communication and shift transition management
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/handover", tags=["Shift Handover"])


class HandoverNote(BaseModel):
    id: Optional[str] = None
    machine_id: Optional[str] = None
    author: str
    shift: str  # day, night
    priority: str  # low, medium, high, critical
    message: str
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    created_at: Optional[str] = None


# In-memory storage for notes
handover_notes: List[Dict] = []
note_counter = 0


def generate_sample_notes():
    """Generate sample handover notes"""
    samples = [
        {"machine_id": "MILL-01", "author": "Rajesh K.", "shift": "day", "priority": "high", 
         "message": "Vibration levels increasing on spindle. Monitor closely and schedule maintenance if worsens."},
        {"machine_id": "PRESS-03", "author": "Priya S.", "shift": "day", "priority": "medium",
         "message": "Replaced hydraulic seals. Pressure now stable at 8.5 bar. Run tests before full operation."},
        {"machine_id": None, "author": "Amit P.", "shift": "night", "priority": "low",
         "message": "All machines running smoothly. Completed preventive checks on LATHE-02 and DRILL-05."},
        {"machine_id": "CNC-04", "author": "Sneha R.", "shift": "day", "priority": "critical",
         "message": "⚠️ Controller showing error E-401. Vendor contacted, parts arriving tomorrow. DO NOT RUN."},
        {"machine_id": None, "author": "Vikram D.", "shift": "night", "priority": "medium",
         "message": "Coolant levels low across all machines. Scheduled refill at 6 AM with maintenance team."},
    ]
    
    global note_counter
    for sample in samples:
        note_counter += 1
        handover_notes.append({
            **sample,
            "id": f"NOTE-{note_counter:04d}",
            "acknowledged": random.choice([True, False]),
            "acknowledged_by": "Night Shift Lead" if random.choice([True, False]) else None,
            "created_at": (datetime.now() - timedelta(hours=random.randint(1, 24))).isoformat()
        })


# Initialize with sample data
generate_sample_notes()


@router.get("/notes")
def get_handover_notes(shift: Optional[str] = None, unacknowledged_only: bool = False) -> Dict:
    """Get all handover notes, optionally filtered by shift"""
    notes = handover_notes.copy()
    
    if shift:
        notes = [n for n in notes if n["shift"] == shift]
    
    if unacknowledged_only:
        notes = [n for n in notes if not n["acknowledged"]]
    
    # Sort by priority and time
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    notes.sort(key=lambda x: (priority_order.get(x["priority"], 4), x["created_at"]), reverse=True)
    
    return {
        "notes": notes,
        "total": len(notes),
        "unacknowledged": sum(1 for n in notes if not n["acknowledged"]),
        "by_priority": {
            "critical": sum(1 for n in notes if n["priority"] == "critical"),
            "high": sum(1 for n in notes if n["priority"] == "high"),
            "medium": sum(1 for n in notes if n["priority"] == "medium"),
            "low": sum(1 for n in notes if n["priority"] == "low")
        }
    }


@router.post("/notes")
def create_handover_note(note: HandoverNote) -> Dict:
    """Create a new handover note"""
    global note_counter
    note_counter += 1
    
    new_note = {
        "id": f"NOTE-{note_counter:04d}",
        "machine_id": note.machine_id,
        "author": note.author,
        "shift": note.shift,
        "priority": note.priority,
        "message": note.message,
        "acknowledged": False,
        "acknowledged_by": None,
        "created_at": datetime.now().isoformat()
    }
    
    handover_notes.insert(0, new_note)
    
    return {
        "success": True,
        "note": new_note,
        "message": f"✅ Note created: {new_note['id']}"
    }


@router.post("/notes/{note_id}/acknowledge")
def acknowledge_note(note_id: str, acknowledged_by: str) -> Dict:
    """Acknowledge a handover note"""
    note = next((n for n in handover_notes if n["id"] == note_id), None)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note["acknowledged"] = True
    note["acknowledged_by"] = acknowledged_by
    
    return {
        "success": True,
        "note_id": note_id,
        "acknowledged_by": acknowledged_by,
        "message": f"✅ Note acknowledged by {acknowledged_by}"
    }


@router.get("/summary")
def get_shift_summary() -> Dict:
    """Get summary for current shift handover"""
    current_hour = datetime.now().hour
    current_shift = "day" if 6 <= current_hour < 18 else "night"
    outgoing_shift = "night" if current_shift == "day" else "day"
    
    outgoing_notes = [n for n in handover_notes if n["shift"] == outgoing_shift]
    
    critical_issues = [n for n in outgoing_notes if n["priority"] in ["critical", "high"]]
    
    return {
        "current_shift": current_shift,
        "outgoing_shift": outgoing_shift,
        "handover_time": datetime.now().strftime("%H:%M"),
        "notes_count": len(outgoing_notes),
        "critical_issues": len(critical_issues),
        "critical_notes": critical_issues[:3],
        "machines_mentioned": list(set(n["machine_id"] for n in outgoing_notes if n["machine_id"])),
        "summary_text": f"Outgoing {outgoing_shift} shift left {len(outgoing_notes)} notes, {len(critical_issues)} require immediate attention."
    }


@router.delete("/notes/{note_id}")
def delete_note(note_id: str) -> Dict:
    """Delete a handover note"""
    global handover_notes
    original_len = len(handover_notes)
    handover_notes = [n for n in handover_notes if n["id"] != note_id]
    
    if len(handover_notes) == original_len:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"success": True, "message": f"Note {note_id} deleted"}
