"""
Conversation Context Service for Jarvis AI
Manages multi-turn conversation memory and intent extraction
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import re


# Store conversations by session (simple in-memory storage)
# In production, this would be stored in Redis or database
conversations: Dict[str, List[Dict]] = defaultdict(list)
session_context: Dict[str, Dict] = defaultdict(dict)

# Maximum conversation history to keep
MAX_HISTORY = 10
# Session timeout in minutes
SESSION_TIMEOUT = 30


def get_session_id(request) -> str:
    """Extract or generate session ID"""
    # Try to get from header or use a default
    return getattr(request, 'session_id', 'default')


def add_message(session_id: str, role: str, content: str):
    """Add a message to conversation history"""
    conversations[session_id].append({
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # Keep only recent messages
    if len(conversations[session_id]) > MAX_HISTORY * 2:
        conversations[session_id] = conversations[session_id][-MAX_HISTORY * 2:]


def get_conversation_history(session_id: str) -> List[Dict]:
    """Get conversation history for a session"""
    return conversations[session_id][-MAX_HISTORY * 2:]


def set_context(session_id: str, key: str, value):
    """Set context value for session"""
    session_context[session_id][key] = value
    session_context[session_id]["last_updated"] = datetime.utcnow().isoformat()


def get_context(session_id: str, key: str = None):
    """Get context value or all context for session"""
    if key:
        return session_context[session_id].get(key)
    return session_context[session_id]


def clear_context(session_id: str):
    """Clear session context"""
    session_context[session_id] = {}
    conversations[session_id] = []


def extract_machine_reference(text: str, known_machines: List[str]) -> Optional[str]:
    """Extract machine ID from user text"""
    text_upper = text.upper()
    
    # Check for exact machine ID mentions
    for machine_id in known_machines:
        if machine_id.upper() in text_upper:
            return machine_id
    
    # Check for partial matches (e.g., "mill" -> "MILL-01")
    machine_keywords = {
        "mill": "MILL-01",
        "lathe": "LATHE-02", 
        "press": "PRESS-03",
        "machine 1": "MILL-01",
        "machine 2": "LATHE-02",
        "machine 3": "PRESS-03",
        "first": "MILL-01",
        "second": "LATHE-02",
        "third": "PRESS-03"
    }
    
    for keyword, machine_id in machine_keywords.items():
        if keyword in text.lower():
            return machine_id
    
    return None


def extract_intent(text: str) -> Dict:
    """Extract user intent from message"""
    text_lower = text.lower()
    
    intents = {
        "status": ["status", "how is", "how's", "condition", "state", "doing"],
        "temperature": ["temperature", "temp", "hot", "cold", "heat", "thermal"],
        "vibration": ["vibration", "vibrating", "shaking", "shake"],
        "health": ["health", "healthy", "score"],
        "prediction": ["predict", "will", "future", "going to", "forecast", "expect"],
        "history": ["history", "past", "previous", "historical", "trend"],
        "alert": ["alert", "warn", "notify", "tell me if", "let me know"],
        "compare": ["compare", "versus", "vs", "difference", "better"],
        "all_machines": ["all machines", "all of them", "every machine", "everything"],
        "maintenance": ["maintenance", "fix", "repair", "service"]
    }
    
    detected = []
    for intent, keywords in intents.items():
        if any(kw in text_lower for kw in keywords):
            detected.append(intent)
    
    # Check for follow-up indicators
    is_followup = any(word in text_lower for word in [
        "it", "its", "that", "this", "what about", "and", "also", "how about"
    ])
    
    return {
        "intents": detected if detected else ["general"],
        "is_followup": is_followup,
        "raw_text": text
    }


def resolve_references(text: str, session_id: str, known_machines: List[str]) -> Dict:
    """Resolve pronoun references using conversation context"""
    intent_info = extract_intent(text)
    
    # Try to find machine reference in current message
    machine_id = extract_machine_reference(text, known_machines)
    
    # If no machine found and this is a follow-up, use context
    if not machine_id and intent_info["is_followup"]:
        machine_id = get_context(session_id, "last_machine")
    
    # Update context if we found a machine
    if machine_id:
        set_context(session_id, "last_machine", machine_id)
    
    # Store last intent
    if intent_info["intents"]:
        set_context(session_id, "last_intent", intent_info["intents"][0])
    
    return {
        "machine_id": machine_id,
        "intents": intent_info["intents"],
        "is_followup": intent_info["is_followup"],
        "context": get_context(session_id)
    }


def build_context_prompt(session_id: str, current_query: str, machines_data: List[Dict], 
                         anomalies: Dict = None, predictions: Dict = None) -> str:
    """Build a context-rich prompt for the AI including conversation history"""
    
    # Get recent conversation
    history = get_conversation_history(session_id)
    
    # Build conversation context string
    conversation_str = ""
    if history:
        recent = history[-6:]  # Last 3 exchanges
        for msg in recent:
            role = "User" if msg["role"] == "user" else "Jarvis"
            conversation_str += f"{role}: {msg['content']}\n"
    
    # Build machine status summary
    machine_summary = "Current Machine Status:\n"
    for m in machines_data:
        status = m.get("status", "Unknown")
        machine_summary += f"- {m['machine_id']}: {status}, Temp={m.get('temperature')}°C, Health={m.get('health_score')}%\n"
    
    # Add anomaly info if present
    anomaly_str = ""
    if anomalies and anomalies.get("is_anomaly"):
        anomaly_str = "\n⚠️ Anomalies Detected:\n"
        for a in anomalies.get("anomalies", []):
            anomaly_str += f"- {a.get('message')}\n"
    
    # Add prediction info if present
    prediction_str = ""
    if predictions and predictions.get("has_prediction"):
        risk = predictions.get("risk_level", "stable")
        if risk != "stable":
            prediction_str = f"\n📊 Prediction ({predictions.get('machine_id')}):\n"
            prediction_str += f"- Risk Level: {risk}\n"
            prediction_str += f"- {predictions.get('risk_message')}\n"
            ttc = predictions.get("time_to_critical", {})
            for metric, info in ttc.items():
                prediction_str += f"- {info.get('message')}\n"
    
    # Build the full prompt
    prompt = f"""You are Jarvis, an AI assistant for a smart factory monitoring system.
You help operators understand machine status, detect problems, and plan maintenance.

{machine_summary}
{anomaly_str}
{prediction_str}

Previous conversation:
{conversation_str if conversation_str else "(New conversation)"}

User's current question: {current_query}

Respond helpfully and concisely. If asked about a specific machine, focus on that machine.
If the user uses pronouns like "it" or "that one", refer to the machine from the previous context.
Include specific numbers and recommendations when relevant."""

    return prompt


def format_response_for_speech(text: str) -> str:
    """Clean up response for text-to-speech"""
    # Remove markdown formatting
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)  # Italic
    text = re.sub(r'`([^`]+)`', r'\1', text)  # Code
    text = re.sub(r'#{1,6}\s*', '', text)  # Headers
    
    # Replace technical symbols
    text = text.replace('°C', ' degrees Celsius')
    text = text.replace('%', ' percent')
    text = text.replace('>=', ' greater than or equal to ')
    text = text.replace('<=', ' less than or equal to ')
    
    return text
