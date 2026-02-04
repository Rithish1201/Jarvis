import requests
import re
from datetime import datetime

OLLAMA_URL = "http://localhost:11434/api/generate"


def get_fallback_response(prompt: str) -> str:
    """
    Intelligent fallback responses when Ollama is not available.
    Handles common queries about machines, status, and general conversation.
    """
    prompt_lower = prompt.lower()
    
    # Greetings and identity
    if any(word in prompt_lower for word in ["hello", "hi", "hey", "name", "who are you", "introduce"]):
        return "Hello! I'm Jarvis, your AI-powered Smart Factory Assistant. I help monitor machines, detect anomalies, predict maintenance needs, and keep your factory running smoothly. How can I assist you today?"
    
    # Status queries
    if any(word in prompt_lower for word in ["status", "how are", "running", "overview", "health"]):
        return "All factory systems are currently being monitored. Check the dashboard for real-time machine status - green indicators show healthy machines, yellow shows warnings, and red indicates critical issues requiring attention."
    
    # Temperature queries
    if "temperature" in prompt_lower or "temp" in prompt_lower:
        return "I'm monitoring temperature sensors across all machines. You can see live temperature readings in the metrics panel at the bottom of the dashboard. If any machine exceeds safe thresholds, I'll alert you immediately."
    
    # Vibration queries
    if "vibration" in prompt_lower:
        return "Vibration monitoring helps detect mechanical issues before they cause failures. Unusual vibration patterns can indicate bearing wear, misalignment, or other mechanical problems."
    
    # Alert queries
    if any(word in prompt_lower for word in ["alert", "warning", "critical", "problem", "issue", "wrong", "error"]):
        return "I continuously monitor for anomalies. Check the Alerts panel for current warnings. Critical alerts appear in red and require immediate attention. Warning alerts in yellow should be investigated soon."
    
    # Maintenance queries
    if any(word in prompt_lower for word in ["maintenance", "repair", "fix", "predict", "forecast", "future"]):
        return "Based on historical patterns and current sensor data, I can predict when machines will need maintenance. Visit the MAINT panel to see maintenance schedules and recommendations for each machine."
    
    # Help queries
    if any(word in prompt_lower for word in ["help", "what can you do", "capabilities", "features"]):
        return """🤖 I'm Jarvis, your Smart Factory AI. Here's what I can do:

• **Monitor Machines** - Real-time health tracking for all equipment
• **Detect Anomalies** - Alert you to unusual patterns before failures
• **Predict Maintenance** - Forecast when machines need service
• **Answer Questions** - Ask about any machine or factory metrics
• **Control Equipment** - Start, stop, or adjust machine settings
• **Generate Reports** - Create shift summaries and analytics

Try asking: "What's the status of MILL-01?" or "Show me any anomalies" """
    
    # Machine specific queries
    machine_match = re.search(r'machine[_\s]?(\d+|[a-z]+[_\-]?[0-9]*)', prompt_lower)
    if machine_match:
        machine_id = machine_match.group(1).upper()
        return f"For detailed information about Machine {machine_id}, click on it in the MACHINES panel. I'll show you its current status, historical trends, and any predictions for upcoming maintenance needs."
    
    # Report queries
    if "report" in prompt_lower:
        return "I can generate various reports including daily summaries, maintenance logs, and performance analytics. Use the export feature in the top navigation to download reports in PDF or Excel format."
    
    # Simulation/Commissioning queries
    if "simulat" in prompt_lower or "commission" in prompt_lower:
        return "The NEW (Commissioning) panel allows you to analyze historical data to properly set up new machinery, while the SIMULATE panel lets you run digital twin scenarios. Both help in optimizing your factory operations!"
    
    # IoT queries
    if "iot" in prompt_lower or "sensor" in prompt_lower:
        return "The IOT panel shows all connected sensors and their real-time readings. You can configure alerts and thresholds for each sensor type."
    
    # Default response
    return f"""I understand you're asking about: "{prompt[:100]}..."

🤖 I'm Jarvis, your Smart Factory AI assistant. Currently operating in offline mode (LLM service not connected).

**To enable full AI capabilities:**
1. Install Ollama: https://ollama.com/download
2. Run: `ollama serve`
3. Pull model: `ollama pull mistral`

Meanwhile, I can still help with real-time machine monitoring, anomaly detection, and basic status queries. What else can I help you with today?"""


def ask_jarvis(prompt: str) -> str:
    """
    Query Jarvis AI using Ollama, with intelligent fallback if unavailable.
    """
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "mistral",
                "prompt": prompt,
                "stream": False
            },
            timeout=30  # Wait up to 30s for the LLM
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("response", get_fallback_response(prompt))
        else:
            return get_fallback_response(prompt)
            
    except requests.exceptions.ConnectionError:
        # Ollama not running - use fallback
        return get_fallback_response(prompt)
    except requests.exceptions.Timeout:
        # Ollama too slow - use fallback
        return f"⏱️ Request timed out. The AI is taking too long to respond. Falling back to basic assistance:\n\n{get_fallback_response(prompt)}"
    except Exception as e:
        # Any other error - use fallback
        print(f"[Jarvis] LLM error: {e}, using fallback")
        return get_fallback_response(prompt)
