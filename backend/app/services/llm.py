import requests
import re

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
    if any(word in prompt_lower for word in ["status", "how are", "running", "overview"]):
        return "All factory systems are currently being monitored. Check the dashboard for real-time machine status - green indicators show healthy machines, yellow shows warnings, and red indicates critical issues requiring attention."
    
    # Temperature queries
    if "temperature" in prompt_lower or "temp" in prompt_lower:
        return "I'm monitoring temperature sensors across all machines. You can see live temperature readings in the metrics panel at the bottom of the dashboard. If any machine exceeds safe thresholds, I'll alert you immediately."
    
    # Health queries
    if "health" in prompt_lower:
        return "Machine health is calculated based on multiple factors: temperature, vibration levels, and operational patterns. The HEALTH metric on the dashboard shows the overall factory health percentage."
    
    # Vibration queries
    if "vibration" in prompt_lower:
        return "Vibration monitoring helps detect mechanical issues before they cause failures. Unusual vibration patterns can indicate bearing wear, misalignment, or other mechanical problems."
    
    # Alert queries
    if any(word in prompt_lower for word in ["alert", "warning", "critical", "problem", "issue"]):
        return "I continuously monitor for anomalies. Check the Alerts panel for current warnings. Critical alerts appear in red and require immediate attention. Warning alerts in yellow should be investigated soon."
    
    # Maintenance queries
    if any(word in prompt_lower for word in ["maintenance", "repair", "fix", "predict"]):
        return "Based on historical patterns and current sensor data, I can predict when machines will need maintenance. Visit the MAINT panel to see maintenance schedules and recommendations for each machine."
    
    # Help queries
    if any(word in prompt_lower for word in ["help", "what can you do", "capabilities", "features"]):
        return "I can help you with: 📊 Real-time machine monitoring, 🔔 Anomaly detection & alerts, 🔮 Predictive maintenance, 📈 Analytics & trends, 🎯 Machine control commands, and 📋 Report generation. Just ask me anything about your factory!"
    
    # Machine specific queries
    machine_match = re.search(r'machine[_\s]?(\d+|[a-z]+)', prompt_lower)
    if machine_match:
        machine_id = machine_match.group(1)
        return f"For detailed information about Machine {machine_id.upper()}, click on it in the MACHINES panel. I'll show you its current status, historical trends, and any predictions for upcoming maintenance needs."
    
    # Report queries
    if "report" in prompt_lower:
        return "I can generate various reports including daily summaries, maintenance logs, and performance analytics. Use the export feature in the top navigation to download reports in PDF or Excel format."
    
    # Simulation queries
    if "simulat" in prompt_lower:
        return "The SIMULATE panel lets you run digital twin simulations to test different scenarios and predict outcomes without affecting real machines. Great for planning and optimization!"
    
    # IoT queries
    if "iot" in prompt_lower or "sensor" in prompt_lower:
        return "The IOT panel shows all connected sensors and their real-time readings. You can configure alerts and thresholds for each sensor type."
    
    # Default response
    return "I'm Jarvis, your factory AI assistant. I'm here to help monitor your machines and keep everything running smoothly. You can ask me about machine status, temperature readings, maintenance predictions, or any alerts. What would you like to know?"


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
            timeout=30  # Reduced timeout for faster fallback
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
        return get_fallback_response(prompt)
    except Exception as e:
        # Any other error - use fallback
        print(f"[Jarvis] LLM error: {e}, using fallback")
        return get_fallback_response(prompt)
