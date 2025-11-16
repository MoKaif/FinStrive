"""Export API endpoints."""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.database import get_db
from app.services.excel_export import export_transactions_to_excel

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/excel")
async def export_excel(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    account_path: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Export transactions to Excel file."""
    filters = {
        "start_date": start_date,
        "end_date": end_date,
        "account_path": account_path,
        "search": search,
    }
    
    excel_file = export_transactions_to_excel(db, filters)
    
    filename = f"finstrive_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

