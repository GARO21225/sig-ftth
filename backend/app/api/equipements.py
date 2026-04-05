"""
equipements.py — Module en cours de développement
Router minimal pour éviter les erreurs d'import sur Railway
"""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter()

@router.get("/equipements", summary="[À implémenter] equipements")
async def list_equipements(
    current_user: dict = Depends(get_current_user)
):
    return {
        "message": "Module 'equipements' en cours de développement",
        "status": "coming_soon"
    }
