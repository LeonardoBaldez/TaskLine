from sqlalchemy.orm import sessionmaker
from .base import engine

SessionLocal = sessionmaker(bind=engine)