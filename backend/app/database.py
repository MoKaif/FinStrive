"""Database configuration and session management."""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.models import Base

# Ensure data directory exists before creating engine
settings.ensure_data_directory()

# Create SQLite engine with proper configuration
database_url = settings.database_url
if database_url.startswith("sqlite"):
    # Convert relative path to absolute path for SQLite
    if database_url.startswith("sqlite:///./"):
        db_path = settings.get_database_path()
        database_url = f"sqlite:///{db_path}"
    
    # SQLite-specific configuration
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,  # Set to True for SQL query logging
    )
    
    # Enable foreign key constraints for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(database_url, echo=False)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Initialize database by creating all tables."""
    from app.config import settings
    settings.ensure_data_directory()
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

