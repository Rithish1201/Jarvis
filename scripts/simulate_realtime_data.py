import json
import time
from datetime import datetime
from pathlib import Path
import random

BASE_DIR = Path(__file__).resolve().parents[1]
REALTIME_DIR = BASE_DIR / "data" / "realtime"

REALTIME_DIR.mkdir(parents=True, exist_ok=True)

MACHINES = ["MILL-01", "LATHE-02", "PRESS-03"]

while True:
    data = []

    for machine in MACHINES:
        data.append({
            "machine_id": machine,
            "temperature": round(random.uniform(40, 90), 2),
            "vibration": round(random.uniform(0.2, 1.5), 3),
            "status": random.choice(["RUNNING", "IDLE", "FAULT"]),
            "timestamp": datetime.utcnow().isoformat()
        })

    filename = REALTIME_DIR / f"machines_{int(time.time())}.json"

    with open(filename, "w") as f:
        json.dump(data, f, indent=2)

    print(f"[+] Generated {filename.name}")
    time.sleep(5)
