"""
Shift Reports & Analytics API
Generates shift handover reports and analytics data
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from statistics import mean
from collections import defaultdict

from app.database import get_db
from app.models.machine_data import MachineReading, Alert
from app.services.data_reader import read_latest_data
from app.services.anomaly_detector import detect_anomalies
from app.services.predictor import get_maintenance_recommendations

router = APIRouter(prefix="/analytics", tags=["Analytics & Reports"])


def get_readings_in_range(db: Session, start_time: datetime, end_time: datetime) -> List[MachineReading]:
    """Get all readings within a time range"""
    return db.query(MachineReading).filter(
        MachineReading.timestamp >= start_time,
        MachineReading.timestamp <= end_time
    ).order_by(MachineReading.timestamp).all()


def get_alerts_in_range(db: Session, start_time: datetime, end_time: datetime) -> List[Alert]:
    """Get all alerts within a time range"""
    return db.query(Alert).filter(
        Alert.timestamp >= start_time,
        Alert.timestamp <= end_time
    ).order_by(Alert.timestamp.desc()).all()


def calculate_uptime(readings: List[MachineReading], machine_id: str) -> Dict:
    """Calculate uptime metrics for a machine"""
    machine_readings = [r for r in readings if r.machine_id == machine_id]
    if not machine_readings:
        return {"uptime_percent": 0, "total_readings": 0, "healthy_readings": 0}
    
    total = len(machine_readings)
    healthy = sum(1 for r in machine_readings if r.health_score and r.health_score >= 70)
    
    return {
        "uptime_percent": round((healthy / total) * 100, 1) if total > 0 else 0,
        "total_readings": total,
        "healthy_readings": healthy
    }


@router.get("/shift-summary")
def get_shift_summary(
    shift_hours: int = 8,
    language: str = "en",
    db: Session = Depends(get_db)
):
    """
    Generate a shift handover summary report.
    
    - shift_hours: Duration of the shift (default 8 hours)
    - language: 'en', 'ta', 'tanglish'
    """
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=shift_hours)
    
    # Get data for the shift period
    readings = get_readings_in_range(db, start_time, end_time)
    alerts = get_alerts_in_range(db, start_time, end_time)
    machines = read_latest_data()
    machine_ids = list(set(r.machine_id for r in readings)) if readings else []
    
    # Calculate metrics per machine
    machine_stats = {}
    for machine_id in machine_ids:
        machine_readings = [r for r in readings if r.machine_id == machine_id]
        temps = [r.temperature for r in machine_readings if r.temperature]
        vibs = [r.vibration for r in machine_readings if r.vibration]
        health_scores = [r.health_score for r in machine_readings if r.health_score]
        
        machine_stats[machine_id] = {
            "avg_temperature": round(mean(temps), 1) if temps else 0,
            "max_temperature": max(temps) if temps else 0,
            "avg_vibration": round(mean(vibs), 3) if vibs else 0,
            "avg_health": round(mean(health_scores), 1) if health_scores else 0,
            "uptime": calculate_uptime(readings, machine_id)
        }
    
    # Categorize alerts
    critical_alerts = [a for a in alerts if a.severity == "critical"]
    warning_alerts = [a for a in alerts if a.severity == "warning"]
    
    # Get current anomalies
    current_anomalies = []
    for machine in machines or []:
        anomaly = detect_anomalies(db, machine)
        if anomaly.get("is_anomaly"):
            current_anomalies.append(anomaly)
    
    # Get maintenance recommendations
    maintenance_recs = get_maintenance_recommendations(db, machines or [])
    
    # Generate AI recommendations for next shift
    recommendations = []
    for machine_id, stats in machine_stats.items():
        if stats["avg_health"] < 70:
            recommendations.append({
                "machine_id": machine_id,
                "priority": "high",
                "message": f"{machine_id} needs attention - health score dropped to {stats['avg_health']}%"
            })
        if stats["max_temperature"] > 80:
            recommendations.append({
                "machine_id": machine_id,
                "priority": "medium",
                "message": f"{machine_id} reached high temperature ({stats['max_temperature']}°C)"
            })
    
    # Language-specific summary
    summaries = {
        "en": {
            "title": "Shift Handover Report",
            "period": f"{start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}",
            "overall": "All systems stable" if not critical_alerts else f"{len(critical_alerts)} critical issues require attention"
        },
        "ta": {
            "title": "ஷிப்ட் கைமாற்று அறிக்கை",
            "period": f"{start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}",
            "overall": "எல்லா அமைப்புகளும் நிலையானவை" if not critical_alerts else f"{len(critical_alerts)} முக்கியமான சிக்கல்கள்"
        },
        "tanglish": {
            "title": "Shift Handover Report",
            "period": f"{start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')}",
            "overall": "Ella systems-um stable" if not critical_alerts else f"{len(critical_alerts)} critical issues irukku"
        }
    }
    
    summary = summaries.get(language, summaries["en"])
    
    return {
        "report": {
            "title": summary["title"],
            "generated_at": datetime.now().isoformat(),
            "shift_period": summary["period"],
            "shift_hours": shift_hours
        },
        "overview": {
            "overall_status": summary["overall"],
            "machines_monitored": len(machine_ids),
            "total_readings": len(readings),
            "critical_alerts": len(critical_alerts),
            "warning_alerts": len(warning_alerts)
        },
        "machine_stats": machine_stats,
        "alerts_summary": {
            "critical": [{"id": a.id, "machine": a.machine_id, "message": a.message} for a in critical_alerts[:5]],
            "warnings": [{"id": a.id, "machine": a.machine_id, "message": a.message} for a in warning_alerts[:5]]
        },
        "current_anomalies": current_anomalies,
        "recommendations": recommendations + maintenance_recs[:3],
        "next_shift_priorities": [r["message"] for r in recommendations[:3]]
    }


@router.get("/machine-comparison")
def compare_machines(db: Session = Depends(get_db)):
    """
    Compare all machines with efficiency rankings
    """
    machines = read_latest_data()
    if not machines:
        return {"machines": [], "rankings": []}
    
    # Calculate efficiency score for each machine
    rankings = []
    for machine in machines:
        # Efficiency based on health, temperature, and vibration
        health = machine.get("health_score", 50)
        temp_penalty = max(0, (machine.get("temperature", 50) - 70) * 2) if machine.get("temperature", 50) > 70 else 0
        vib_penalty = max(0, (machine.get("vibration", 0.3) - 0.5) * 50) if machine.get("vibration", 0.3) > 0.5 else 0
        
        efficiency = max(0, min(100, health - temp_penalty - vib_penalty))
        
        rankings.append({
            "machine_id": machine["machine_id"],
            "efficiency_score": round(efficiency, 1),
            "health_score": health,
            "temperature": machine.get("temperature", 0),
            "vibration": machine.get("vibration", 0),
            "status": machine.get("status", "Unknown")
        })
    
    # Sort by efficiency
    rankings.sort(key=lambda x: x["efficiency_score"], reverse=True)
    
    # Add rank
    for i, r in enumerate(rankings):
        r["rank"] = i + 1
    
    return {
        "machines": rankings,
        "best_performer": rankings[0]["machine_id"] if rankings else None,
        "needs_attention": [r["machine_id"] for r in rankings if r["efficiency_score"] < 60]
    }


@router.get("/trends/{machine_id}")
def get_machine_trends(machine_id: str, hours: int = 24, db: Session = Depends(get_db)):
    """
    Get trend data for a specific machine
    """
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=hours)
    
    readings = db.query(MachineReading).filter(
        MachineReading.machine_id == machine_id,
        MachineReading.timestamp >= start_time
    ).order_by(MachineReading.timestamp).all()
    
    if not readings:
        raise HTTPException(status_code=404, detail=f"No data found for {machine_id}")
    
    # Group by hour for trends
    hourly_data = defaultdict(list)
    for r in readings:
        hour_key = r.timestamp.strftime("%Y-%m-%d %H:00")
        hourly_data[hour_key].append({
            "temperature": r.temperature,
            "vibration": r.vibration,
            "health": r.health_score
        })
    
    trends = []
    for hour, data in sorted(hourly_data.items()):
        trends.append({
            "hour": hour,
            "avg_temperature": round(mean([d["temperature"] for d in data if d["temperature"]]), 1),
            "avg_vibration": round(mean([d["vibration"] for d in data if d["vibration"]]), 3),
            "avg_health": round(mean([d["health"] for d in data if d["health"]]), 1)
        })
    
    return {
        "machine_id": machine_id,
        "period_hours": hours,
        "data_points": len(readings),
        "trends": trends
    }


@router.get("/daily-summary")
def get_daily_summary(days: int = 7, db: Session = Depends(get_db)):
    """
    Get daily summary for the past N days
    """
    summaries = []
    
    for i in range(days):
        end_time = datetime.utcnow() - timedelta(days=i)
        start_time = end_time - timedelta(days=1)
        
        readings = get_readings_in_range(db, start_time, end_time)
        alerts = get_alerts_in_range(db, start_time, end_time)
        
        if readings:
            health_scores = [r.health_score for r in readings if r.health_score]
            temps = [r.temperature for r in readings if r.temperature]
            
            summaries.append({
                "date": start_time.strftime("%Y-%m-%d"),
                "avg_health": round(mean(health_scores), 1) if health_scores else 0,
                "avg_temperature": round(mean(temps), 1) if temps else 0,
                "readings_count": len(readings),
                "alerts_count": len(alerts),
                "critical_count": sum(1 for a in alerts if a.severity == "critical")
            })
    
    return {"daily_summaries": summaries}
