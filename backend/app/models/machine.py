from pydantic import BaseModel
from datetime import datetime

class MachineData(BaseModel):
    machine_id: str
    temperature: float
    vibration: float
    load: float
    timestamp: datetime
