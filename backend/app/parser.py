"""Ledger file parser for FinStrive."""
import re
import hashlib
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Optional, Tuple


@dataclass
class Posting:
    """Represents a single posting in a transaction."""
    account: str
    amount: Optional[Decimal] = None
    currency: str = "INR"


@dataclass
class Transaction:
    """Represents a parsed ledger transaction."""
    date: datetime
    payee: str
    postings: List[Posting]
    
    def calculate_hash(self) -> str:
        """Calculate hash for transaction deduplication."""
        content = f"{self.date.isoformat()}|{self.payee}|"
        for posting in sorted(self.postings, key=lambda p: p.account):
            amount_str = str(posting.amount) if posting.amount else ""
            content += f"{posting.account}:{amount_str}:{posting.currency}|"
        return hashlib.sha256(content.encode()).hexdigest()


class LedgerParser:
    """Parser for ledger-cli format files."""
    
    # Regex patterns
    ALIAS_PATTERN = re.compile(r'^alias\s+(\w+)=(.+)$|^(\w+)=(.+)$')
    DATE_PATTERN = re.compile(r'^(\d{4}/\d{2}/\d{2})\s+(.+)$')
    POSTING_PATTERN = re.compile(r'^\s{4}(\S+)\s+(.+?)$')
    POSTING_ACCOUNT_ONLY_PATTERN = re.compile(r'^\s{4}(\S+)\s*$')
    AMOUNT_PATTERN = re.compile(r'([₹]?)\s*([\d,]+(?:\.\d{2})?)')
    COMMENT_PATTERN = re.compile(r'^\s*;')
    
    def __init__(self):
        self.aliases: Dict[str, str] = {}
    
    def expand_aliases(self, account: str) -> str:
        """Expand account aliases (e.g., 'A' -> 'Assets', 'C:PPF' -> 'Assets:Investment:PPF')."""
        parts = account.split(':')
        expanded_parts = []
        
        for part in parts:
            if part in self.aliases:
                expanded_parts.extend(self.aliases[part].split(':'))
            else:
                expanded_parts.append(part)
        
        return ':'.join(expanded_parts)
    
    def parse_amount(self, amount_str: str) -> Tuple[Optional[Decimal], str]:
        """Parse amount string (e.g., '₹27,000.00' or '40000.00')."""
        amount_str = amount_str.strip()
        
        # Remove currency symbol and commas
        match = self.AMOUNT_PATTERN.search(amount_str)
        if match:
            currency_symbol = match.group(1) or ""
            amount_value = match.group(2).replace(',', '')
            
            # Map currency symbol to code
            currency = "INR"  # Default
            if currency_symbol == "₹":
                currency = "INR"
            
            try:
                amount = Decimal(amount_value)
                return amount, currency
            except (ValueError, TypeError):
                pass
        
        return None, "INR"
    
    def parse_aliases(self, lines: List[str]) -> List[str]:
        """Parse alias definitions and return remaining lines."""
        remaining_lines = []
        in_aliases = True
        
        for line in lines:
            line = line.rstrip()
            
            # Skip empty lines in alias section
            if in_aliases and not line.strip():
                continue
            
            # Check for alias
            match = self.ALIAS_PATTERN.match(line)
            if match:
                if match.group(1):  # alias KEY=VALUE format
                    key = match.group(1)
                    value = match.group(2).strip()
                else:  # KEY=VALUE format
                    key = match.group(3)
                    value = match.group(4).strip()
                
                self.aliases[key] = value
                in_aliases = True
            else:
                in_aliases = False
                remaining_lines.append(line)
        
        return remaining_lines
    
    def parse_transaction(self, date_line: str, posting_lines: List[str]) -> Optional[Transaction]:
        """Parse a single transaction from date line and posting lines."""
        # Parse date and payee
        date_match = self.DATE_PATTERN.match(date_line)
        if not date_match:
            return None
        
        date_str = date_match.group(1)
        payee = date_match.group(2).strip()
        
        # Parse date
        try:
            date = datetime.strptime(date_str, "%Y/%m/%d")
        except ValueError:
            return None
        
        # Parse postings
        postings = []
        for posting_line in posting_lines:
            posting_line = posting_line.rstrip()
            
            # Skip empty lines and comments
            if not posting_line.strip() or self.COMMENT_PATTERN.match(posting_line):
                continue
            
            # Try to match posting with amount
            match = self.POSTING_PATTERN.match(posting_line)
            if match:
                account = self.expand_aliases(match.group(1).strip())
                amount_str = match.group(2).strip()
                amount, currency = self.parse_amount(amount_str)
                postings.append(Posting(account=account, amount=amount, currency=currency))
            else:
                # Try posting without amount
                match = self.POSTING_ACCOUNT_ONLY_PATTERN.match(posting_line)
                if match:
                    account = self.expand_aliases(match.group(1).strip())
                    postings.append(Posting(account=account))
        
        if not postings:
            return None
        
        return Transaction(date=date, payee=payee, postings=postings)
    
    def parse_file(self, file_path: Path) -> List[Transaction]:
        """Parse entire ledger file and return list of transactions."""
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Parse aliases first
        lines = self.parse_aliases(lines)
        
        # Parse transactions
        transactions = []
        current_date_line = None
        current_postings = []
        
        for line in lines:
            line = line.rstrip()
            
            # Skip empty lines and comments
            if not line.strip() or self.COMMENT_PATTERN.match(line):
                continue
            
            # Check if this is a date line (transaction start)
            if self.DATE_PATTERN.match(line):
                # Save previous transaction if exists
                if current_date_line:
                    transaction = self.parse_transaction(current_date_line, current_postings)
                    if transaction:
                        transactions.append(transaction)
                
                # Start new transaction
                current_date_line = line
                current_postings = []
            else:
                # This is a posting line
                if current_date_line:
                    current_postings.append(line)
        
        # Don't forget the last transaction
        if current_date_line:
            transaction = self.parse_transaction(current_date_line, current_postings)
            if transaction:
                transactions.append(transaction)
        
        return transactions


def parse_ledger_file(file_path: Path) -> List[Transaction]:
    """Convenience function to parse a ledger file."""
    parser = LedgerParser()
    return parser.parse_file(file_path)

