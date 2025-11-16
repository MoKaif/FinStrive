"""Account API endpoints."""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.models import Account, AccountBalance, Posting
from app.schemas import Account as AccountSchema, AccountBalanceResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])


def model_to_schema(account: Account, balance: Optional[AccountBalance] = None) -> AccountSchema:
    """Convert database model to schema."""
    return AccountSchema(
        id=account.id,
        name=account.name,
        full_path=account.full_path,
        parent_id=account.parent_id,
        balance=balance.balance if balance else None,
        currency=balance.currency if balance else "INR",
        children=[model_to_schema(child) for child in account.children],
    )


@router.get("", response_model=list[AccountSchema])
async def get_accounts(db: Session = Depends(get_db)):
    """Get account tree with balances."""
    # Get root accounts (no parent)
    root_accounts = db.query(Account).filter(Account.parent_id == None).all()
    
    # Get all balances
    balances = {b.account_id: b for b in db.query(AccountBalance).all()}
    
    # Build tree recursively with aggregated balances
    def build_account_tree(account: Account) -> AccountSchema:
        balance = balances.get(account.id)
        children = [build_account_tree(child) for child in account.children]
        
        # Calculate aggregated balance (sum of all children if this is a parent account)
        account_balance = balance.balance if balance else None
        if children:
            # Aggregate child balances for parent accounts
            child_balances = [c.balance for c in children if c.balance is not None]
            if child_balances:
                aggregated = sum(child_balances)
                # Use aggregated if no direct balance, or combine if both exist
                if account_balance is None:
                    account_balance = aggregated
                # For Assets/Income/Expenses, we typically want to see the sum
                elif account.full_path in ["Assets", "Income", "Expenses"]:
                    account_balance = aggregated
        
        return AccountSchema(
            id=account.id,
            name=account.name,
            full_path=account.full_path,
            parent_id=account.parent_id,
            balance=account_balance,
            currency=balance.currency if balance else "INR",
            children=children,
        )
    
    return [build_account_tree(acc) for acc in root_accounts]


@router.get("/{account_path}/balance", response_model=AccountBalanceResponse)
async def get_account_balance(
    account_path: str,
    db: Session = Depends(get_db),
):
    """Get balance for a specific account."""
    account = db.query(Account).filter(Account.full_path == account_path).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    balance = db.query(AccountBalance).filter(
        AccountBalance.account_id == account.id
    ).first()
    
    if not balance:
        return AccountBalanceResponse(
            account_id=account.id,
            account_path=account.full_path,
            balance=0,
            currency="INR",
        )
    
    return AccountBalanceResponse(
        account_id=account.id,
        account_path=account.full_path,
        balance=balance.balance,
        currency=balance.currency,
    )

