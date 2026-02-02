import json
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.machine_data import MachineReading, Alert

REALTIME_DATA_DIR = Path(__file__).resolve().parents[3] / "data" / "realtime"


def read_latest_data():
    """Read the most recent JSON file from realtime directory"""
    if not REALTIME_DATA_DIR.exists():
        return []

    files = sorted(REALTIME_DATA_DIR.glob("*.json"), reverse=True)
    if not files:
        return []

    try:
        with open(files[0], "r") as f:
            return json.load(f)
    except Exception:
        return []


def save_reading(db: Session, machine: dict, health_score: int, status: str):
    """Save a machine reading to the database"""
    reading = MachineReading(
        machine_id=machine.get("machine_id", "Unknown"),
        temperature=machine.get("temperature", 0),
        vibration=machine.get("vibration", 0),
        rpm=machine.get("rpm", 0),
        health_score=health_score,
        status=status,
        timestamp=datetime.utcnow()
    )
    db.add(reading)
    db.commit()
    return reading


def get_machine_history(db: Session, machine_id: str, hours: int = 24):
    """Get historical readings for a specific machine"""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    return db.query(MachineReading).filter(
        MachineReading.machine_id == machine_id,
        MachineReading.timestamp >= cutoff
    ).order_by(MachineReading.timestamp.desc()).all()


def get_all_history(db: Session, hours: int = 1):
    """Get all machine readings from the last N hours"""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    return db.query(MachineReading).filter(
        MachineReading.timestamp >= cutoff
    ).order_by(MachineReading.timestamp.desc()).all()


def create_alert(db: Session, machine_id: str, alert_type: str, severity: str, message: str):
    """Create a new alert"""
    alert = Alert(
        machine_id=machine_id,
        alert_type=alert_type,
        severity=severity,
        message=message
    )
    db.add(alert)
    db.commit()
    return alert


def get_active_alerts(db: Session, limit: int = 50):
    """Get unacknowledged alerts"""
    return db.query(Alert).filter(
        Alert.acknowledged == False
    ).order_by(Alert.created_at.desc()).limit(limit).all()


def acknowledge_alert(db: Session, alert_id: int):
    """Mark an alert as acknowledged"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.acknowledged = True
        db.commit()
    return alert
