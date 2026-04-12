"""
catalogue.py — Module en cours de développement
Router minimal pour éviter les erreurs d'import sur Railway
"""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter()

@router.get("/catalogue", summary="[À implémenter] catalogue")
async def list_catalogue(
    current_user: dict = Depends(get_current_user)
):
    return {
        "message": "Module 'catalogue' en cours de développement",
        "status": "coming_soon"
    }
