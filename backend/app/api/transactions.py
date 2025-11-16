"""Transaction API endpoints."""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_, func
from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.models import Transaction as TransactionModel, Posting, Account
from app.schemas import (
    Transaction as TransactionSchema,
    TransactionListResponse,
    TransactionFilter,
    Posting as PostingSchema,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


def model_to_schema(transaction: TransactionModel) -> TransactionSchema:
    """Convert database model to schema with proper amount display."""
    from decimal import Decimal
    
    postings = []
    for posting in transaction.postings:
        account_path = posting.account.full_path
        amount = Decimal(str(posting.amount))
        
        # For display: adjust amounts based on account type for clarity
        # Assets: positive = money coming in
        # Income: negative in DB = income earned (show as positive)
        # Expenses: positive = expense (already correct)
        
        display_amount = amount
        if account_path.startswith("Income"):
            # Income: flip sign for display (negative in DB = positive income)
            display_amount = -amount
        
        postings.append(PostingSchema(
            id=posting.id,
            transaction_id=posting.transaction_id,
            account_id=posting.account_id,
            account_path=account_path,
            amount=display_amount,
            currency=posting.currency,
        ))
    
    return TransactionSchema(
        id=transaction.id,
        date=transaction.date,
        payee=transaction.payee,
        description=transaction.description,
        postings=postings,
        imported_at=transaction.imported_at,
    )


@router.get("", response_model=TransactionListResponse)
async def get_transactions(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    account_path: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get list of transactions with filtering and pagination."""
    query = select(TransactionModel)
    
    # Apply filters
    conditions = []
    
    if start_date:
        conditions.append(TransactionModel.date >= start_date)
    
    if end_date:
        conditions.append(TransactionModel.date <= end_date)
    
    if account_path:
        # Find account and filter by postings
        account = db.query(Account).filter(Account.full_path == account_path).first()
        if account:
            subquery = select(Posting.transaction_id).filter(Posting.account_id == account.id)
            conditions.append(TransactionModel.id.in_(subquery))
        else:
            # Account doesn't exist, return empty result
            return TransactionListResponse(
                transactions=[],
                total=0,
                page=page,
                page_size=page_size,
            )
    
    if search:
        search_term = f"%{search}%"
        conditions.append(
            or_(
                TransactionModel.payee.ilike(search_term),
                TransactionModel.description.ilike(search_term),
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Get total count
    count_query = select(func.count()).select_from(TransactionModel)
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total = db.execute(count_query).scalar() or 0
    
    # Apply pagination
    query = query.order_by(TransactionModel.date.desc(), TransactionModel.id.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    # Execute query
    transactions = db.execute(query).scalars().all()
    
    # Convert to schemas
    transaction_schemas = [model_to_schema(t) for t in transactions]
    
    return TransactionListResponse(
        transactions=transaction_schemas,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{transaction_id}", response_model=TransactionSchema)
async def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
):
    """Get a single transaction by ID."""
    transaction = db.query(TransactionModel).filter(
        TransactionModel.id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return model_to_schema(transaction)

