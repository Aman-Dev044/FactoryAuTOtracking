from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "trackbells-erp-ai-brain",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }
