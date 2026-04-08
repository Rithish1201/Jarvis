---
marp: true
theme: default
class: lead
backgroundColor: #1a1a2e
color: #e0e0e0
style: |
  h1, h2, h3, h4 { color: #00f0ff; text-shadow: 0 0 10px rgba(0, 240, 255, 0.5); font-family: 'Inter', sans-serif; }
  a { color: #ff0055; text-decoration: none; }
  .highlight { color: #ff0055; font-weight: bold; }
  .box { background: rgba(0, 240, 255, 0.1); border: 1px solid #00f0ff; border-radius: 8px; padding: 20px; }
---

# 🤖 JARVIS

### Smart Factory Monitoring System

v2.0.0 | AI-Powered Industrial IoT Platform

Built by **Rithish**

---

## 🏭 The Vision

Transforming traditional manufacturing floors into **intelligent, self-monitoring** environments.

* Go beyond simple dashboards with a **conversational AI assistant**
* Predict failures **before** they cause downtime
* Empower operators with an **Iron Man-inspired futuristic HUD**

---

## ✨ Core Capabilities

* **🖥️ Real-Time Monitoring:** Live WebSocket tracking of machine health, temp, vibration.
* **🔮 Predictive Maintenance:** AI predicts failure paths to schedule maintenance.
* **🤖 JARVIS AI Assistant:** Multi-lingual (English, Tamil, Tanglish) Voice Commands.
* **⚡ Commissioning Advisor:** Data-driven recommendations for safe limits on new machines.

---

## 🧠 Intelligence Layer

| Algorithm | Application |
|---|---|
| **Z-Score Anomalies** | Monitors real-time streams against historical baselines |
| **Thresholds (μ ± kσ)** | Computes precise safe boundaries from empirical data |
| **Weighted Health Scoring** | Fuses Temp, Vibration, RPM into a 0-100% index |
| **LLM NLP (Ollama)** | Context-aware intent parsing and response generation locally |

---

## 🛠️ Technology Stack

* **Backend:** Python 3.10+, FastAPI, WebSockets, SQLAlchemy, SQLite
* **Frontend:** React 19, Vite, TailwindCSS, Web Speech API, Recharts
* **AI Engine:** Ollama (Mistral locally hosted)

---

## 🚀 Future Roadmap

* 🌐 **Google Gemini Integration**
* 🔍 **Root Cause Analysis Agent**
* 📚 **RAG with Equipment Manuals**
* 📱 **Mobile App (React Native)**
* 🏢 **Multi-factory Support**

---

# Ready for Deployment

*"Built with ❤️ for the future of smart manufacturing"*

Launch Dashboard: http://localhost:5173
