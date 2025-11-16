"""Excel export service for transactions."""
import io
from datetime import datetime
from typing import Optional, Dict
from decimal import Decimal

import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_

from app.models import Transaction, Posting, Account


def export_transactions_to_excel(
    db: Session,
    filters: Dict[str, Optional[any]] = None
) -> io.BytesIO:
    """Export transactions to Excel format."""
    if filters is None:
        filters = {}
    
    # Build query
    query = select(Transaction).order_by(Transaction.date.desc(), Transaction.id.desc())
    
    conditions = []
    
    if filters.get("start_date"):
        conditions.append(Transaction.date >= filters["start_date"])
    
    if filters.get("end_date"):
        conditions.append(Transaction.date <= filters["end_date"])
    
    if filters.get("account_path"):
        account = db.query(Account).filter(Account.full_path == filters["account_path"]).first()
        if account:
            subquery = select(Posting.transaction_id).filter(Posting.account_id == account.id)
            conditions.append(Transaction.id.in_(subquery))
        else:
            # Return empty result
            df = pd.DataFrame(columns=[
                "Date", "Payee", "Description", "Account", "Amount", "Currency", "Balance"
            ])
            output = io.BytesIO()
            df.to_excel(output, index=False, engine="openpyxl")
            output.seek(0)
            return output
    
    if filters.get("search"):
        search_term = f"%{filters['search']}%"
        conditions.append(
            or_(
                Transaction.payee.ilike(search_term),
                Transaction.description.ilike(search_term),
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    transactions = db.execute(query).scalars().all()
    
    # Build data for Excel
    rows = []
    
    for transaction in transactions:
        # Get all postings for this transaction
        postings = db.query(Posting).filter(Posting.transaction_id == transaction.id).all()
        
        if not postings:
            # Transaction with no postings
            rows.append({
                "Date": transaction.date.strftime("%Y-%m-%d"),
                "Payee": transaction.payee,
                "Description": transaction.description or "",
                "Account": "",
                "Amount": None,
                "Currency": "",
                "Balance": None,
            })
        else:
            # One row per posting
            for posting in postings:
                account = db.query(Account).filter(Account.id == posting.account_id).first()
                account_path = account.full_path if account else ""
                
                rows.append({
                    "Date": transaction.date.strftime("%Y-%m-%d"),
                    "Payee": transaction.payee,
                    "Description": transaction.description or "",
                    "Account": account_path,
                    "Amount": float(posting.amount) if posting.amount else None,
                    "Currency": posting.currency,
                    "Balance": None,  # Could calculate running balance if needed
                })
    
    # Create DataFrame
    df = pd.DataFrame(rows)
    
    # Create Excel file in memory
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Transactions")
        
        # Get worksheet for formatting
        worksheet = writer.sheets["Transactions"]
        
        # Auto-adjust column widths
        for idx, col in enumerate(df.columns, 1):
            max_length = max(
                df[col].astype(str).map(len).max(),
                len(str(col))
            )
            worksheet.column_dimensions[chr(64 + idx)].width = min(max_length + 2, 50)
        
        # Format date column
        if "Date" in df.columns:
            date_col_idx = df.columns.get_loc("Date") + 1
            for row in range(2, len(df) + 2):
                cell = worksheet.cell(row=row, column=date_col_idx)
                cell.number_format = "yyyy-mm-dd"
        
        # Format amount column
        if "Amount" in df.columns:
            amount_col_idx = df.columns.get_loc("Amount") + 1
            for row in range(2, len(df) + 2):
                cell = worksheet.cell(row=row, column=amount_col_idx)
                if cell.value is not None:
                    cell.number_format = "#,##0.00"
    
    output.seek(0)
    return output

