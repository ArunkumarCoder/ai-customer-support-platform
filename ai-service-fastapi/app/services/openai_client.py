from openai import OpenAI

from app.core.config import settings

client = OpenAI(api_key=settings.openai_api_key)

CHAT_MODEL = "gpt-4o-mini"


def get_chat_completion(messages: list[dict[str, str]]) -> str:
    response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
    )
    return response.choices[0].message.content
