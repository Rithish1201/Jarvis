from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.services.data_reader import (
    read_latest_data,
    save_reading,
    get_machine_history,
    get_all_history,
    create_alert,
    get_active_alerts,
    acknowledge_alert
)

router = APIRouter(prefix="/machines", tags=["Machines"])


def calculate_health(machine: dict):
    """Calculate machine health in a fault-tolerant way"""
    score = 100
    alerts = []

    temperature = machine.get("temperature", 0)
    vibration = machine.get("vibration", 0)
    rpm = machine.get("rpm", 0)

    if temperature > 80:
        score -= 30
        alerts.append(("temperature", "critical" if temperature > 90 else "warning", 
                      f"High temperature: {temperature}°C"))
    if vibration > 0.7:
        score -= 25
        alerts.append(("vibration", "critical" if vibration > 1.2 else "warning",
                      f"High vibration: {vibration}"))
    if rpm > 3000:
        score -= 20
        alerts.append(("rpm", "warning", f"High RPM: {rpm}"))

    if score >= 70:
        status = "Healthy"
    elif score >= 40:
        status = "Warning"
    else:
        status = "Critical"

    return score, status, alerts


@router.get("/live", summary="Get Live Machine Data with Health")
def get_live_machine_data(db: Session = Depends(get_db)):
    raw_data = read_latest_data()
    enriched_data = []

    for machine in raw_data:
        health_score, status, alerts = calculate_health(machine)
        
        # Save to database
        save_reading(db, machine, health_score, status)
        
        # Create alerts for issues
        for alert_type, severity, message in alerts:
            create_alert(db, machine.get("machine_id", "Unknown"), 
                        alert_type, severity, message)
        
        enriched_data.append({
            "machine_id": machine.get("machine_id", "Unknown"),
            "temperature": machine.get("temperature", 0),
            "vibration": machine.get("vibration", 0),
            "rpm": machine.get("rpm", 0),
            "health_score": health_score,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        })

    return {
        "count": len(enriched_data),
        "machines": enriched_data
    }


@router.get("/history/{machine_id}", summary="Get Machine History")
def get_history(machine_id: str, hours: int = 24, db: Session = Depends(get_db)):
    """Get historical readings for a specific machine"""
    readings = get_machine_history(db, machine_id, hours)
    return {
        "machine_id": machine_id,
        "hours": hours,
        "count": len(readings),
        "readings": [
            {
                "temperature": r.temperature,
                "vibration": r.vibration,
                "rpm": r.rpm,
                "health_score": r.health_score,
                "status": r.status,
                "timestamp": r.timestamp.isoformat()
            }
            for r in readings
        ]
    }


@router.get("/alerts", summary="Get Active Alerts")
def get_alerts(limit: int = 50, db: Session = Depends(get_db)):
    """Get all unacknowledged alerts"""
    alerts = get_active_alerts(db, limit)
    return {
        "count": len(alerts),
        "alerts": [
            {
                "id": a.id,
                "machine_id": a.machine_id,
                "type": a.alert_type,
                "severity": a.severity,
                "message": a.message,
                "created_at": a.created_at.isoformat()
            }
            for a in alerts
        ]
    }


@router.post("/alerts/{alert_id}/acknowledge", summary="Acknowledge Alert")
def ack_alert(alert_id: int, db: Session = Depends(get_db)):
    """Mark an alert as acknowledged"""
    alert = acknowledge_alert(db, alert_id)
    if alert:
        return {"success": True, "message": f"Alert {alert_id} acknowledged"}
    return {"success": False, "message": "Alert not found"}
