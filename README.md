# 🤖 JARVIS - Smart Factory Monitoring System

> **AI-Powered Industrial IoT Platform for Smart Manufacturing**

![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![Python](https://img.shields.io/badge/Python-3.10+-yellow)
![React](https://img.shields.io/badge/React-19-61DAFB)

## 🌟 Overview

JARVIS (Just A Rather Very Intelligent System) is a futuristic smart factory monitoring platform that transforms traditional manufacturing floors into intelligent, self-monitoring environments.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🖥️ **Real-Time Monitoring** | Live machine health tracking via WebSocket |
| 🤖 **AI Assistant** | Voice-activated conversational AI (JARVIS) |
| 🔍 **Anomaly Detection** | Automatic detection of unusual patterns |
| 🔮 **Predictive Maintenance** | AI predicts failures before they happen |
| 🎮 **Digital Twin** | What-if scenario simulation engine |
| 📊 **Analytics** | Shift reports, trends, and comparisons |
| 🏆 **Gamification** | Operator leaderboards and achievements |
| 📡 **IoT Integration** | Sensor management and monitoring |

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional) Ollama for local LLM

### Installation

```bash
# Clone the repository
git clone https://github.com/Rithish1201/Jarvis.git
cd Jarvis

# Backend setup
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev

# Start simulation (new terminal)
cd scripts
python simulate_realtime_data.py
```

### Access
- 🌐 **Dashboard**: http://localhost:5173
- 📚 **API Docs**: http://localhost:8000/docs
- 🔌 **WebSocket**: ws://localhost:8000/ws/machines

## 🛠️ Tech Stack

### Backend
- **FastAPI** - High-performance async API
- **SQLAlchemy** - Database ORM
- **WebSockets** - Real-time streaming
- **Pydantic** - Data validation

### Frontend
- **React 19** + Vite - Modern UI
- **TailwindCSS** - Styling
- **Recharts** - Data visualization
- **Web Speech API** - Voice recognition

### AI/ML
- **Ollama/Mistral** - Local LLM
- **Anomaly Detection** - Statistical algorithms
- **Predictive Models** - Failure prediction

## 📁 Project Structure

```
Jarvis/
├── backend/           # FastAPI Backend
│   ├── app/
│   │   ├── api/      # Route handlers
│   │   ├── services/ # Business logic
│   │   └── main.py   # App entry
│   └── requirements.txt
├── frontend/          # React Frontend
│   ├── src/
│   │   ├── components/
│   │   └── App.jsx
│   └── package.json
├── scripts/           # Utilities
│   └── simulate_realtime_data.py
└── data/             # Data storage
```

## 🎯 API Endpoints

| Module | Prefix | Description |
|--------|--------|-------------|
| Machines | `/machines` | Live data & alerts |
| JARVIS AI | `/jarvis` | AI assistant |
| Analytics | `/analytics` | Reports & trends |
| Maintenance | `/maintenance` | Predictive maintenance |
| Simulation | `/simulation` | Digital twin |
| IoT | `/iot` | Sensor management |
| Gamification | `/gamification` | Leaderboards |
| Control | `/control` | Machine control |

## 🖼️ Dashboard Preview

The dashboard features a futuristic Iron Man-inspired HUD with:
- Real-time machine health indicators
- JARVIS AI chat interface
- Voice command support
- Animated visualizations
- Dark theme optimized for industrial use

## 🗣️ Voice Commands

```
"Hey Jarvis, what's the status of MILL-01?"
"Show me all machines with warnings"
"Stop PRESS-03"
"What's the temperature of LATHE-02?"
"Generate a shift report"
```

## 📊 Monitored Metrics

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Temperature | 40-70°C | 70-80°C | >80°C |
| Vibration | 0.2-0.5g | 0.5-0.8g | >0.8g |
| Health Score | 70-100% | 40-70% | <40% |

## 🔮 Future Enhancements

- [ ] Google Gemini API integration
- [ ] Root Cause Analysis Agent
- [ ] RAG with equipment manuals
- [ ] Mobile app (React Native)
- [ ] Multi-factory support

## 📄 License

MIT License - feel free to use for personal and commercial projects.

## 👨‍💻 Author

**Rithish**

---

*Built with ❤️ for the future of smart manufacturing*
