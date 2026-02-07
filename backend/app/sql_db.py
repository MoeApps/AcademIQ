"""
SQLite (dev) / PostgreSQL (deploy) engine and session for PAIS.
Uses SQLAlchemy; same code for both via connection string.
"""
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Default: SQLite in backend/app/data/pais.db
_db_dir = Path(__file__).resolve().parent / "data"
_db_dir.mkdir(exist_ok=True)
_default_url = f"sqlite:///{_db_dir / 'pais.db'}"

DATABASE_URL = os.getenv("PAIS_DATABASE_URL", _default_url)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all tables."""
    from .models.pais_models import Base
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
