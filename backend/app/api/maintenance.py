"""
Predictive Maintenance API
Forecasts maintenance needs based on machine degradation patterns
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import random
import math

router = APIRouter(prefix="/maintenance", tags=["Predictive Maintenance"])


class MaintenanceSchedule(BaseModel):
    machine_id: str
    priority: str  # critical, high, medium, low
    predicted_failure_date: str
    days_until_failure: int
    recommended_action: str
    estimated_downtime_hours: float
    cost_estimate: float
    parts_needed: List[str]
    confidence: float


class MaintenanceHistory(BaseModel):
    machine_id: str
    date: str
    action: str
    technician: str
    duration_hours: float
    cost: float
    notes: str


# Simulated machine maintenance data
MACHINE_PROFILES = {
    "MILL-01": {"last_maintenance": 45, "mtbf": 2000, "wear_rate": 0.03, "parts": ["spindle", "bearings", "coolant pump"]},
    "LATHE-02": {"last_maintenance": 30, "mtbf": 1800, "wear_rate": 0.025, "parts": ["chuck", "tailstock", "gearbox oil"]},
    "PRESS-03": {"last_maintenance": 60, "mtbf": 2500, "wear_rate": 0.035, "parts": ["hydraulic seals", "ram", "pressure sensors"]},
    "CNC-04": {"last_maintenance": 15, "mtbf": 1500, "wear_rate": 0.02, "parts": ["servo motors", "ball screws", "controller board"]},
    "DRILL-05": {"last_maintenance": 90, "mtbf": 2200, "wear_rate": 0.015, "parts": ["drill heads", "belts", "motor brushes"]},
}


def calculate_failure_probability(days_since_maintenance: int, mtbf: float, wear_rate: float) -> float:
    """Calculate probability of failure using Weibull-like curve"""
    # Normalize time to MTBF
    normalized_time = days_since_maintenance / (mtbf / 24)  # Convert MTBF hours to days
    # Weibull-like failure probability
    prob = 1 - math.exp(-((normalized_time * wear_rate) ** 2))
    return min(0.99, max(0.01, prob))


def predict_days_until_failure(current_health: float, wear_rate: float) -> int:
    """Estimate days until health drops below critical threshold"""
    if current_health <= 30:
        return 0
    critical_threshold = 30
    health_to_lose = current_health - critical_threshold
    days = int(health_to_lose / (wear_rate * 100 * 0.5))  # Rough estimate
    return max(1, days)


def get_priority(days_until_failure: int, failure_prob: float) -> str:
    """Determine maintenance priority"""
    if days_until_failure <= 3 or failure_prob > 0.8:
        return "critical"
    elif days_until_failure <= 7 or failure_prob > 0.6:
        return "high"
    elif days_until_failure <= 14 or failure_prob > 0.4:
        return "medium"
    else:
        return "low"


def get_recommended_action(priority: str, parts: List[str]) -> str:
    """Generate maintenance recommendation"""
    actions = {
        "critical": f"URGENT: Schedule immediate maintenance. Replace {parts[0]} and inspect {parts[1]}.",
        "high": f"Schedule maintenance within 3 days. Check {parts[0]} and {parts[1]} for wear.",
        "medium": f"Plan maintenance within 2 weeks. Routine inspection of {', '.join(parts[:2])}.",
        "low": f"Preventive maintenance recommended. Standard service for {parts[0]}."
    }
    return actions.get(priority, "Standard maintenance check recommended.")


@router.get("/predictions")
def get_maintenance_predictions() -> Dict:
    """
    Get predictive maintenance schedule for all machines.
    Returns prioritized list of machines needing maintenance.
    """
    predictions = []
    
    for machine_id, profile in MACHINE_PROFILES.items():
        # Simulate current health based on days since maintenance
        days_since = profile["last_maintenance"] + random.randint(-5, 10)
        failure_prob = calculate_failure_probability(days_since, profile["mtbf"], profile["wear_rate"])
        
        # Estimate current health
        current_health = max(20, 100 - (days_since * profile["wear_rate"] * 50) + random.uniform(-10, 10))
        days_until = predict_days_until_failure(current_health, profile["wear_rate"])
        
        priority = get_priority(days_until, failure_prob)
        
        # Estimate costs
        base_cost = {"critical": 5000, "high": 3000, "medium": 1500, "low": 800}
        downtime = {"critical": 8, "high": 4, "medium": 2, "low": 1}
        
        prediction = MaintenanceSchedule(
            machine_id=machine_id,
            priority=priority,
            predicted_failure_date=(datetime.now() + timedelta(days=days_until)).strftime("%Y-%m-%d"),
            days_until_failure=days_until,
            recommended_action=get_recommended_action(priority, profile["parts"]),
            estimated_downtime_hours=downtime[priority],
            cost_estimate=base_cost[priority] + random.uniform(-200, 500),
            parts_needed=profile["parts"][:2] if priority in ["critical", "high"] else [profile["parts"][0]],
            confidence=0.85 + random.uniform(-0.1, 0.1)
        )
        predictions.append(prediction)
    
    # Sort by priority and days until failure
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    predictions.sort(key=lambda x: (priority_order[x.priority], x.days_until_failure))
    
    # Calculate summary stats
    critical_count = sum(1 for p in predictions if p.priority == "critical")
    high_count = sum(1 for p in predictions if p.priority == "high")
    total_cost = sum(p.cost_estimate for p in predictions if p.priority in ["critical", "high"])
    
    return {
        "predictions": [p.dict() for p in predictions],
        "summary": {
            "critical_machines": critical_count,
            "high_priority": high_count,
            "estimated_urgent_cost": round(total_cost, 2),
            "next_scheduled": predictions[0].machine_id if predictions else None,
            "generated_at": datetime.now().isoformat()
        }
    }


@router.get("/history/{machine_id}")
def get_maintenance_history(machine_id: str) -> Dict:
    """Get maintenance history for a specific machine"""
    # Simulated history
    history = []
    current_date = datetime.now()
    
    actions = ["Routine inspection", "Parts replacement", "Calibration", "Emergency repair", "Preventive maintenance"]
    technicians = ["John D.", "Sarah M.", "Mike R.", "Lisa T."]
    
    for i in range(5):
        days_ago = 30 * (i + 1) + random.randint(-10, 10)
        history.append(MaintenanceHistory(
            machine_id=machine_id,
            date=(current_date - timedelta(days=days_ago)).strftime("%Y-%m-%d"),
            action=random.choice(actions),
            technician=random.choice(technicians),
            duration_hours=random.uniform(1, 6),
            cost=random.uniform(500, 3000),
            notes=f"Completed successfully. Next check in {30 + random.randint(-5, 15)} days."
        ).dict())
    
    return {
        "machine_id": machine_id,
        "history": history,
        "total_maintenance_cost": sum(h["cost"] for h in history),
        "average_downtime": sum(h["duration_hours"] for h in history) / len(history)
    }


@router.post("/schedule")
def schedule_maintenance(machine_id: str, date: str, action: str = "Preventive maintenance") -> Dict:
    """Schedule a maintenance task"""
    # In production, this would update a database
    return {
        "success": True,
        "scheduled": {
            "machine_id": machine_id,
            "date": date,
            "action": action,
            "status": "scheduled",
            "created_at": datetime.now().isoformat()
        },
        "message": f"✅ Maintenance scheduled for {machine_id} on {date}"
    }


@router.get("/calendar")
def get_maintenance_calendar(days: int = 30) -> Dict:
    """Get maintenance calendar for the next N days"""
    calendar = {}
    current_date = datetime.now()
    
    for machine_id in MACHINE_PROFILES.keys():
        # Random maintenance dates
        scheduled_day = random.randint(1, days)
        date_str = (current_date + timedelta(days=scheduled_day)).strftime("%Y-%m-%d")
        
        if date_str not in calendar:
            calendar[date_str] = []
        
        calendar[date_str].append({
            "machine_id": machine_id,
            "type": random.choice(["Preventive", "Inspection", "Calibration"]),
            "estimated_hours": random.uniform(1, 4)
        })
    
    return {
        "calendar": calendar,
        "total_scheduled": sum(len(v) for v in calendar.values()),
        "days_covered": days
    }


@router.get("/parts-inventory")
def get_parts_inventory() -> Dict:
    """Get spare parts inventory status"""
    parts = [
        {"name": "Spindle", "in_stock": 3, "reorder_point": 2, "lead_time_days": 14},
        {"name": "Bearings (set)", "in_stock": 12, "reorder_point": 5, "lead_time_days": 7},
        {"name": "Hydraulic seals", "in_stock": 8, "reorder_point": 4, "lead_time_days": 5},
        {"name": "Servo motor", "in_stock": 1, "reorder_point": 2, "lead_time_days": 21},
        {"name": "Ball screws", "in_stock": 4, "reorder_point": 2, "lead_time_days": 14},
        {"name": "Coolant pump", "in_stock": 2, "reorder_point": 1, "lead_time_days": 10},
        {"name": "Controller board", "in_stock": 0, "reorder_point": 1, "lead_time_days": 28},
        {"name": "Drill heads (set)", "in_stock": 6, "reorder_point": 3, "lead_time_days": 7},
    ]
    
    low_stock = [p for p in parts if p["in_stock"] <= p["reorder_point"]]
    
    return {
        "inventory": parts,
        "low_stock_alerts": low_stock,
        "total_parts": len(parts),
        "needs_reorder": len(low_stock)
    }
