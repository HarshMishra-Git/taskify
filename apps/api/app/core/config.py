from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Email
    ZEPTO_API_KEY:    str = ""
    ZEPTO_FROM_EMAIL: str = "noreply@yourdomain.com"
    ZEPTO_FROM_NAME:  str = "Taskify"

    # Frontend base URL (for email links)
    FRONTEND_URL: str = "http://localhost:3003"

    class Config:
        env_file = ".env"


settings = Settings()
