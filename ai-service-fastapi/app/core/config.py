from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    llm_provider: str = "groq"

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-5"

    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-120b"

    confidence_distance_threshold: float = 0.4

    internal_api_key: str

    class Config:
        env_file = ".env"


settings = Settings()