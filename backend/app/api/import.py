"""Import API endpoints."""
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.importer import import_ledger
from app.schemas import ImportResponse
from app.config import settings

router = APIRouter(prefix="/import", tags=["import"])


@router.post("", response_model=ImportResponse)
async def import_ledger_file(
    file_path: str | None = None,
    db: Session = Depends(get_db),
):
    """Trigger manual import of ledger file."""
    ledger_path = Path(file_path) if file_path else None
    
    try:
        result = import_ledger(db, ledger_path)
        
        return ImportResponse(
            imported=result["imported"],
            skipped=result["skipped"],
            total_parsed=result["total_parsed"],
            message=f"Successfully imported {result['imported']} transactions",
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

