"""
Anomaly Detection Service for Jarvis Smart Factory
Uses statistical methods (z-score, rate of change) to detect abnormal machine behavior
"""
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from statistics import mean, stdev
from app.models.machine_data import MachineReading


# Thresholds for anomaly detection
TEMPERATURE_THRESHOLDS = {"warning": 75, "critical": 85, "min": 15}
VIBRATION_THRESHOLDS = {"warning": 0.6, "critical": 0.9}
RPM_THRESHOLDS = {"warning": 2800, "critical": 3200, "min": 500}

# Z-score threshold for statistical anomaly
ZSCORE_THRESHOLD = 2.5


def get_recent_readings(db: Session, machine_id: str, hours: int = 2) -> List[MachineReading]:
    """Get recent readings for statistical analysis"""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    return db.query(MachineReading).filter(
        MachineReading.machine_id == machine_id,
        MachineReading.timestamp >= cutoff
    ).order_by(MachineReading.timestamp.desc()).all()


def calculate_zscore(value: float, values: List[float]) -> float:
    """Calculate z-score for a value given a list of historical values"""
    if len(values) < 3:
        return 0.0
    avg = mean(values)
    std = stdev(values) if len(values) > 1 else 1
    if std == 0:
        return 0.0
    return (value - avg) / std


def detect_anomalies(db: Session, machine: dict) -> Dict:
    """
    Detect anomalies in machine data using multiple methods:
    1. Threshold-based detection
    2. Z-score statistical detection
    3. Rate of change detection
    
    Returns:
        dict with anomaly info including type, severity, and message
    """
    machine_id = machine.get("machine_id", "Unknown")
    temperature = machine.get("temperature", 0)
    vibration = machine.get("vibration", 0)
    rpm = machine.get("rpm", 0)
    
    anomalies = []
    
    # Get historical data for statistical analysis
    readings = get_recent_readings(db, machine_id, hours=2)
    temp_history = [r.temperature for r in readings if r.temperature]
    vib_history = [r.vibration for r in readings if r.vibration]
    rpm_history = [r.rpm for r in readings if r.rpm]
    
    # === 1. THRESHOLD-BASED DETECTION ===
    
    # Temperature thresholds
    if temperature >= TEMPERATURE_THRESHOLDS["critical"]:
        anomalies.append({
            "type": "temperature",
            "severity": "critical",
            "value": temperature,
            "threshold": TEMPERATURE_THRESHOLDS["critical"],
            "message": f"Critical temperature: {temperature}°C exceeds safe limit"
        })
    elif temperature >= TEMPERATURE_THRESHOLDS["warning"]:
        anomalies.append({
            "type": "temperature", 
            "severity": "warning",
            "value": temperature,
            "threshold": TEMPERATURE_THRESHOLDS["warning"],
            "message": f"High temperature warning: {temperature}°C"
        })
    elif temperature < TEMPERATURE_THRESHOLDS["min"]:
        anomalies.append({
            "type": "temperature",
            "severity": "warning", 
            "value": temperature,
            "message": f"Abnormally low temperature: {temperature}°C"
        })
    
    # Vibration thresholds
    if vibration >= VIBRATION_THRESHOLDS["critical"]:
        anomalies.append({
            "type": "vibration",
            "severity": "critical",
            "value": vibration,
            "message": f"Critical vibration level: {vibration:.3f}"
        })
    elif vibration >= VIBRATION_THRESHOLDS["warning"]:
        anomalies.append({
            "type": "vibration",
            "severity": "warning",
            "value": vibration,
            "message": f"High vibration warning: {vibration:.3f}"
        })
    
    # RPM thresholds
    if rpm >= RPM_THRESHOLDS["critical"]:
        anomalies.append({
            "type": "rpm",
            "severity": "critical",
            "value": rpm,
            "message": f"Critical RPM: {rpm}"
        })
    elif rpm >= RPM_THRESHOLDS["warning"]:
        anomalies.append({
            "type": "rpm",
            "severity": "warning", 
            "value": rpm,
            "message": f"High RPM warning: {rpm}"
        })
    
    # === 2. STATISTICAL (Z-SCORE) DETECTION ===
    
    # Temperature z-score
    if len(temp_history) >= 5:
        temp_zscore = calculate_zscore(temperature, temp_history)
        if abs(temp_zscore) > ZSCORE_THRESHOLD:
            anomalies.append({
                "type": "temperature_spike",
                "severity": "anomaly",
                "value": temperature,
                "zscore": round(temp_zscore, 2),
                "message": f"Unusual temperature spike detected (z={temp_zscore:.1f})"
            })
    
    # Vibration z-score
    if len(vib_history) >= 5:
        vib_zscore = calculate_zscore(vibration, vib_history)
        if abs(vib_zscore) > ZSCORE_THRESHOLD:
            anomalies.append({
                "type": "vibration_spike",
                "severity": "anomaly",
                "value": vibration,
                "zscore": round(vib_zscore, 2),
                "message": f"Unusual vibration spike detected (z={vib_zscore:.1f})"
            })
    
    # === 3. RATE OF CHANGE DETECTION ===
    
    if len(readings) >= 2:
        # Check if temperature is rising rapidly
        recent_temps = [r.temperature for r in readings[:5] if r.temperature]
        if len(recent_temps) >= 2:
            temp_change = recent_temps[0] - recent_temps[-1]
            if temp_change > 10:  # More than 10°C rise in recent readings
                anomalies.append({
                    "type": "temperature_rising",
                    "severity": "warning",
                    "rate": round(temp_change, 1),
                    "message": f"Temperature rising rapidly: +{temp_change:.1f}°C"
                })
    
    # Determine overall severity
    severities = [a["severity"] for a in anomalies]
    if "critical" in severities:
        overall_severity = "critical"
    elif "anomaly" in severities:
        overall_severity = "anomaly"
    elif "warning" in severities:
        overall_severity = "warning"
    else:
        overall_severity = "normal"
    
    return {
        "machine_id": machine_id,
        "timestamp": datetime.utcnow().isoformat(),
        "overall_severity": overall_severity,
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
        "is_anomaly": len(anomalies) > 0
    }


def get_anomaly_summary(db: Session, machines: List[dict]) -> Dict:
    """Get summary of anomalies across all machines"""
    all_anomalies = []
    critical_count = 0
    warning_count = 0
    
    for machine in machines:
        result = detect_anomalies(db, machine)
        if result["is_anomaly"]:
            all_anomalies.append(result)
            if result["overall_severity"] == "critical":
                critical_count += 1
            elif result["overall_severity"] in ["warning", "anomaly"]:
                warning_count += 1
    
    return {
        "total_machines": len(machines),
        "machines_with_anomalies": len(all_anomalies),
        "critical_count": critical_count,
        "warning_count": warning_count,
        "anomalies": all_anomalies
    }


def explain_anomaly(db: Session, machine: dict, language: str = "en") -> Dict:
    """
    Generate intelligent natural language explanation for anomalies.
    Analyzes historical patterns and provides root cause suggestions.
    """
    machine_id = machine.get("machine_id", "Unknown")
    anomaly_result = detect_anomalies(db, machine)
    
    if not anomaly_result.get("is_anomaly"):
        normal_msgs = {
            "en": f"{machine_id} is operating normally. All parameters within safe ranges.",
            "ta": f"{machine_id} இயல்பாக இயங்குகிறது. எல்லா அளவுருக்களும் பாதுகாப்பான வரம்பில் உள்ளன.",
            "tanglish": f"{machine_id} normal-aa run aagudhu. All parameters safe range-la irukku."
        }
        return {
            "machine_id": machine_id,
            "has_anomaly": False,
            "explanation": normal_msgs.get(language, normal_msgs["en"]),
            "recommendations": []
        }
    
    # Get historical data for analysis
    readings = get_recent_readings(db, machine_id, hours=6)
    temp_history = [r.temperature for r in readings if r.temperature]
    vib_history = [r.vibration for r in readings if r.vibration]
    
    explanations = []
    recommendations = []
    
    for anomaly in anomaly_result.get("anomalies", []):
        anomaly_type = anomaly.get("type", "")
        severity = anomaly.get("severity", "")
        value = anomaly.get("value", 0)
        
        # Temperature explanations
        if "temperature" in anomaly_type:
            avg_temp = mean(temp_history) if temp_history else 50
            change = value - avg_temp
            
            if language == "en":
                if change > 15:
                    explanations.append(f"Temperature spiked {change:.1f}°C above the 6-hour average of {avg_temp:.1f}°C.")
                    explanations.append("Possible causes: coolant system failure, bearing friction, or excessive load.")
                    recommendations.append("Check coolant levels and flow rate")
                    recommendations.append("Inspect bearings for wear")
                elif severity == "critical":
                    explanations.append(f"Temperature at {value}°C is in the critical zone.")
                    recommendations.append("Consider immediate shutdown to prevent damage")
            elif language == "ta":
                if change > 15:
                    explanations.append(f"வெப்பநிலை சராசரியை விட {change:.1f}°C அதிகரித்துள்ளது.")
                    recommendations.append("குளிரூட்டி அமைப்பை சரிபார்க்கவும்")
            else:  # tanglish
                if change > 15:
                    explanations.append(f"Temperature {change:.1f}°C spike aayiruchu, average {avg_temp:.1f}°C irundhadhu.")
                    recommendations.append("Coolant system check pannunga")
        
        # Vibration explanations
        elif "vibration" in anomaly_type:
            avg_vib = mean(vib_history) if vib_history else 0.3
            
            if language == "en":
                if value > avg_vib * 1.5:
                    explanations.append(f"Vibration is {((value/avg_vib - 1) * 100):.0f}% higher than normal average.")
                    explanations.append("Possible causes: unbalanced load, loose components, or worn bearings.")
                    recommendations.append("Check for loose bolts and mounting")
                    recommendations.append("Schedule bearing inspection")
            elif language == "ta":
                explanations.append(f"அதிர்வு சாதாரணத்தை விட {((value/avg_vib - 1) * 100):.0f}% அதிகம்.")
            else:
                explanations.append(f"Vibration normal-a vida {((value/avg_vib - 1) * 100):.0f}% high-aa irukku.")
    
    # Combine explanations
    full_explanation = " ".join(explanations) if explanations else anomaly_result["anomalies"][0].get("message", "Anomaly detected")
    
    return {
        "machine_id": machine_id,
        "has_anomaly": True,
        "severity": anomaly_result.get("overall_severity"),
        "explanation": full_explanation,
        "recommendations": recommendations,
        "anomaly_count": len(anomaly_result.get("anomalies", [])),
        "anomalies": anomaly_result.get("anomalies", [])
    }
