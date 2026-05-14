from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    base_url: str = "http://localhost:8080"
    database_url: str = "sqlite:///./qr_code.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
