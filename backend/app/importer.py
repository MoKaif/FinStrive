"""Import service for syncing ledger file to database."""
import logging
from decimal import Decimal
from pathlib import Path
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from app.config import settings
from app.parser import parse_ledger_file, Transaction as ParsedTransaction
from app.models import (
    Account,
    Transaction,
    Posting as PostingModel,
    AccountBalance,
)

logger = logging.getLogger(__name__)


class Importer:
    """Service for importing ledger transactions into database."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_or_create_account(self, account_path: str) -> Account:
        """Get or create account hierarchy."""
        # Check if account exists
        existing = self.db.query(Account).filter(
            Account.full_path == account_path
        ).first()
        
        if existing:
            return existing
        
        # Create account hierarchy
        parts = account_path.split(':')
        parent = None
        
        for i, part in enumerate(parts):
            current_path = ':'.join(parts[:i+1])
            
            account = self.db.query(Account).filter(
                Account.full_path == current_path
            ).first()
            
            if not account:
                account = Account(
                    name=part,
                    full_path=current_path,
                    parent_id=parent.id if parent else None,
                )
                self.db.add(account)
                self.db.flush()
            
            parent = account
        
        return parent
    
    def get_or_create_transaction(
        self, 
        parsed_transaction: ParsedTransaction
    ) -> Optional[Transaction]:
        """Get or create transaction, avoiding duplicates."""
        transaction_hash = parsed_transaction.calculate_hash()
        
        # Check if transaction already exists
        existing = self.db.query(Transaction).filter(
            Transaction.transaction_hash == transaction_hash
        ).first()
        
        if existing:
            return None  # Already imported
        
        # Create new transaction
        transaction = Transaction(
            date=parsed_transaction.date,
            payee=parsed_transaction.payee,
            transaction_hash=transaction_hash,
        )
        self.db.add(transaction)
        self.db.flush()
        
        # Calculate missing amounts (double-entry bookkeeping balance)
        # In ledger-cli format: if one posting has no amount, it balances the transaction
        # All amounts in a transaction should sum to zero
        
        postings_with_amounts = [p for p in parsed_transaction.postings if p.amount is not None]
        postings_without_amounts = [p for p in parsed_transaction.postings if p.amount is None]
        
        # Sum of all amounts should be zero (double-entry bookkeeping principle)
        total_amount = sum(p.amount for p in postings_with_amounts) if postings_with_amounts else Decimal("0.00")
        
        # If there's exactly one posting without amount, calculate it to balance the transaction
        if len(postings_without_amounts) == 1 and postings_with_amounts:
            posting = postings_without_amounts[0]
            # The missing amount should balance to zero: total_amount + missing_amount = 0
            # Therefore: missing_amount = -total_amount
            posting.amount = -total_amount
            posting.currency = postings_with_amounts[0].currency if postings_with_amounts else "INR"
            logger.debug(f"Calculated missing amount for {posting.account}: {posting.amount} (total was {total_amount})")
        elif len(postings_without_amounts) > 1:
            # Multiple postings without amount - ledger-cli requires explicit amounts
            logger.warning(f"Transaction {parsed_transaction.payee} has multiple postings without amounts - skipping")
            return None
        
        # Verify transaction balances (should sum to zero)
        all_amounts = [p.amount for p in parsed_transaction.postings if p.amount is not None]
        if all_amounts:
            transaction_sum = sum(all_amounts)
            if abs(transaction_sum) > Decimal("0.01"):  # Allow small rounding errors
                logger.warning(f"Transaction {parsed_transaction.payee} does not balance: sum={transaction_sum}")
            else:
                logger.debug(f"Transaction {parsed_transaction.payee} balances: sum={transaction_sum}")
        
        # Create postings with amounts as-is from ledger
        # In ledger-cli double-entry bookkeeping:
        # - Assets: positive amount = money coming in (debit, increases balance)
        # - Assets: negative amount = money going out (credit, decreases balance)
        # - Income: positive amount in ledger means income earned, but in double-entry it's a credit
        #   So Income accounts decrease with positive amounts (negative balance = positive income)
        # - Expenses: positive amount = expense paid (debit, increases expense balance)
        # 
        # IMPORTANT: Store amounts exactly as calculated/specified in ledger
        for posting in parsed_transaction.postings:
            account = self.get_or_create_account(posting.account)
            
            # Store amount exactly as calculated (positive or negative)
            amount = posting.amount if posting.amount is not None else Decimal("0.00")
            
            posting_model = PostingModel(
                transaction_id=transaction.id,
                account_id=account.id,
                amount=amount,
                currency=posting.currency,
            )
            self.db.add(posting_model)
            logger.debug(f"Created posting: {account.full_path} = {amount}")
        
        return transaction
    
    def calculate_account_balance(self, account_id: int) -> tuple[Decimal, str]:
        """Calculate balance for an account from all postings.
        
        In ledger-cli double-entry bookkeeping:
        - Assets accounts: positive amounts = increases (money/assets coming in)
          → Balance = sum of all postings (positive = money you have)
        - Income accounts: positive amounts in ledger represent income earned
          → But in ledger-cli, Income is a credit account, so it decreases with positive amounts
          → Income balance should be: -sum(postings) for display (shows income earned as positive)
        - Expenses accounts: positive amounts = expenses incurred
          → Balance = sum of postings (positive = expenses spent)
        
        CRITICAL: Store raw amounts as-is, adjust only for display.
        """
        
        account = self.db.query(Account).filter(Account.id == account_id).first()
        if not account:
            return Decimal("0.00"), "INR"
        
        postings = self.db.query(PostingModel).filter(
            PostingModel.account_id == account_id
        ).all()
        
        if not postings:
            return Decimal("0.00"), "INR"
        
        # Calculate raw balance: sum all postings to this account
        # This is the actual ledger balance
        raw_balance = sum(Decimal(str(p.amount)) for p in postings)
        currency = postings[0].currency if postings else "INR"
        
        # For display, adjust based on account type
        # BUT: Store the raw balance in database, adjust in display layer
        account_path = account.full_path
        
        if account_path.startswith("Assets"):
            # Assets: raw balance is correct (positive = money/assets you have)
            # No adjustment needed
            display_balance = raw_balance
        elif account_path.startswith("Income"):
            # Income accounts: in ledger-cli, positive amounts decrease the account
            # Raw balance is negative (credits), flip for display to show income as positive
            display_balance = -raw_balance
        elif account_path.startswith("Expenses"):
            # Expenses: positive amounts increase expenses
            # Raw balance is positive, keep it for display
            display_balance = raw_balance
        elif account_path.startswith("Liabilities") or account_path.startswith("Equity"):
            # Liabilities: typically negative in ledger, flip for clarity
            display_balance = -raw_balance
        else:
            # Unknown account type, use raw balance
            display_balance = raw_balance
        
        return display_balance, currency
    
    def update_account_balances(self) -> None:
        """Update cached account balances."""
        accounts = self.db.query(Account).all()
        
        for account in accounts:
            balance, currency = self.calculate_account_balance(account.id)
            
            account_balance = self.db.query(AccountBalance).filter(
                AccountBalance.account_id == account.id
            ).first()
            
            if account_balance:
                account_balance.balance = balance
                account_balance.currency = currency
            else:
                account_balance = AccountBalance(
                    account_id=account.id,
                    balance=balance,
                    currency=currency,
                )
                self.db.add(account_balance)
    
    def import_ledger_file(
        self, 
        file_path: Optional[Path] = None,
        update_balances: bool = True
    ) -> dict:
        """Import transactions from ledger file."""
        if file_path is None:
            file_path = Path(settings.ledger_file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"Ledger file not found: {file_path}")
        
        logger.info(f"Parsing ledger file: {file_path}")
        parsed_transactions = parse_ledger_file(file_path)
        logger.info(f"Parsed {len(parsed_transactions)} transactions")
        
        imported_count = 0
        skipped_count = 0
        
        for parsed_transaction in parsed_transactions:
            try:
                transaction = self.get_or_create_transaction(parsed_transaction)
                if transaction:
                    imported_count += 1
                else:
                    skipped_count += 1
            except Exception as e:
                logger.error(f"Error importing transaction: {e}", exc_info=True)
                skipped_count += 1
        
        self.db.commit()
        
        if update_balances:
            logger.info("Updating account balances...")
            self.update_account_balances()
            self.db.commit()
        
        logger.info(
            f"Import complete: {imported_count} imported, "
            f"{skipped_count} skipped"
        )
        
        return {
            "imported": imported_count,
            "skipped": skipped_count,
            "total_parsed": len(parsed_transactions),
        }


def import_ledger(db: Session, file_path: Optional[Path] = None) -> dict:
    """Convenience function to import ledger file."""
    importer = Importer(db)
    return importer.import_ledger_file(file_path)

