from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/sentio"
    RZP_KEY_ID: str = "rzp_test_placeholder"
    RZP_KEY_SECRET: str = "placeholder_secret"
    RZP_WEBHOOK_SECRET: str = "placeholder_webhook_secret"
    OPENROUTER_API_KEY: str = "sk-or-placeholder"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    LLM_T1_MODEL: str = "openai/gpt-5.6-luna"
    LLM_T2_MODEL: str = "openai/gpt-5.6-luna"
    LLM_T3_MODEL: str = "openai/gpt-5.6-luna"
    LLM_FALLBACK_MODEL: str = "deepseek/deepseek-v4-flash"
    ADMIN_TOKEN: str = "placeholder_admin_token"
    CHANNEL_MODE: str = "sim"
    TZ: str = "Asia/Kolkata"
    LOG_LEVEL: str = "INFO"

    @property
    def timezone(self) -> ZoneInfo:
        return ZoneInfo(self.TZ)


settings = Settings()
