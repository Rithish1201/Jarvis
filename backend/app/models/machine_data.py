from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime
from app.database import Base


class MachineReading(Base):
    """Historical machine sensor readings"""
    __tablename__ = "machine_readings"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, index=True, nullable=False)
    temperature = Column(Float, default=0)
    vibration = Column(Float, default=0)
    rpm = Column(Float, default=0)
    health_score = Column(Integer, default=100)
    status = Column(String, default="Healthy")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class Alert(Base):
    """Machine alerts and notifications"""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, index=True, nullable=False)
    alert_type = Column(String, nullable=False)  # temperature, vibration, rpm, health
    severity = Column(String, nullable=False)     # warning, critical
    message = Column(String, nullable=False)
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
