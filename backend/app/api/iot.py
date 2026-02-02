"""
IoT Sensor Integration API
Real-time sensor data and device management
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import random
import math

router = APIRouter(prefix="/iot", tags=["IoT Sensors"])


class SensorReading(BaseModel):
    sensor_id: str
    machine_id: str
    sensor_type: str
    value: float
    unit: str
    timestamp: str
    status: str  # online, warning, offline


class SensorDevice(BaseModel):
    sensor_id: str
    machine_id: str
    sensor_type: str
    model: str
    firmware: str
    battery_level: Optional[float]
    signal_strength: int
    last_seen: str
    status: str


# Simulated sensor configurations
SENSORS = [
    {"sensor_id": "TEMP-001", "machine_id": "MILL-01", "sensor_type": "temperature", "unit": "°C", "model": "ThermoSense 3000"},
    {"sensor_id": "TEMP-002", "machine_id": "LATHE-02", "sensor_type": "temperature", "unit": "°C", "model": "ThermoSense 3000"},
    {"sensor_id": "TEMP-003", "machine_id": "PRESS-03", "sensor_type": "temperature", "unit": "°C", "model": "ThermoSense 3000"},
    {"sensor_id": "VIB-001", "machine_id": "MILL-01", "sensor_type": "vibration", "unit": "mm/s", "model": "VibroTrack Pro"},
    {"sensor_id": "VIB-002", "machine_id": "CNC-04", "sensor_type": "vibration", "unit": "mm/s", "model": "VibroTrack Pro"},
    {"sensor_id": "PRES-001", "machine_id": "PRESS-03", "sensor_type": "pressure", "unit": "bar", "model": "PressureMaster X1"},
    {"sensor_id": "PRES-002", "machine_id": "DRILL-05", "sensor_type": "pressure", "unit": "bar", "model": "PressureMaster X1"},
    {"sensor_id": "FLOW-001", "machine_id": "MILL-01", "sensor_type": "coolant_flow", "unit": "L/min", "model": "FlowMeter 200"},
    {"sensor_id": "RPM-001", "machine_id": "LATHE-02", "sensor_type": "rpm", "unit": "RPM", "model": "SpeedSense Turbo"},
    {"sensor_id": "RPM-002", "machine_id": "CNC-04", "sensor_type": "rpm", "unit": "RPM", "model": "SpeedSense Turbo"},
    {"sensor_id": "POWER-001", "machine_id": "MILL-01", "sensor_type": "power", "unit": "kW", "model": "EnergyMon Plus"},
    {"sensor_id": "POWER-002", "machine_id": "PRESS-03", "sensor_type": "power", "unit": "kW", "model": "EnergyMon Plus"},
]


def generate_sensor_value(sensor_type: str) -> float:
    """Generate realistic sensor values with some randomness"""
    base_values = {
        "temperature": (45, 75),  # min, max
        "vibration": (0.1, 0.8),
        "pressure": (2, 12),
        "coolant_flow": (5, 25),
        "rpm": (500, 3500),
        "power": (5, 50)
    }
    
    min_val, max_val = base_values.get(sensor_type, (0, 100))
    # Add some time-based variation
    time_factor = math.sin(datetime.now().timestamp() / 60) * 0.1
    value = random.uniform(min_val, max_val) * (1 + time_factor)
    return round(value, 2)


def get_sensor_status(sensor_type: str, value: float) -> str:
    """Determine sensor status based on value thresholds"""
    thresholds = {
        "temperature": {"warning": 70, "critical": 80},
        "vibration": {"warning": 0.5, "critical": 0.7},
        "pressure": {"warning": 10, "critical": 12},
        "coolant_flow": {"warning": 8, "critical": 5},  # Low is bad
        "rpm": {"warning": 3000, "critical": 3500},
        "power": {"warning": 40, "critical": 45}
    }
    
    thresh = thresholds.get(sensor_type)
    if not thresh:
        return "online"
    
    if sensor_type == "coolant_flow":
        # For coolant, low values are bad
        if value <= thresh["critical"]:
            return "critical"
        elif value <= thresh["warning"]:
            return "warning"
    else:
        if value >= thresh["critical"]:
            return "critical"
        elif value >= thresh["warning"]:
            return "warning"
    
    return "online"


@router.get("/sensors")
def get_all_sensors() -> Dict:
    """Get list of all IoT sensors with current status"""
    devices = []
    
    for sensor in SENSORS:
        # Simulate device status
        is_online = random.random() > 0.05  # 95% online rate
        
        device = SensorDevice(
            sensor_id=sensor["sensor_id"],
            machine_id=sensor["machine_id"],
            sensor_type=sensor["sensor_type"],
            model=sensor["model"],
            firmware="v2.4.1",
            battery_level=random.uniform(60, 100) if "wireless" in sensor.get("model", "").lower() else None,
            signal_strength=random.randint(60, 100) if is_online else 0,
            last_seen=datetime.now().isoformat() if is_online else (datetime.now() - timedelta(minutes=random.randint(5, 60))).isoformat(),
            status="online" if is_online else "offline"
        )
        devices.append(device.dict())
    
    online_count = sum(1 for d in devices if d["status"] == "online")
    
    return {
        "sensors": devices,
        "summary": {
            "total": len(devices),
            "online": online_count,
            "offline": len(devices) - online_count
        }
    }


@router.get("/readings")
def get_current_readings() -> Dict:
    """Get current readings from all sensors"""
    readings = []
    
    for sensor in SENSORS:
        value = generate_sensor_value(sensor["sensor_type"])
        status = get_sensor_status(sensor["sensor_type"], value)
        
        reading = SensorReading(
            sensor_id=sensor["sensor_id"],
            machine_id=sensor["machine_id"],
            sensor_type=sensor["sensor_type"],
            value=value,
            unit=sensor["unit"],
            timestamp=datetime.now().isoformat(),
            status=status
        )
        readings.append(reading.dict())
    
    # Group by machine
    by_machine = {}
    for r in readings:
        machine_id = r["machine_id"]
        if machine_id not in by_machine:
            by_machine[machine_id] = []
        by_machine[machine_id].append(r)
    
    critical_count = sum(1 for r in readings if r["status"] == "critical")
    warning_count = sum(1 for r in readings if r["status"] == "warning")
    
    return {
        "readings": readings,
        "by_machine": by_machine,
        "summary": {
            "total_readings": len(readings),
            "critical": critical_count,
            "warning": warning_count,
            "timestamp": datetime.now().isoformat()
        }
    }


@router.get("/readings/{sensor_id}/history")
def get_sensor_history(sensor_id: str, hours: int = 1) -> Dict:
    """Get historical readings for a specific sensor"""
    # Find sensor
    sensor = next((s for s in SENSORS if s["sensor_id"] == sensor_id), None)
    if not sensor:
        raise HTTPException(status_code=404, detail=f"Sensor {sensor_id} not found")
    
    history = []
    current_time = datetime.now()
    
    # Generate historical data points (1 per minute for the last N hours)
    for i in range(hours * 60):
        timestamp = current_time - timedelta(minutes=i)
        value = generate_sensor_value(sensor["sensor_type"])
        
        history.append({
            "timestamp": timestamp.isoformat(),
            "value": value,
            "status": get_sensor_status(sensor["sensor_type"], value)
        })
    
    history.reverse()  # Oldest first
    
    # Calculate stats
    values = [h["value"] for h in history]
    
    return {
        "sensor_id": sensor_id,
        "machine_id": sensor["machine_id"],
        "sensor_type": sensor["sensor_type"],
        "unit": sensor["unit"],
        "history": history[-60:],  # Return last 60 points for chart
        "stats": {
            "min": round(min(values), 2),
            "max": round(max(values), 2),
            "avg": round(sum(values) / len(values), 2),
            "current": values[-1]
        }
    }


@router.get("/dashboard")
def get_iot_dashboard() -> Dict:
    """Get aggregated IoT dashboard data"""
    readings = get_current_readings()
    sensors = get_all_sensors()
    
    # Group readings by type for charts
    by_type = {}
    for r in readings["readings"]:
        sensor_type = r["sensor_type"]
        if sensor_type not in by_type:
            by_type[sensor_type] = []
        by_type[sensor_type].append({
            "sensor_id": r["sensor_id"],
            "machine_id": r["machine_id"],
            "value": r["value"],
            "unit": r["unit"],
            "status": r["status"]
        })
    
    return {
        "sensors": sensors["summary"],
        "readings": readings["summary"],
        "by_type": by_type,
        "timestamp": datetime.now().isoformat()
    }
