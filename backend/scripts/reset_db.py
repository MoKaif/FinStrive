#!/usr/bin/env python3
"""Script to reset/clear the database for fresh import."""
import sys
import os
from pathlib import Path

# Add parent directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Try to use the Python from virtual environment if available
# Otherwise use system Python
os.chdir(backend_dir)

from app.database import engine
from app.models import Base

def reset_database():
    """Drop all tables and recreate them."""
    print("Resetting database...")
    print(f"Database URL: {engine.url}")
    
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    print("✓ Dropped all tables")
    
    # Recreate all tables
    Base.metadata.create_all(bind=engine)
    print("✓ Recreated all tables")
    
    print("\nDatabase reset complete!")
    print("You can now re-import your ledger file using the API endpoint: POST /api/import")

if __name__ == "__main__":
    reset_database()
