"""SQLAlchemy database models for FinStrive."""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Account(Base):
    """Account hierarchy model."""
    
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    full_path = Column(String(512), nullable=False, unique=True, index=True)
    parent_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    parent = relationship("Account", remote_side=[id], backref="children")
    
    def __repr__(self):
        return f"<Account(id={self.id}, full_path='{self.full_path}')>"


class Transaction(Base):
    """Transaction model representing a ledger transaction."""
    
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=False), nullable=False, index=True)
    payee = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
    transaction_hash = Column(String(64), nullable=True, unique=True, index=True)
    
    # Relationships
    postings = relationship("Posting", back_populates="transaction", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_transaction_date_payee", "date", "payee"),
    )
    
    def __repr__(self):
        return f"<Transaction(id={self.id}, date='{self.date}', payee='{self.payee}')>"


class Posting(Base):
    """Posting model representing a single account entry in a transaction."""
    
    __tablename__ = "postings"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    amount = Column(Numeric(20, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    transaction = relationship("Transaction", back_populates="postings")
    account = relationship("Account")
    
    __table_args__ = (
        Index("idx_posting_transaction_account", "transaction_id", "account_id"),
    )
    
    def __repr__(self):
        return f"<Posting(id={self.id}, account_id={self.account_id}, amount={self.amount} {self.currency})>"


class AccountBalance(Base):
    """Cached account balance for optimization."""
    
    __tablename__ = "account_balances"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, unique=True, index=True)
    balance = Column(Numeric(20, 2), nullable=False, default=Decimal("0.00"))
    currency = Column(String(10), nullable=False, default="INR")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    account = relationship("Account")
    
    def __repr__(self):
        return f"<AccountBalance(account_id={self.account_id}, balance={self.balance} {self.currency})>"

