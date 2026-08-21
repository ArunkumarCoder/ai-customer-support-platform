from openai import OpenAI

from app.core.config import settings
from app.services.llm.base import LLMProvider

GROQ_BASE_URL = "https://api.groq.com/openai/v1"


class GroqProvider(LLMProvider):
    def __init__(self):
        self.client = OpenAI(api_key=settings.groq_api_key, base_url=GROQ_BASE_URL)

    def chat_completion(self, messages: list[dict]) -> str:
        response = self.client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
        )
        return response.choices[0].message.content
