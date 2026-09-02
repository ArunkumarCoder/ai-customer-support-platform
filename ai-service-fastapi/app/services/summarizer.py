from app.services.llm.factory import get_llm_provider

SHORT_TEXT_WORD_THRESHOLD = 40

SUMMARIZE_SYSTEM_PROMPT = (
    "You are a support-ticket summarization engine. Condense the given support "
    "email into a concise 2-3 sentence summary capturing the key issue and any "
    "action the customer is requesting, written for a support agent to scan in "
    "seconds. Respond with plain text only — no markdown, no bullet points, and "
    "no preamble like \"Here is a summary:\"."
)


def summarize_text(text: str) -> str:
    if len(text.split()) < SHORT_TEXT_WORD_THRESHOLD:
        return text

    provider = get_llm_provider()
    messages = [
        {"role": "system", "content": SUMMARIZE_SYSTEM_PROMPT},
        {"role": "user", "content": text},
    ]

    return provider.chat_completion(messages).strip()
