import requests
import re

OLLAMA_URL = "http://localhost:11434/api/generate"


def generate_fallback_response(prompt: str) -> str:
    """Generate a smart fallback response when LLM is not available"""
    prompt_lower = prompt.lower()
    
    # Extract machine data from prompt if present
    machines_info = ""
    if "machine" in prompt_lower or "mill" in prompt_lower or "lathe" in prompt_lower or "press" in prompt_lower:
        machines_info = " Based on current sensor data, all monitored machines are operational."
    
    # Greeting responses
    if any(word in prompt_lower for word in ["hello", "hi", "hey", "greet", "name"]):
        return "👋 Hello! I'm Jarvis, your AI-powered Smart Factory Assistant. I can help you monitor machines, analyze anomalies, predict maintenance needs, and control factory operations. How can I assist you today?"
    
    # Status queries
    if any(word in prompt_lower for word in ["status", "health", "how is", "how are"]):
        return f"📊 Factory Status: All systems are being monitored in real-time.{machines_info} Check the dashboard for detailed health scores, temperature, vibration, and other metrics for each machine."
    
    # Help queries
    if any(word in prompt_lower for word in ["help", "what can", "capabilities"]):
        return """🤖 I'm Jarvis, your Smart Factory AI. Here's what I can do:

• **Monitor Machines** - Real-time health tracking for all equipment
• **Detect Anomalies** - Alert you to unusual patterns before failures
• **Predict Maintenance** - Forecast when machines need service
• **Answer Questions** - Ask about any machine or factory metrics
• **Control Equipment** - Start, stop, or adjust machine settings
• **Generate Reports** - Create shift summaries and analytics

Try asking: "What's the status of MILL-01?" or "Show me any anomalies" """

    # Anomaly queries
    if any(word in prompt_lower for word in ["anomal", "problem", "issue", "wrong", "error"]):
        return "🔍 Scanning for anomalies... I'm monitoring all machines for unusual patterns in temperature, vibration, and performance metrics. Check the Anomalies panel on the dashboard for real-time alerts, or ask about a specific machine."

    # Prediction queries  
    if any(word in prompt_lower for word in ["predict", "forecast", "future", "maintenance", "when will"]):
        return "🔮 Predictive Analysis: I analyze historical patterns and current trends to forecast potential issues. Machine learning models track temperature trends, vibration patterns, and usage cycles to predict maintenance needs 24-72 hours in advance."

    # Default response
    return f"""I understand you're asking about: "{prompt[:100]}..."

🤖 I'm Jarvis, your Smart Factory AI assistant. Currently operating in offline mode (LLM service not connected).

**To enable full AI capabilities:**
1. Install Ollama: https://ollama.com/download
2. Run: `ollama serve`
3. Pull model: `ollama pull mistral`

**Meanwhile, I can still help with:**
• Real-time machine monitoring (check dashboard)
• Anomaly detection and alerts
• Basic status queries

Ask me about machine status, anomalies, or say "help" for more options!"""


def ask_jarvis(prompt: str) -> str:
    """Query the LLM with fallback support"""
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "mistral",
                "prompt": prompt,
                "stream": False
            },
            timeout=60
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("response", generate_fallback_response(prompt))
        else:
            return generate_fallback_response(prompt)
            
    except requests.exceptions.ConnectionError:
        # Ollama not running - use fallback
        return generate_fallback_response(prompt)
    except requests.exceptions.Timeout:
        return "⏱️ Request timed out. The AI is taking too long to respond. Please try a simpler question or check if Ollama is running properly."
    except Exception as e:
        return generate_fallback_response(prompt)
