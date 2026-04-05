"""
import_dwg.py — Module en cours de développement
Router minimal pour éviter les erreurs d'import sur Railway
"""
from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter()

@router.get("/import_dwg", summary="[À implémenter] import_dwg")
async def list_import_dwg(
    current_user: dict = Depends(get_current_user)
):
    return {
        "message": "Module 'import_dwg' en cours de développement",
        "status": "coming_soon"
    }
