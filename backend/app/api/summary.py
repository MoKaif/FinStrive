"""Summary/dashboard API endpoints for quick balance overview."""
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import APIRouter, Depends
from decimal import Decimal

from app.database import get_db
from app.models import Account, AccountBalance

router = APIRouter(prefix="/summary", tags=["summary"])


@router.get("/bank-balance")
async def get_bank_balance(db: Session = Depends(get_db)):
    """Get current bank balance (only Assets:Banking accounts, excluding investments).
    
    This calculates the actual money available in banking accounts,
    excluding investments, which should be separate.
    """
    from app.models import Posting as PostingModel
    
    # Find all banking accounts (only actual bank accounts, not investments)
    banking_accounts = db.query(Account).filter(
        Account.full_path.like("Assets:Banking:%")
    ).all()
    
    if not banking_accounts:
        return {
            "balance": Decimal("0.00"),
            "currency": "INR",
            "message": "No banking accounts found"
        }
    
    # Calculate balance directly from postings (not from cached balance)
    # This ensures accuracy
    total_balance = Decimal("0.00")
    currency = "INR"
    
    for account in banking_accounts:
        # Get all postings to this banking account
        postings = db.query(PostingModel).filter(
            PostingModel.account_id == account.id
        ).all()
        
        if postings:
            # Sum all postings: positive = money in, negative = money out
            account_balance = sum(Decimal(str(p.amount)) for p in postings)
            total_balance += account_balance
            currency = postings[0].currency
    
    return {
        "balance": total_balance,
        "currency": currency,
        "account_count": len(banking_accounts),
        "account_names": [acc.full_path for acc in banking_accounts]
    }

