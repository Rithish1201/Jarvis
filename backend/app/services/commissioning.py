"""
New Machine Commissioning Advisor Service
Analyzes historical factory data to provide recommendations for new machines
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from statistics import mean, stdev
from app.models.machine_data import MachineReading, Alert


def get_all_historical_readings(db: Session, days: int = 30) -> List[MachineReading]:
    """Get all historical readings for analysis"""
    cutoff = datetime.utcnow() - timedelta(days=days)
    return db.query(MachineReading).filter(
        MachineReading.timestamp >= cutoff
    ).order_by(MachineReading.timestamp.desc()).all()


def get_all_alerts(db: Session, days: int = 30) -> List[Alert]:
    """Get all alerts for pattern analysis"""
    cutoff = datetime.utcnow() - timedelta(days=days)
    return db.query(Alert).filter(
        Alert.created_at >= cutoff
    ).order_by(Alert.created_at.desc()).all()


def identify_failure_patterns(db: Session, days: int = 30) -> List[Dict]:
    """
    Identify common failure patterns from historical alerts
    Groups alerts by type and severity to find recurring issues
    """
    alerts = get_all_alerts(db, days)
    
    if not alerts:
        return []
    
    # Group alerts by type
    pattern_counts = {}
    for alert in alerts:
        key = (alert.alert_type, alert.severity)
        if key not in pattern_counts:
            pattern_counts[key] = {
                "type": alert.alert_type,
                "severity": alert.severity,
                "count": 0,
                "machines_affected": set(),
                "sample_messages": []
            }
        pattern_counts[key]["count"] += 1
        pattern_counts[key]["machines_affected"].add(alert.machine_id)
        if len(pattern_counts[key]["sample_messages"]) < 3:
            pattern_counts[key]["sample_messages"].append(alert.message)
    
    # Convert to list and sort by frequency
    patterns = []
    for key, data in pattern_counts.items():
        patterns.append({
            "type": data["type"],
            "severity": data["severity"],
            "occurrences": data["count"],
            "machines_affected": len(data["machines_affected"]),
            "frequency": "high" if data["count"] > 10 else ("medium" if data["count"] > 5 else "low"),
            "sample_messages": data["sample_messages"],
            "root_cause": get_probable_root_cause(data["type"]),
            "prevention": get_prevention_tip(data["type"])
        })
    
    patterns.sort(key=lambda x: x["occurrences"], reverse=True)
    return patterns[:10]  # Top 10 patterns


def get_probable_root_cause(alert_type: str) -> str:
    """Get probable root cause for an alert type"""
    causes = {
        "temperature": "Cooling system inefficiency, bearing friction, or excessive load",
        "vibration": "Mechanical imbalance, loose components, worn bearings, or misalignment",
        "rpm": "Motor control issues, power fluctuations, or mechanical resistance",
        "health": "Cumulative wear, deferred maintenance, or environmental factors"
    }
    return causes.get(alert_type, "Multiple contributing factors - requires investigation")


def get_prevention_tip(alert_type: str) -> str:
    """Get prevention tip for an alert type"""
    tips = {
        "temperature": "Ensure adequate ventilation, regular coolant checks, and monitor ambient temperature",
        "vibration": "Schedule regular alignment checks, secure all mounting bolts, and lubricate bearings",
        "rpm": "Verify power supply stability, check belt/gear conditions, and calibrate motor controllers",
        "health": "Follow preventive maintenance schedule and address minor issues promptly"
    }
    return tips.get(alert_type, "Implement regular inspection and monitoring protocols")


def calculate_safe_limits(db: Session, days: int = 30) -> Dict:
    """
    Calculate safe operating limits based on historical data
    Uses statistical analysis to determine optimal thresholds
    """
    readings = get_all_historical_readings(db, days)
    
    if len(readings) < 10:
        # Not enough data, return defaults
        return {
            "temperature": {"min": 20, "optimal": 45, "warning": 70, "critical": 85},
            "vibration": {"min": 0.05, "optimal": 0.3, "warning": 0.6, "critical": 0.9},
            "rpm": {"min": 500, "optimal": 1800, "warning": 2800, "critical": 3200},
            "data_points": len(readings),
            "confidence": "low"
        }
    
    # Extract values
    temps = [r.temperature for r in readings if r.temperature and r.health_score > 60]
    vibs = [r.vibration for r in readings if r.vibration and r.health_score > 60]
    rpms = [r.rpm for r in readings if r.rpm and r.health_score > 60]
    
    def calc_limits(values: List[float], critical_multiplier: float = 1.5) -> Dict:
        if not values or len(values) < 5:
            return None
        avg = mean(values)
        std = stdev(values) if len(values) > 1 else avg * 0.1
        return {
            "min": round(max(0, avg - 2 * std), 2),
            "optimal": round(avg, 2),
            "warning": round(avg + std, 2),
            "critical": round(avg + critical_multiplier * std, 2)
        }
    
    return {
        "temperature": calc_limits(temps, 2.0) or {"min": 20, "optimal": 45, "warning": 70, "critical": 85},
        "vibration": calc_limits(vibs, 2.5) or {"min": 0.05, "optimal": 0.3, "warning": 0.6, "critical": 0.9},
        "rpm": calc_limits(rpms, 1.5) or {"min": 500, "optimal": 1800, "warning": 2800, "critical": 3200},
        "data_points": len(readings),
        "confidence": "high" if len(readings) > 1000 else ("medium" if len(readings) > 100 else "low")
    }


def analyze_operational_risks(db: Session, machine_specs: Dict) -> List[Dict]:
    """
    Analyze operational risks based on new machine specs and factory history
    """
    risks = []
    alerts = get_all_alerts(db, days=30)
    readings = get_all_historical_readings(db, days=7)
    
    # Check for power-related risks
    rated_power = machine_specs.get("rated_power", 0)
    if rated_power > 20:
        risks.append({
            "category": "Power",
            "level": "medium",
            "description": f"High power machine ({rated_power}kW) may stress electrical infrastructure",
            "mitigation": "Verify power supply capacity and consider dedicated circuit"
        })
    
    # Check for RPM-related risks based on history
    rated_rpm = machine_specs.get("rated_rpm", 0)
    rpm_alerts = len([a for a in alerts if a.alert_type == "rpm"])
    if rpm_alerts > 5 and rated_rpm > 2500:
        risks.append({
            "category": "RPM",
            "level": "high",
            "description": f"Factory has history of RPM issues. New machine rated at {rated_rpm} RPM",
            "mitigation": "Implement vibration monitoring and gradual spinup procedures"
        })
    
    # Check environment compatibility
    environment = machine_specs.get("environment", "normal")
    temp_alerts = len([a for a in alerts if a.alert_type == "temperature"])
    if environment == "high_humidity" and temp_alerts > 3:
        risks.append({
            "category": "Environment",
            "level": "high",
            "description": "High humidity + historical temperature issues = condensation risk",
            "mitigation": "Install dehumidifier and monitor for moisture buildup"
        })
    elif environment == "dusty":
        risks.append({
            "category": "Environment",
            "level": "medium",
            "description": "Dusty environment increases filter clogging and overheating risk",
            "mitigation": "Install additional air filtration and schedule frequent cleaning"
        })
    
    # Check for vibration risks
    vib_alerts = len([a for a in alerts if a.alert_type == "vibration"])
    if vib_alerts > 5:
        risks.append({
            "category": "Vibration",
            "level": "medium",
            "description": f"Factory has {vib_alerts} vibration alerts. New machine may be affected",
            "mitigation": "Ensure proper foundation and anti-vibration mounting pads"
        })
    
    # Sort by risk level
    level_order = {"high": 0, "medium": 1, "low": 2}
    risks.sort(key=lambda x: level_order.get(x["level"], 3))
    
    return risks


def generate_recommendations(db: Session, machine_specs: Dict) -> Dict:
    """
    Generate comprehensive recommendations for new machine commissioning
    """
    patterns = identify_failure_patterns(db)
    safe_limits = calculate_safe_limits(db)
    risks = analyze_operational_risks(db, machine_specs)
    
    # Generate configuration recommendations
    config_recommendations = []
    
    # Temperature configuration
    temp_limits = safe_limits.get("temperature", {})
    config_recommendations.append({
        "parameter": "Temperature Alert Threshold",
        "recommended_value": temp_limits.get("warning", 70),
        "unit": "°C",
        "reason": f"Based on factory average of {temp_limits.get('optimal', 45)}°C"
    })
    
    # Vibration configuration
    vib_limits = safe_limits.get("vibration", {})
    config_recommendations.append({
        "parameter": "Vibration Alert Threshold",
        "recommended_value": vib_limits.get("warning", 0.6),
        "unit": "mm/s",
        "reason": f"Factory optimal vibration is {vib_limits.get('optimal', 0.3)} mm/s"
    })
    
    # RPM configuration
    rated_rpm = machine_specs.get("rated_rpm", 2000)
    config_recommendations.append({
        "parameter": "Max Operating RPM",
        "recommended_value": min(rated_rpm * 0.9, safe_limits["rpm"]["warning"]),
        "unit": "RPM",
        "reason": "10% safety margin from rated capacity"
    })
    
    # Generate preventive guidelines
    preventive_guidelines = [
        "Perform initial calibration and alignment verification before production",
        "Run break-in period at 50% load for first 24 hours",
        "Monitor all sensors continuously during first week",
        "Schedule preventive maintenance based on factory's historical failure patterns"
    ]
    
    # Add pattern-specific guidelines
    for pattern in patterns[:3]:  # Top 3 most common issues
        if pattern["severity"] == "critical":
            preventive_guidelines.append(
                f"PRIORITY: Address {pattern['type']} monitoring - {pattern['occurrences']} historical incidents"
            )
    
    return {
        "machine_type": machine_specs.get("machine_type", "Unknown"),
        "analysis_timestamp": datetime.utcnow().isoformat(),
        "failure_patterns": patterns,
        "safe_operating_limits": safe_limits,
        "operational_risks": risks,
        "configuration_recommendations": config_recommendations,
        "preventive_guidelines": preventive_guidelines,
        "summary": {
            "total_patterns_found": len(patterns),
            "risk_count": {"high": len([r for r in risks if r["level"] == "high"]),
                          "medium": len([r for r in risks if r["level"] == "medium"]),
                          "low": len([r for r in risks if r["level"] == "low"])},
            "data_confidence": safe_limits.get("confidence", "low")
        }
    }
