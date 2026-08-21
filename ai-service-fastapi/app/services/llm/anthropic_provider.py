import anthropic

from app.core.config import settings
from app.services.llm.base import LLMProvider


class AnthropicProvider(LLMProvider):
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def chat_completion(self, messages: list[dict]) -> str:
        # Anthropic takes "system" as a separate top-level param, not a message role.
        system_prompt = next((m["content"] for m in messages if m["role"] == "system"), None)
        conversation = [m for m in messages if m["role"] != "system"]

        response = self.client.messages.create(
            model=settings.anthropic_model,
            max_tokens=1024,
            system=system_prompt,
            messages=conversation,
        )
        return response.content[0].text