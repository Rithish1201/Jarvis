# 🤖 JARVIS — Smart Factory Monitoring System

**AI-Powered Industrial IoT Platform for Smart Manufacturing**

Real-Time Monitoring • Predictive Analytics • Conversational AI • Machine Commissioning Advisor

---

## 📋 Project Overview

JARVIS (Just A Rather Very Intelligent System) is a full-stack AI-powered smart factory monitoring platform that transforms traditional manufacturing floors into intelligent, self-monitoring environments. It provides real-time sensor monitoring, predictive maintenance, anomaly detection, and a conversational AI assistant — all through an Iron Man-inspired futuristic HUD interface.

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Python 3.10+ | Core backend language |
| FastAPI | High-performance async REST API framework |
| SQLAlchemy | ORM for database operations |
| Pydantic | Request/response data validation |
| SQLite | Embedded relational database |
| WebSockets | Real-time bidirectional data streaming |
| Uvicorn | ASGI server |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 | UI component framework |
| Vite | Build tool & dev server |
| TailwindCSS | Utility-first CSS styling |
| Lucide React | Icon library |
| React Hot Toast | Notification toasts |
| Web Speech API | Browser-native voice recognition & text-to-speech |
| Fetch API | HTTP client for API calls |

### AI / ML
| Technology | Purpose |
|-----------|---------|
| Ollama + Mistral | Local LLM for conversational AI assistant |
| Python `statistics` | Statistical analysis (mean, stdev) for anomaly detection |

---

## ✨ Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | 🖥️ Real-Time Machine Monitoring | Live tracking of machine health, temperature, vibration, and RPM via WebSocket streaming. Color-coded status indicators (Healthy/Warning/Critical). |
| 2 | 🤖 JARVIS AI Assistant | Conversational AI via voice or text. Supports 3 languages — English, Tamil, and Tanglish. |
| 3 | 🗣️ Voice Command System | Hands-free control using Web Speech API. Speak commands to check machine status or generate reports. |
| 4 | 🔍 Anomaly Detection | Automatic detection of unusual sensor patterns. Generates alerts when values exceed thresholds. |
| 5 | 🔮 Digital Twin Simulation | "What-if" scenario engine — simulate parameter changes and see predicted outcomes before applying them. |
| 6 | 🔧 Predictive Maintenance | AI predicts failures before they happen based on sensor trends. Provides maintenance scheduling. |
| 7 | 📊 Analytics Dashboard | Shift reports, trend analysis, cross-machine comparisons, and data export. |
| 8 | 📡 IoT Sensor Management | Dedicated panel for managing and monitoring all connected sensors. |
| 9 | 🎮 Factory Command Center | Centralized control for machine operations (start/stop/adjust) and factory monitoring. |
| 10 | 🏆 Gamification & Leaderboards | Operator leaderboards and achievements to encourage best practices. |
| 11 | 🔄 Shift Handover | Structured handover system for passing critical information between shifts. |
| 12 | 🏭 New Machine Commissioning Advisor | Analyzes historical data to generate data-driven recommendations when setting up new machines — safe limits, risk assessments, configuration suggestions. |
| 13 | 📥 Report Export | Download reports as PDF or CSV. |
| 14 | 🔐 Authentication | User authentication for secure access. |
| 15 | 🌐 Multi-Language UI | Full interface translations for English, Tamil, and Tanglish. |

---

## 📐 Algorithms Used

### 1. Statistical Threshold Detection (μ ± kσ)
- **Used in:** Commissioning Advisor — safe operating limits
- **How:** Collects sensor values from healthy machines (health_score > 60), computes mean (μ) and standard deviation (σ), then sets thresholds: Optimal = μ, Warning = μ + σ, Critical = μ + kσ
- **Different k-values per parameter:** Temperature: 2.0, Vibration: 2.5, RPM: 1.5

### 2. Alert Pattern Frequency Analysis
- **Used in:** Failure Pattern Mining
- **How:** Groups historical alerts by (alert_type, severity), ranks by occurrence count, classifies frequency as High (>10), Medium (>5), Low (≤5)

### 3. Rule-Based Risk Assessment
- **Used in:** Operational Risk Analysis
- **How:** Decision tree / rule engine evaluating conditions like: power > 20kW → medium risk, rpm_alerts > 5 AND rated_rpm > 2500 → high risk, humidity environment AND temp_alerts > 3 → high risk

### 4. Z-Score / Statistical Anomaly Detection
- **Used in:** Anomaly Detector service
- **How:** Monitors real-time sensor readings against historical baselines, flags values deviating significantly from the norm

### 5. Trend-Based Predictive Maintenance
- **Used in:** Predictor service
- **How:** Analyzes sensor value trends over time, extrapolates degradation curves to predict failure, generates maintenance scheduling recommendations

### 6. Weighted Health Scoring
- **Used in:** Across the system
- **How:** Combines temperature, vibration, and RPM readings into a single health_score (0-100%). Status: Healthy (>70%), Warning (40-70%), Critical (<40%)

### 7. LLM-Based Natural Language Processing
- **Used in:** JARVIS AI Assistant
- **How:** Processes voice/text queries through Ollama (Mistral model), context-aware conversation management, multi-language response generation

### 8. Real-Time Data Streaming (Pub-Sub Pattern)
- **Used in:** WebSocket communication
- **How:** Server pushes live machine data to all connected clients, observer pattern with automatic reconnection

---

## 🏗️ Project Structure

```
Jarvis/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── api/
│   │   │   └── commissioning.py    # Commissioning API endpoints
│   │   ├── models/
│   │   │   └── machine_data.py     # SQLAlchemy ORM models
│   │   └── services/
│   │       ├── commissioning.py    # Commissioning analysis logic
│   │       ├── anomaly_detector.py # Anomaly detection
│   │       ├── predictor.py        # Predictive maintenance
│   │       └── llm.py             # AI assistant integration
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main application shell
│   │   ├── CommissioningPanel.jsx  # Machine commissioning UI
│   │   └── AnalyticsDashboard.jsx  # Analytics panel
│   └── package.json
├── scripts/
│   └── simulate_realtime_data.py   # Data simulation script
├── data/                           # SQLite database files
└── README.md
```

---

## 🚀 How to Run

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0

# Frontend
cd frontend
npm install
npm run dev

# Data Simulator
python scripts/simulate_realtime_data.py
```

---

**JARVIS — Smart Factory Monitoring System v2.0.0**
© 2026 Rithish. All rights reserved.
