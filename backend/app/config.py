"""Configuration management for FinStrive application."""
import os
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Ledger file path
    ledger_file_path: str = "/home/nox/Nox/Finance/transactions.ledger"
    
    # Database URL (SQLite by default)
    database_url: str = "sqlite:///./data/finstrive.db"
    
    # API Configuration
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    
    # CORS origins (comma-separated string from env, parsed into list)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins as list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        
        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str) -> any:
            if field_name == "cors_origins":
                return [origin.strip() for origin in raw_val.split(",")]
            return cls.json_loads(raw_val)
    
    def get_database_path(self) -> Path:
        """Get absolute path to database file."""
        if self.database_url.startswith("sqlite:///"):
            db_path = self.database_url.replace("sqlite:///", "")
            if db_path.startswith("./"):
                # Relative to project root
                project_root = Path(__file__).parent.parent.parent
                return project_root / db_path[2:]
            return Path(db_path)
        return Path("./data/finstrive.db")
    
    def ensure_data_directory(self) -> None:
        """Ensure data directory exists."""
        db_path = self.get_database_path()
        db_path.parent.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()

