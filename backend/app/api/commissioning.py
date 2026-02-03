"""
New Machine Commissioning API
Provides endpoints for analyzing factory history and recommending configurations for new machines
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.commissioning import (
    generate_recommendations,
    identify_failure_patterns,
    calculate_safe_limits,
    analyze_operational_risks
)

router = APIRouter(prefix="/commissioning", tags=["Machine Commissioning"])


class NewMachineSpecs(BaseModel):
    """Specifications for the new machine being commissioned"""
    machine_type: str = "General"
    rated_power: Optional[float] = 10.0  # kW
    rated_rpm: Optional[float] = 2000.0
    rated_temperature: Optional[float] = 60.0  # Max operating temp
    environment: Optional[str] = "normal"  # normal, high_humidity, dusty, hot, cold


class CommissioningResponse(BaseModel):
    """Response from commissioning analysis"""
    success: bool
    machine_type: str
    failure_patterns: list
    safe_operating_limits: dict
    operational_risks: list
    configuration_recommendations: list
    preventive_guidelines: list
    summary: dict


@router.post("/analyze", response_model=CommissioningResponse)
def analyze_for_new_machine(specs: NewMachineSpecs, db: Session = Depends(get_db)):
    """
    Analyze factory history and generate recommendations for a new machine.
    
    This endpoint:
    1. Identifies common failure patterns from historical alerts
    2. Calculates safe operating limits from sensor data
    3. Analyzes operational risks specific to the new machine
    4. Generates configuration and preventive recommendations
    
    Usage:
    ```json
    {
        "machine_type": "CNC Lathe",
        "rated_power": 15,
        "rated_rpm": 3000,
        "environment": "high_humidity"
    }
    ```
    """
    try:
        machine_specs = {
            "machine_type": specs.machine_type,
            "rated_power": specs.rated_power,
            "rated_rpm": specs.rated_rpm,
            "rated_temperature": specs.rated_temperature,
            "environment": specs.environment
        }
        
        result = generate_recommendations(db, machine_specs)
        
        return CommissioningResponse(
            success=True,
            machine_type=result["machine_type"],
            failure_patterns=result["failure_patterns"],
            safe_operating_limits=result["safe_operating_limits"],
            operational_risks=result["operational_risks"],
            configuration_recommendations=result["configuration_recommendations"],
            preventive_guidelines=result["preventive_guidelines"],
            summary=result["summary"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/patterns")
def get_failure_patterns(days: int = 30, db: Session = Depends(get_db)):
    """
    Get historical failure patterns without new machine context.
    Useful for general factory health overview.
    """
    try:
        patterns = identify_failure_patterns(db, days)
        return {
            "success": True,
            "analysis_period_days": days,
            "patterns": patterns,
            "total_patterns": len(patterns)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/limits")
def get_safe_limits(days: int = 30, db: Session = Depends(get_db)):
    """
    Get calculated safe operating limits based on historical data.
    """
    try:
        limits = calculate_safe_limits(db, days)
        return {
            "success": True,
            "analysis_period_days": days,
            "limits": limits
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risks")
def assess_risks(specs: NewMachineSpecs, db: Session = Depends(get_db)):
    """
    Assess operational risks for a specific machine configuration.
    """
    try:
        machine_specs = {
            "machine_type": specs.machine_type,
            "rated_power": specs.rated_power,
            "rated_rpm": specs.rated_rpm,
            "environment": specs.environment
        }
        risks = analyze_operational_risks(db, machine_specs)
        return {
            "success": True,
            "machine_type": specs.machine_type,
            "risks": risks,
            "total_risks": len(risks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
