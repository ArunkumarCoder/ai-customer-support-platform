from app.core.config import settings
from app.services.llm.base import LLMProvider
from app.services.llm.openai_provider import OpenAIProvider
from app.services.llm.anthropic_provider import AnthropicProvider
from app.services.llm.groq_provider import GroqProvider


def get_llm_provider() -> LLMProvider:
    if settings.llm_provider == "anthropic":
        return AnthropicProvider()
    if settings.llm_provider == "openai":
        return OpenAIProvider()
    if settings.llm_provider == "groq":
        return GroqProvider()
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider}")