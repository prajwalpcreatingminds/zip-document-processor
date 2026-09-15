from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "ZIP Document Processor API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "127.0.0.1"

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    # Directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    PROJECT_ROOT: Path = BASE_DIR.parent
    STORAGE_DIR: Path = PROJECT_ROOT / "Output"
    TEMP_DIR: Path = BASE_DIR / "temp"

    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "document_processing_db"
    MONGODB_COLLECTION_NAME: str = "conversion"
    ENABLE_MONGODB: bool = True

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

# Normalize and resolve directories
if not settings.STORAGE_DIR.is_absolute():
    settings.STORAGE_DIR = (settings.BASE_DIR / settings.STORAGE_DIR).resolve()
else:
    settings.STORAGE_DIR = settings.STORAGE_DIR.resolve()

if not settings.TEMP_DIR.is_absolute():
    settings.TEMP_DIR = (settings.BASE_DIR / settings.TEMP_DIR).resolve()
else:
    settings.TEMP_DIR = settings.TEMP_DIR.resolve()

# Ensure directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
