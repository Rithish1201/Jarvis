"""
Digital Twin Simulation Engine
Allows "what-if" scenario testing and predictive analysis
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import random
import math

router = APIRouter(prefix="/simulation", tags=["Digital Twin Simulation"])


class SimulationParams(BaseModel):
    """Parameters for running a simulation"""
    machine_id: str
    duration_hours: int = 24
    temperature_change: Optional[float] = 0  # +/- degrees
    workload_percent: Optional[float] = 100  # 0-150% workload
    maintenance_applied: Optional[bool] = False
    cooling_efficiency: Optional[float] = 100  # % of normal cooling


class SimulationResult(BaseModel):
    machine_id: str
    scenario_name: str
    duration_hours: int
    predicted_health: float
    predicted_failures: int
    risk_level: str
    recommendations: List[str]
    timeline: List[Dict]


# Base machine profiles (normal operating characteristics)
MACHINE_PROFILES = {
    "MILL-01": {"base_temp": 55, "base_vibration": 0.35, "wear_rate": 0.02, "criticality": "high"},
    "LATHE-02": {"base_temp": 48, "base_vibration": 0.28, "wear_rate": 0.015, "criticality": "medium"},
    "PRESS-03": {"base_temp": 62, "base_vibration": 0.45, "wear_rate": 0.025, "criticality": "high"},
    "CNC-04": {"base_temp": 52, "base_vibration": 0.32, "wear_rate": 0.018, "criticality": "critical"},
    "DRILL-05": {"base_temp": 45, "base_vibration": 0.25, "wear_rate": 0.012, "criticality": "low"},
}


def get_machine_profile(machine_id: str) -> dict:
    """Get or create a machine profile"""
    if machine_id in MACHINE_PROFILES:
        return MACHINE_PROFILES[machine_id]
    # Default profile for unknown machines
    return {"base_temp": 50, "base_vibration": 0.30, "wear_rate": 0.02, "criticality": "medium"}


def simulate_timeline(params: SimulationParams) -> List[Dict]:
    """Generate hour-by-hour simulation data"""
    profile = get_machine_profile(params.machine_id)
    timeline = []
    
    current_health = 100.0
    current_temp = profile["base_temp"]
    current_vib = profile["base_vibration"]
    
    for hour in range(params.duration_hours):
        # Apply workload effects
        workload_factor = params.workload_percent / 100
        temp_increase = (workload_factor - 1) * 15  # Higher workload = higher temp
        vib_increase = (workload_factor - 1) * 0.2
        
        # Apply cooling efficiency
        cooling_factor = params.cooling_efficiency / 100
        temp_reduction = (1 - cooling_factor) * 10  # Poor cooling = higher temp
        
        # Apply external temperature change
        temp_change = params.temperature_change
        
        # Calculate hourly values
        hourly_temp = current_temp + temp_increase + temp_reduction + temp_change + random.uniform(-2, 2)
        hourly_vib = current_vib + vib_increase + random.uniform(-0.02, 0.02)
        
        # Health degradation based on conditions
        wear = profile["wear_rate"] * workload_factor
        if hourly_temp > 75:
            wear *= 2  # Accelerated wear at high temps
        if hourly_vib > 0.6:
            wear *= 1.5  # Accelerated wear at high vibration
        
        # Maintenance effect
        if params.maintenance_applied and hour == 0:
            current_health = min(100, current_health + 15)
            wear *= 0.5  # Reduced wear after maintenance
        
        current_health = max(0, current_health - wear)
        
        # Determine status
        if current_health < 40 or hourly_temp > 85:
            status = "Critical"
        elif current_health < 70 or hourly_temp > 75:
            status = "Warning"
        else:
            status = "Healthy"
        
        timeline.append({
            "hour": hour,
            "timestamp": (datetime.now() + timedelta(hours=hour)).strftime("%Y-%m-%d %H:%M"),
            "temperature": round(hourly_temp, 1),
            "vibration": round(hourly_vib, 3),
            "health_score": round(current_health, 1),
            "status": status
        })
        
        # Small random walk for next iteration
        current_temp = hourly_temp * 0.9 + profile["base_temp"] * 0.1
        current_vib = hourly_vib * 0.9 + profile["base_vibration"] * 0.1
    
    return timeline


def analyze_simulation(timeline: List[Dict], params: SimulationParams) -> Dict:
    """Analyze simulation results and generate insights"""
    profile = get_machine_profile(params.machine_id)
    
    # Count predicted failures (Critical status occurrences)
    failures = sum(1 for t in timeline if t["status"] == "Critical")
    warnings = sum(1 for t in timeline if t["status"] == "Warning")
    
    # Final health
    final_health = timeline[-1]["health_score"] if timeline else 0
    
    # Risk assessment
    if failures > 5 or final_health < 30:
        risk_level = "High"
    elif failures > 0 or warnings > len(timeline) * 0.3:
        risk_level = "Medium"
    else:
        risk_level = "Low"
    
    # Generate recommendations
    recommendations = []
    
    if params.workload_percent > 100:
        recommendations.append(f"Consider reducing workload from {params.workload_percent}% to prevent accelerated wear")
    
    if params.cooling_efficiency < 90:
        recommendations.append("Improve cooling system efficiency to extend machine lifespan")
    
    if failures > 0:
        recommendations.append(f"Predicted {failures} critical events - schedule preventive maintenance")
    
    if not params.maintenance_applied and final_health < 60:
        recommendations.append("Applying maintenance now could improve health by ~15%")
    
    if params.temperature_change > 5:
        recommendations.append("Monitor ambient temperature - elevated temps accelerate wear")
    
    if not recommendations:
        recommendations.append("Current parameters are within safe operating limits")
    
    return {
        "final_health": final_health,
        "predicted_failures": failures,
        "warning_hours": warnings,
        "risk_level": risk_level,
        "recommendations": recommendations
    }


@router.post("/run")
def run_simulation(params: SimulationParams) -> SimulationResult:
    """
    Run a digital twin simulation with custom parameters.
    
    Example scenarios:
    - High workload: workload_percent=130
    - Poor cooling: cooling_efficiency=70
    - After maintenance: maintenance_applied=True
    - Hot environment: temperature_change=10
    """
    # Generate simulation timeline
    timeline = simulate_timeline(params)
    
    # Analyze results
    analysis = analyze_simulation(timeline, params)
    
    # Create scenario name
    scenario_parts = []
    if params.workload_percent != 100:
        scenario_parts.append(f"{params.workload_percent}% load")
    if params.cooling_efficiency != 100:
        scenario_parts.append(f"{params.cooling_efficiency}% cooling")
    if params.maintenance_applied:
        scenario_parts.append("post-maintenance")
    if params.temperature_change != 0:
        scenario_parts.append(f"{params.temperature_change:+.0f}°C ambient")
    
    scenario_name = ", ".join(scenario_parts) if scenario_parts else "Normal operating conditions"
    
    return SimulationResult(
        machine_id=params.machine_id,
        scenario_name=scenario_name,
        duration_hours=params.duration_hours,
        predicted_health=analysis["final_health"],
        predicted_failures=analysis["predicted_failures"],
        risk_level=analysis["risk_level"],
        recommendations=analysis["recommendations"],
        timeline=timeline
    )


@router.post("/compare")
def compare_scenarios(scenarios: List[SimulationParams]) -> Dict:
    """
    Compare multiple simulation scenarios side by side.
    Useful for deciding between different operational strategies.
    """
    if len(scenarios) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 scenarios allowed")
    
    results = []
    for params in scenarios:
        result = run_simulation(params)
        results.append({
            "machine_id": result.machine_id,
            "scenario": result.scenario_name,
            "final_health": result.predicted_health,
            "failures": result.predicted_failures,
            "risk": result.risk_level
        })
    
    # Find best scenario
    best = min(results, key=lambda x: x["failures"] * 10 - x["final_health"])
    
    return {
        "comparisons": results,
        "best_scenario": best["scenario"],
        "recommendation": f"Recommended approach: {best['scenario']} (Health: {best['final_health']}%, Risk: {best['risk']})"
    }


@router.get("/presets")
def get_simulation_presets():
    """Get preset simulation scenarios for quick testing"""
    return {
        "presets": [
            {
                "name": "Normal Operation",
                "description": "Standard operating conditions",
                "params": {"workload_percent": 100, "cooling_efficiency": 100, "maintenance_applied": False}
            },
            {
                "name": "High Demand",
                "description": "130% workload scenario",
                "params": {"workload_percent": 130, "cooling_efficiency": 100, "maintenance_applied": False}
            },
            {
                "name": "Cooling Failure",
                "description": "Cooling system at 60% efficiency",
                "params": {"workload_percent": 100, "cooling_efficiency": 60, "maintenance_applied": False}
            },
            {
                "name": "Post Maintenance",
                "description": "After preventive maintenance",
                "params": {"workload_percent": 100, "cooling_efficiency": 100, "maintenance_applied": True}
            },
            {
                "name": "Worst Case",
                "description": "High load + poor cooling + hot environment",
                "params": {"workload_percent": 140, "cooling_efficiency": 50, "temperature_change": 15}
            }
        ]
    }
