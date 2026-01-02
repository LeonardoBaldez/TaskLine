from sqlalchemy import create_engine, MetaData
from config.mainconfig import settings


DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=10,
    pool_recycle=3600
    )

metadata = MetaData()
