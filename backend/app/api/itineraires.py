"""
itineraires.py — Module en cours de développement
Router minimal pour éviter les erreurs d'import sur Railway
"""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter()

@router.get("/itineraires", summary="[À implémenter] itineraires")
async def list_itineraires(
    current_user: dict = Depends(get_current_user)
):
    return {
        "message": "Module 'itineraires' en cours de développement",
        "status": "coming_soon"
    }
