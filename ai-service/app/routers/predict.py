from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/predict", tags=["Prediction & Calculation"])

class ShotRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_number: str
    shortage_meters: float

class ShotResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_number: str
    shortage_meters: float
    shots_needed: int
    nylon_kg: float
    time_hrs: float

@router.post("/shots", response_model=ShotResponse)
async def calculate_shots(req: ShotRequest):
    """
    AI Algorithm for calculating required shots based on meter shortage.
    Currently using a rule-based algorithm:
    - 1 meter of chain = 25 shots
    - 1000 shots = 8 kg Nylon
    - Factory produces 500 shots per hour
    """
    
    # 1 meter requires 25 shots
    shots_needed = int(req.shortage_meters * 25)
    
    # 1000 shots take 8kg -> 1 shot = 0.008 kg
    nylon_kg = round(shots_needed * 0.008, 2)
    
    # 500 shots per hour -> 1 shot = 1/500 hrs
    time_hrs = round(shots_needed / 500.0, 1)

    return ShotResponse(
        model_number=req.model_number,
        shortage_meters=req.shortage_meters,
        shots_needed=shots_needed,
        nylon_kg=nylon_kg,
        time_hrs=time_hrs
    )
