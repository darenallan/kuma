from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Base de donnees
    database_url: str = "postgresql+psycopg://kuma:kuma@localhost:5432/kuma"

    # Securite
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"

    # Yousign
    yousign_api_url: str = "https://api-sandbox.yousign.app/v3"
    yousign_api_key: str = ""

    # Stockage local chiffre des PDF contractuels
    storage_path: str = "./storage/contracts"
    storage_encryption_key: str = ""

    # CORS
    cors_origins: str = "http://localhost:5173"

    # Environnement
    environment: str = "development"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
