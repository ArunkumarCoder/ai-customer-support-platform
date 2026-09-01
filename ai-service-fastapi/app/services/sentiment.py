import json

from app.services.llm.factory import get_llm_provider

SENTIMENT_SYSTEM_PROMPT = (
    "You are a sentiment classification engine. Classify the sentiment of the "
    "user's message as one of \"positive\", \"neutral\", or \"negative\", and "
    "estimate your confidence as a float between 0.0 and 1.0. Respond with ONLY "
    "a strict JSON object in exactly this form, and nothing else — no markdown "
    "code fences, no explanation:\n"
    '{"label": "positive", "score": 0.0}'
)

VALID_LABELS = {"positive", "neutral", "negative"}
FALLBACK = {"label": "neutral", "score": 0.5}


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines)
    return text.strip()


def analyze_sentiment(text: str) -> dict:
    provider = get_llm_provider()
    messages = [
        {"role": "system", "content": SENTIMENT_SYSTEM_PROMPT},
        {"role": "user", "content": text},
    ]

    try:
        raw = provider.chat_completion(messages)
        parsed = json.loads(_strip_code_fences(raw))

        label = parsed.get("label")
        score = parsed.get("score")

        if label not in VALID_LABELS or not isinstance(score, (int, float)):
            return dict(FALLBACK)

        return {"label": label, "score": max(0.0, min(1.0, float(score)))}
    except Exception:
        # Sentiment is a nice-to-have signal, not something that should break
        # the ticket flow if a provider returns malformed or unexpected output.
        return dict(FALLBACK)
