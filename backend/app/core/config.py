from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "LeadScrapy Clone"
    ENV: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/leadscrapy"

    # Redis / Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # Scraping limits (safety defaults — responsible scraping)
    DEFAULT_MAX_PAGES: int = 50
    DEFAULT_CRAWL_DEPTH: int = 2
    DEFAULT_REQUEST_DELAY_MS: int = 800
    RESPECT_ROBOTS_TXT: bool = True
    MAX_CONCURRENT_JOBS_FREE: int = 1
    MAX_CONCURRENT_JOBS_PRO: int = 5

    # Plans / credits
    FREE_PLAN_MONTHLY_CREDITS: int = 100

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_BUSINESS: str = ""
    FRONTEND_URL: str = "http://localhost:3000"

    # Email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    EMAIL_FROM: str = "Lead Console <noreply@example.com>"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
