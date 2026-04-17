"""Re-export Mongo helpers from the shared config package."""
from config.database import client, ping_db

__all__ = ["client", "ping_db"]
