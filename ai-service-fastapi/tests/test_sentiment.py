from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.sentiment import analyze_sentiment

client = TestClient(app)


def _mock_provider(reply: str) -> MagicMock:
    provider = MagicMock()
    provider.chat_completion.return_value = reply
    return provider


@patch("app.services.sentiment.get_llm_provider")
def test_sentiment_endpoint_returns_expected_label_and_score_with_valid_header(mock_get_provider):
    mock_get_provider.return_value = _mock_provider('{"label": "negative", "score": 0.9}')

    response = client.post(
        "/sentiment",
        json={"text": "This is terrible, fix it now."},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 200
    assert response.json() == {"label": "negative", "score": 0.9}


@patch("app.services.sentiment.get_llm_provider")
def test_sentiment_endpoint_without_header_returns_422(mock_get_provider):
    response = client.post("/sentiment", json={"text": "This is terrible, fix it now."})

    assert response.status_code == 422
    mock_get_provider.assert_not_called()


@patch("app.services.sentiment.get_llm_provider")
def test_analyze_sentiment_falls_back_to_neutral_on_invalid_json(mock_get_provider):
    mock_get_provider.return_value = _mock_provider("this is not json at all")

    result = analyze_sentiment("some text")

    assert result == {"label": "neutral", "score": 0.5}


@patch("app.services.sentiment.get_llm_provider")
def test_analyze_sentiment_falls_back_to_neutral_on_markdown_fenced_invalid_json(mock_get_provider):
    mock_get_provider.return_value = _mock_provider("```\nthis is not json either\n```")

    result = analyze_sentiment("some text")

    assert result == {"label": "neutral", "score": 0.5}
