from pydantic_settings import BaseSettings
from pydantic import EmailStr

class Setting(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: EmailStr
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_FROM_NAME: str
    RESET_TOKEN_EXPIRE_HOURS: int = 24
    SECRET_TOKEN : str
    class Config:
        env_file = ".env"
settings = Setting()