"""
Gamification & Leaderboard API
Operator performance tracking, achievements, and competitive rankings
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/gamification", tags=["Gamification"])


class Operator(BaseModel):
    id: str
    name: str
    avatar: str
    department: str
    shift: str


class Achievement(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    points: int
    rarity: str  # common, rare, epic, legendary


class OperatorScore(BaseModel):
    operator_id: str
    name: str
    avatar: str
    points: int
    rank: int
    achievements: int
    streak_days: int
    response_time_avg: float
    issues_resolved: int
    uptime_contribution: float


# Sample operators
OPERATORS = [
    {"id": "OP001", "name": "Rajesh Kumar", "avatar": "👨‍🔧", "department": "Machining", "shift": "Day"},
    {"id": "OP002", "name": "Priya Singh", "avatar": "👩‍🔧", "department": "Assembly", "shift": "Day"},
    {"id": "OP003", "name": "Amit Patel", "avatar": "👨‍🏭", "department": "Machining", "shift": "Night"},
    {"id": "OP004", "name": "Sneha Reddy", "avatar": "👩‍🏭", "department": "Quality", "shift": "Day"},
    {"id": "OP005", "name": "Vikram Das", "avatar": "🧑‍🔧", "department": "Maintenance", "shift": "Night"},
]

# Achievement definitions
ACHIEVEMENTS = [
    {"id": "A001", "name": "First Response", "description": "Responded to first alert", "icon": "🚀", "points": 10, "rarity": "common"},
    {"id": "A002", "name": "Speed Demon", "description": "Responded in under 30 seconds", "icon": "⚡", "points": 25, "rarity": "rare"},
    {"id": "A003", "name": "Problem Solver", "description": "Resolved 10 issues", "icon": "🔧", "points": 50, "rarity": "rare"},
    {"id": "A004", "name": "Night Owl", "description": "Worked 10 night shifts", "icon": "🦉", "points": 30, "rarity": "common"},
    {"id": "A005", "name": "Machine Whisperer", "description": "Zero downtime for a week", "icon": "🤖", "points": 100, "rarity": "epic"},
    {"id": "A006", "name": "Perfect Score", "description": "100% efficiency for a shift", "icon": "💯", "points": 75, "rarity": "epic"},
    {"id": "A007", "name": "Team Player", "description": "Helped 5 colleagues", "icon": "🤝", "points": 40, "rarity": "rare"},
    {"id": "A008", "name": "Legend", "description": "Reached 1000 points", "icon": "👑", "points": 200, "rarity": "legendary"},
    {"id": "A009", "name": "Streak Master", "description": "30 day attendance streak", "icon": "🔥", "points": 150, "rarity": "legendary"},
    {"id": "A010", "name": "Quick Learner", "description": "Completed all training", "icon": "📚", "points": 35, "rarity": "common"},
]


def generate_operator_stats(operator: dict, rank: int) -> dict:
    """Generate simulated stats for an operator"""
    base_points = random.randint(500, 2000)
    
    return OperatorScore(
        operator_id=operator["id"],
        name=operator["name"],
        avatar=operator["avatar"],
        points=base_points - (rank * 100),
        rank=rank,
        achievements=random.randint(3, 10),
        streak_days=random.randint(1, 30),
        response_time_avg=round(random.uniform(15, 120), 1),
        issues_resolved=random.randint(5, 50),
        uptime_contribution=round(random.uniform(95, 99.9), 1)
    ).dict()


@router.get("/leaderboard")
def get_leaderboard(timeframe: str = "week") -> Dict:
    """
    Get operator leaderboard rankings.
    Timeframe: day, week, month, all
    """
    # Generate leaderboard
    leaderboard = []
    for i, op in enumerate(OPERATORS):
        stats = generate_operator_stats(op, i + 1)
        leaderboard.append(stats)
    
    # Sort by points
    leaderboard.sort(key=lambda x: x["points"], reverse=True)
    
    # Update ranks
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
    
    return {
        "timeframe": timeframe,
        "leaderboard": leaderboard,
        "updated_at": datetime.now().isoformat()
    }


@router.get("/operator/{operator_id}")
def get_operator_profile(operator_id: str) -> Dict:
    """Get detailed profile for an operator"""
    operator = next((op for op in OPERATORS if op["id"] == operator_id), None)
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")
    
    # Generate achievements earned
    earned = random.sample(ACHIEVEMENTS, k=random.randint(3, 7))
    
    # Recent activity
    activities = [
        {"action": "Resolved critical alert on MILL-01", "points": 25, "time": "2 hours ago"},
        {"action": "Completed daily inspection", "points": 10, "time": "4 hours ago"},
        {"action": "Achieved 'Speed Demon' badge", "points": 25, "time": "Yesterday"},
        {"action": "Helped colleague with maintenance", "points": 15, "time": "2 days ago"},
    ]
    
    return {
        "operator": operator,
        "stats": generate_operator_stats(operator, random.randint(1, 5)),
        "achievements_earned": earned,
        "recent_activity": activities,
        "level": random.randint(5, 25),
        "xp_to_next_level": random.randint(100, 500)
    }


@router.get("/achievements")
def get_all_achievements() -> Dict:
    """Get all available achievements"""
    return {
        "achievements": ACHIEVEMENTS,
        "total": len(ACHIEVEMENTS),
        "by_rarity": {
            "common": [a for a in ACHIEVEMENTS if a["rarity"] == "common"],
            "rare": [a for a in ACHIEVEMENTS if a["rarity"] == "rare"],
            "epic": [a for a in ACHIEVEMENTS if a["rarity"] == "epic"],
            "legendary": [a for a in ACHIEVEMENTS if a["rarity"] == "legendary"]
        }
    }


@router.post("/award")
def award_points(operator_id: str, points: int, reason: str) -> Dict:
    """Award points to an operator"""
    return {
        "success": True,
        "operator_id": operator_id,
        "points_awarded": points,
        "reason": reason,
        "timestamp": datetime.now().isoformat(),
        "message": f"🎉 Awarded {points} points for: {reason}"
    }


@router.get("/weekly-challenge")
def get_weekly_challenge() -> Dict:
    """Get current weekly challenge"""
    challenges = [
        {"name": "Speed Challenge", "description": "Respond to 10 alerts in under 1 minute", "reward": 100, "progress": 7, "target": 10},
        {"name": "Zero Downtime", "description": "Maintain 100% uptime for assigned machines", "reward": 150, "progress": 5, "target": 7},
        {"name": "Team Spirit", "description": "Help 3 colleagues with their tasks", "reward": 75, "progress": 2, "target": 3},
    ]
    
    return {
        "current_challenge": random.choice(challenges),
        "days_remaining": random.randint(1, 7),
        "participants": random.randint(10, 25)
    }
