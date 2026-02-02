from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.services.llm import ask_jarvis
from app.services.data_reader import read_latest_data
from app.services.anomaly_detector import detect_anomalies, get_anomaly_summary
from app.services.predictor import predict_machine_state, get_maintenance_recommendations
from app.services.conversation import (
    add_message, get_conversation_history, resolve_references,
    build_context_prompt, set_context, get_context, format_response_for_speech
)
from app.database import get_db
import json

router = APIRouter(prefix="/jarvis", tags=["Jarvis AI"])


class Question(BaseModel):
    prompt: str
    session_id: Optional[str] = "default"
    language: Optional[str] = "en"  # 'en', 'ta' (Tamil), 'tanglish'


class AlertRequest(BaseModel):
    machine_id: str
    condition: str  # e.g., "temperature > 80"
    session_id: Optional[str] = "default"


@router.post("/ask")
def ask(question: Question, db: Session = Depends(get_db)):
    """
    Enhanced Jarvis AI with context awareness, anomaly detection, and predictions
    """
    try:
        from app.services.voice_commands import parse_voice_command
        from app.api.control import control_machine, ControlCommand
        
        session_id = question.session_id or "default"
        lang = question.language or "en"
        machines = read_latest_data()
        machine_ids = [m["machine_id"] for m in machines] if machines else []
        
        # Check for voice control commands FIRST
        command = parse_voice_command(question.prompt)
        if command and command.get("machine_id"):
            try:
                control_cmd = ControlCommand(
                    action=command["action"],
                    value=command.get("value")
                )
                result = control_machine(command["machine_id"], control_cmd)
                
                # Format response based on language
                if lang == "ta":
                    answer = f"✅ {command['machine_id']} கட்டளை: {result.message}" if result.success else f"❌ {result.message}"
                elif lang == "tanglish":
                    answer = f"✅ {result.message}" if result.success else f"❌ {result.message}"
                else:
                    answer = result.message
                
                add_message(session_id, "user", question.prompt)
                add_message(session_id, "assistant", answer)
                
                return {
                    "answer": answer,
                    "session_id": session_id,
                    "command_executed": True,
                    "command": {"action": command["action"], "machine_id": command["machine_id"], "success": result.success}
                }
            except Exception:
                pass  # Fall through to AI
        
        # Resolve references and extract intent
        resolved = resolve_references(question.prompt, session_id, machine_ids)
        target_machine_id = resolved.get("machine_id")
        intents = resolved.get("intents", ["general"])
        
        # Get target machine data
        target_machine = None
        if target_machine_id and machines:
            target_machine = next((m for m in machines if m["machine_id"] == target_machine_id), None)
        
        # Detect anomalies for target machine
        anomaly_info = None
        if target_machine:
            anomaly_info = detect_anomalies(db, target_machine)
        
        # Get predictions for target machine
        prediction_info = None
        if target_machine and any(i in intents for i in ["prediction", "maintenance", "status"]):
            prediction_info = predict_machine_state(db, target_machine)
        
        # Build context-rich prompt
        prompt = build_context_prompt(
            session_id=session_id,
            current_query=question.prompt,
            machines_data=machines[:5] if machines else [],
            anomalies=anomaly_info,
            predictions=prediction_info
        )
        
        # Add language instruction to prompt
        lang = question.language or "en"
        if lang == "ta":
            prompt = f"IMPORTANT: You MUST respond entirely in Tamil (தமிழ்) language. Use Tamil script.\n\n{prompt}"
        elif lang == "tanglish":
            prompt = f"IMPORTANT: You MUST respond in Tanglish (Tamil words written in English letters, mixed with English). Example: 'Unakku help pannurenen, machine temperature romba high-aa irukku'.\n\n{prompt}"
        
        # Add user message to history
        add_message(session_id, "user", question.prompt)
        
        # Get AI response
        answer = ask_jarvis(prompt)
        
        # Add AI response to history
        add_message(session_id, "assistant", answer)
        
        # Response with additional context
        response = {
            "answer": answer,
            "session_id": session_id,
            "context": {
                "machine_id": target_machine_id,
                "intents": intents,
                "is_followup": resolved.get("is_followup", False)
            }
        }
        
        # Add anomaly info if detected
        if anomaly_info and anomaly_info.get("is_anomaly"):
            response["anomalies"] = {
                "count": anomaly_info["anomaly_count"],
                "severity": anomaly_info["overall_severity"],
                "details": anomaly_info["anomalies"][:3]  # Limit to top 3
            }
        
        # Add prediction info if available
        if prediction_info and prediction_info.get("has_prediction"):
            response["prediction"] = {
                "risk_level": prediction_info["risk_level"],
                "risk_message": prediction_info["risk_message"],
                "trends": prediction_info["trends"]
            }
        
        return response

    except Exception as e:
        print("Jarvis error:", e)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Jarvis failed: {str(e)}")


@router.get("/anomalies")
def get_anomalies(db: Session = Depends(get_db)):
    """Get current anomalies across all machines"""
    try:
        machines = read_latest_data()
        if not machines:
            return {"machines": 0, "anomalies": []}
        
        summary = get_anomaly_summary(db, machines)
        return summary
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/predictions/{machine_id}")
def get_predictions(machine_id: str, db: Session = Depends(get_db)):
    """Get predictions for a specific machine"""
    try:
        machines = read_latest_data()
        machine = next((m for m in machines if m["machine_id"] == machine_id), None)
        
        if not machine:
            raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")
        
        prediction = predict_machine_state(db, machine)
        return prediction
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/maintenance")
def get_maintenance(db: Session = Depends(get_db)):
    """Get maintenance recommendations for all machines"""
    try:
        machines = read_latest_data()
        if not machines:
            return {"recommendations": []}
        
        recommendations = get_maintenance_recommendations(db, machines)
        return {"recommendations": recommendations}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/context/{session_id}")
def get_session_context(session_id: str):
    """Get conversation context for debugging"""
    history = get_conversation_history(session_id)
    context = get_context(session_id)
    return {
        "session_id": session_id,
        "context": context,
        "history": history[-10:]
    }


@router.delete("/context/{session_id}")
def clear_session_context(session_id: str):
    """Clear conversation context"""
    from app.services.conversation import clear_context
    clear_context(session_id)
    return {"message": f"Context cleared for session {session_id}"}


@router.get("/explain/{machine_id}")
def explain_machine_anomaly(machine_id: str, language: str = "en", db: Session = Depends(get_db)):
    """
    Get intelligent explanation for machine anomalies.
    Returns root cause analysis and recommendations.
    
    - language: 'en' (English), 'ta' (Tamil), 'tanglish'
    """
    from app.services.anomaly_detector import explain_anomaly
    
    try:
        machines = read_latest_data()
        machine = next((m for m in machines if m["machine_id"] == machine_id), None)
        
        if not machine:
            raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")
        
        explanation = explain_anomaly(db, machine, language)
        return explanation
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

