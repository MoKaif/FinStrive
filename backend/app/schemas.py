"""Pydantic schemas for API request/response models."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field


# Posting schemas
class PostingBase(BaseModel):
    account_id: int
    account_path: str
    amount: Decimal
    currency: str = "INR"


class Posting(PostingBase):
    id: int
    transaction_id: int
    
    class Config:
        from_attributes = True


# Transaction schemas
class TransactionBase(BaseModel):
    date: datetime
    payee: str
    description: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class Transaction(TransactionBase):
    id: int
    postings: List[Posting] = []
    imported_at: datetime
    
    class Config:
        from_attributes = True


# Account schemas
class AccountBase(BaseModel):
    name: str
    full_path: str


class Account(AccountBase):
    id: int
    parent_id: Optional[int] = None
    balance: Optional[Decimal] = None
    currency: str = "INR"
    children: List["Account"] = []
    
    class Config:
        from_attributes = True


# Response schemas
class TransactionListResponse(BaseModel):
    transactions: List[Transaction]
    total: int
    page: int = 1
    page_size: int = 50


class AccountBalanceResponse(BaseModel):
    account_id: int
    account_path: str
    balance: Decimal
    currency: str = "INR"


class MonthlyAnalytics(BaseModel):
    month: str
    income: Decimal = Decimal("0.00")
    expenses: Decimal = Decimal("0.00")
    net: Decimal = Decimal("0.00")


class CategoryAnalytics(BaseModel):
    category: str
    total: Decimal
    currency: str = "INR"
    transaction_count: int


class ImportResponse(BaseModel):
    imported: int
    skipped: int
    total_parsed: int
    message: str


# Request schemas
class TransactionFilter(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    account_path: Optional[str] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)


class ExportFilter(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    account_path: Optional[str] = None
    search: Optional[str] = None

