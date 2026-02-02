"""
Predictive Maintenance Service for Jarvis Smart Factory
Uses trend analysis and linear regression to predict future machine states
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.machine_data import MachineReading


# Thresholds for predictions
TEMP_FAILURE_THRESHOLD = 90
VIBRATION_FAILURE_THRESHOLD = 1.0
HEALTH_CRITICAL_THRESHOLD = 40


def get_historical_readings(db: Session, machine_id: str, hours: int = 24) -> List[MachineReading]:
    """Get historical readings for trend analysis"""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    return db.query(MachineReading).filter(
        MachineReading.machine_id == machine_id,
        MachineReading.timestamp >= cutoff
    ).order_by(MachineReading.timestamp.asc()).all()


def linear_regression(x: List[float], y: List[float]) -> Tuple[float, float]:
    """Simple linear regression returning slope and intercept"""
    n = len(x)
    if n < 2:
        return 0.0, y[0] if y else 0.0
    
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_xx = sum(xi ** 2 for xi in x)
    
    denominator = n * sum_xx - sum_x ** 2
    if denominator == 0:
        return 0.0, sum_y / n
    
    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n
    
    return slope, intercept


def predict_value(slope: float, intercept: float, hours_ahead: float, current_x: float) -> float:
    """Predict value at hours_ahead from now"""
    future_x = current_x + hours_ahead
    return slope * future_x + intercept


def calculate_time_to_threshold(current_value: float, slope: float, threshold: float) -> Optional[float]:
    """Calculate hours until a threshold is reached"""
    if slope <= 0:
        return None  # Not increasing, won't reach threshold
    
    if current_value >= threshold:
        return 0  # Already at or past threshold
    
    # hours = (threshold - current) / rate_per_hour
    hours = (threshold - current_value) / slope
    return hours if hours > 0 else None


def predict_machine_state(db: Session, machine: dict) -> Dict:
    """
    Predict future machine state using trend analysis
    
    Returns predictions for 1h, 4h, and 24h ahead including:
    - Predicted temperature, vibration, health
    - Time to critical thresholds
    - Risk assessment
    """
    machine_id = machine.get("machine_id", "Unknown")
    current_temp = machine.get("temperature", 0)
    current_vib = machine.get("vibration", 0)
    current_health = machine.get("health_score", 100)
    
    # Get historical data
    readings = get_historical_readings(db, machine_id, hours=6)
    
    if len(readings) < 5:
        # Not enough data for prediction
        return {
            "machine_id": machine_id,
            "has_prediction": False,
            "message": "Insufficient historical data for prediction",
            "current": {
                "temperature": current_temp,
                "vibration": current_vib,
                "health_score": current_health
            }
        }
    
    # Prepare data for regression (x = hours from first reading)
    first_time = readings[0].timestamp
    x_values = [(r.timestamp - first_time).total_seconds() / 3600 for r in readings]
    temp_values = [r.temperature for r in readings]
    vib_values = [r.vibration for r in readings]
    health_values = [r.health_score for r in readings]
    
    current_x = x_values[-1] if x_values else 0
    
    # Calculate trends
    temp_slope, temp_intercept = linear_regression(x_values, temp_values)
    vib_slope, vib_intercept = linear_regression(x_values, vib_values)
    health_slope, health_intercept = linear_regression(x_values, health_values)
    
    # Predict future values
    predictions = {}
    for hours in [1, 4, 24]:
        predictions[f"{hours}h"] = {
            "temperature": round(predict_value(temp_slope, temp_intercept, hours, current_x), 1),
            "vibration": round(predict_value(vib_slope, vib_intercept, hours, current_x), 3),
            "health_score": max(0, min(100, round(predict_value(health_slope, health_intercept, hours, current_x))))
        }
    
    # Calculate time to critical thresholds
    time_to_critical = {}
    
    temp_time = calculate_time_to_threshold(current_temp, temp_slope, TEMP_FAILURE_THRESHOLD)
    if temp_time is not None and temp_time < 48:
        time_to_critical["temperature"] = {
            "hours": round(temp_time, 1),
            "threshold": TEMP_FAILURE_THRESHOLD,
            "message": f"Temperature may reach {TEMP_FAILURE_THRESHOLD}°C in {temp_time:.1f} hours"
        }
    
    vib_time = calculate_time_to_threshold(current_vib, vib_slope, VIBRATION_FAILURE_THRESHOLD)
    if vib_time is not None and vib_time < 48:
        time_to_critical["vibration"] = {
            "hours": round(vib_time, 1),
            "threshold": VIBRATION_FAILURE_THRESHOLD,
            "message": f"Vibration may reach critical level in {vib_time:.1f} hours"
        }
    
    # Health score decreasing
    if health_slope < 0:
        health_time = calculate_time_to_threshold(
            100 - current_health, 
            -health_slope, 
            100 - HEALTH_CRITICAL_THRESHOLD
        )
        if health_time is not None and health_time < 48:
            time_to_critical["health"] = {
                "hours": round(health_time, 1),
                "threshold": HEALTH_CRITICAL_THRESHOLD,
                "message": f"Health score may drop to {HEALTH_CRITICAL_THRESHOLD}% in {health_time:.1f} hours"
            }
    
    # Determine risk level
    if any(t.get("hours", 999) < 4 for t in time_to_critical.values()):
        risk_level = "high"
        risk_message = "Immediate attention required - critical threshold approaching"
    elif any(t.get("hours", 999) < 12 for t in time_to_critical.values()):
        risk_level = "medium"
        risk_message = "Schedule maintenance soon - degradation detected"
    elif time_to_critical:
        risk_level = "low"
        risk_message = "Monitor closely - gradual degradation observed"
    else:
        risk_level = "stable"
        risk_message = "Machine operating normally"
    
    # Trend directions
    trends = {
        "temperature": "rising" if temp_slope > 0.5 else ("falling" if temp_slope < -0.5 else "stable"),
        "vibration": "rising" if vib_slope > 0.01 else ("falling" if vib_slope < -0.01 else "stable"),
        "health": "declining" if health_slope < -1 else ("improving" if health_slope > 1 else "stable")
    }
    
    return {
        "machine_id": machine_id,
        "has_prediction": True,
        "timestamp": datetime.utcnow().isoformat(),
        "current": {
            "temperature": current_temp,
            "vibration": current_vib,
            "health_score": current_health
        },
        "trends": trends,
        "predictions": predictions,
        "time_to_critical": time_to_critical,
        "risk_level": risk_level,
        "risk_message": risk_message
    }


def get_maintenance_recommendations(db: Session, machines: List[dict]) -> List[Dict]:
    """Get maintenance recommendations for all machines"""
    recommendations = []
    
    for machine in machines:
        prediction = predict_machine_state(db, machine)
        
        if prediction.get("risk_level") in ["high", "medium"]:
            recommendations.append({
                "machine_id": prediction["machine_id"],
                "priority": "urgent" if prediction["risk_level"] == "high" else "scheduled",
                "risk_level": prediction["risk_level"],
                "message": prediction["risk_message"],
                "time_to_critical": prediction.get("time_to_critical", {}),
                "recommended_action": get_recommended_action(prediction)
            })
    
    # Sort by priority
    recommendations.sort(key=lambda x: 0 if x["priority"] == "urgent" else 1)
    return recommendations


def get_recommended_action(prediction: Dict) -> str:
    """Generate recommended maintenance action based on prediction"""
    actions = []
    
    ttc = prediction.get("time_to_critical", {})
    trends = prediction.get("trends", {})
    
    if "temperature" in ttc:
        actions.append("Check cooling system and airflow")
    if "vibration" in ttc:
        actions.append("Inspect bearings and alignment")
    if "health" in ttc:
        actions.append("Perform full diagnostic")
    
    if trends.get("temperature") == "rising":
        actions.append("Monitor temperature closely")
    if trends.get("vibration") == "rising":
        actions.append("Reduce load or speed")
    
    return "; ".join(actions) if actions else "Continue monitoring"
