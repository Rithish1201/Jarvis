from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.machines import router as machine_router
from app.api.jarvis import router as jarvis_router
from app.api.websocket import router as websocket_router
from app.api.reports import router as reports_router
from app.api.auth import router as auth_router
from app.api.control import router as control_router
from app.api.analytics import router as analytics_router
from app.api.simulation import router as simulation_router
from app.api.maintenance import router as maintenance_router
from app.api.iot import router as iot_router
from app.api.gamification import router as gamification_router
from app.api.handover import router as handover_router
from app.database import init_db

app = FastAPI(
    title="Jarvis – Smart Factory Monitoring",
    description="AI-powered industrial monitoring system with real-time alerts and predictive analytics",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Initialize database on startup
@app.on_event("startup")
def startup():
    init_db()
    print("[Jarvis] Database initialized")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(machine_router)
app.include_router(jarvis_router)
app.include_router(websocket_router)
app.include_router(reports_router)
app.include_router(control_router)
app.include_router(analytics_router)
app.include_router(simulation_router)
app.include_router(maintenance_router)
app.include_router(iot_router)
app.include_router(gamification_router)
app.include_router(handover_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "service": "Jarvis Smart Factory API",
        "version": "2.0.0",
        "docs": "/docs"
    }
