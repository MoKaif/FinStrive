"""Analytics API endpoints."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_, extract
from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.models import Transaction, Posting, Account
from app.schemas import MonthlyAnalytics, CategoryAnalytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/monthly", response_model=list[MonthlyAnalytics])
async def get_monthly_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    """Get monthly income/expense breakdown."""
    # Query transactions
    query = select(
        extract('year', Transaction.date).label('year'),
        extract('month', Transaction.date).label('month'),
        Account.full_path,
        Posting.amount,
    ).select_from(Transaction).join(Posting).join(Account).where(Posting.amount != 0)
    
    if start_date:
        query = query.where(Transaction.date >= start_date)
    if end_date:
        query = query.where(Transaction.date <= end_date)
    
    results = db.execute(query).all()
    
    # Aggregate by month
    monthly_data = {}
    
    for year, month, account_path, amount in results:
        month_key = f"{int(year)}-{int(month):02d}"
        if month_key not in monthly_data:
            monthly_data[month_key] = {"income": Decimal("0.00"), "expenses": Decimal("0.00")}
        
        # Categorize by account path
        # In double-entry: Income accounts decrease with positive amounts (credits)
        # So negative balance = positive income
        amount_decimal = Decimal(str(amount))
        if account_path.startswith("Income"):
            # Income postings are typically negative in ledger, so flip sign for display
            monthly_data[month_key]["income"] += abs(amount_decimal)
        elif account_path.startswith("Expenses"):
            # Expense postings are positive (debits)
            monthly_data[month_key]["expenses"] += abs(amount_decimal)
    
    # Convert to response format
    analytics = []
    for month_key in sorted(monthly_data.keys()):
        data = monthly_data[month_key]
        net = data["income"] - data["expenses"]
        analytics.append(MonthlyAnalytics(
            month=month_key,
            income=data["income"],
            expenses=data["expenses"],
            net=net,
        ))
    
    return analytics


@router.get("/categories", response_model=list[CategoryAnalytics])
async def get_category_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    """Get expense breakdown by category."""
    # Query expenses
    query = select(
        Account.full_path,
        func.sum(Posting.amount).label('total'),
        func.count(Posting.id).label('count'),
        Posting.currency,
    ).select_from(Posting).join(Transaction).join(Account).where(
        and_(
            Account.full_path.like("Expenses:%"),
            Posting.amount != 0,
        )
    ).group_by(Account.full_path, Posting.currency)
    
    if start_date:
        query = query.where(Transaction.date >= start_date)
    if end_date:
        query = query.where(Transaction.date <= end_date)
    
    results = db.execute(query).all()
    
    # Extract category from full_path (e.g., "Expenses:Food" -> "Food")
    category_map = {}
    
    for account_path, total, count, currency in results:
        parts = account_path.split(':')
        if len(parts) >= 2:
            category = parts[1]  # First level under Expenses
        else:
            category = account_path
        
        if category not in category_map:
            category_map[category] = {
                "total": Decimal("0.00"),
                "count": 0,
                "currency": currency or "INR",
            }
        
        category_map[category]["total"] += Decimal(str(total))
        category_map[category]["count"] += count
    
    # Convert to response format
    analytics = []
    for category, data in sorted(category_map.items(), key=lambda x: x[1]["total"], reverse=True):
        analytics.append(CategoryAnalytics(
            category=category,
            total=data["total"],
            currency=data["currency"],
            transaction_count=data["count"],
        ))
    
    return analytics

