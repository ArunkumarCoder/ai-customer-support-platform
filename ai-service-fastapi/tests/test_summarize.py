from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)

LONG_TEXT = (
    "I have been trying to reach support for three days about my order that "
    "never arrived. It was supposed to come last week and I have not received "
    "any tracking updates since it shipped. I would like a refund or a "
    "replacement sent out as soon as possible because this delay has been "
    "extremely frustrating and I need a resolution quickly."
)

SHORT_TEXT = "My order never arrived, please help."


def _mock_provider(reply: str) -> MagicMock:
    provider = MagicMock()
    provider.chat_completion.return_value = reply
    return provider


@patch("app.services.summarizer.get_llm_provider")
def test_summarize_endpoint_returns_expected_summary_with_valid_header(mock_get_provider):
    mock_get_provider.return_value = _mock_provider(
        "Customer's order never arrived and they want a refund or replacement."
    )

    response = client.post(
        "/summarize",
        json={"text": LONG_TEXT},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 200
    assert response.json() == {
        "summary": "Customer's order never arrived and they want a refund or replacement."
    }


@patch("app.services.summarizer.get_llm_provider")
def test_summarize_endpoint_without_header_returns_422(mock_get_provider):
    response = client.post("/summarize", json={"text": LONG_TEXT})

    assert response.status_code == 422
    mock_get_provider.assert_not_called()


@patch("app.services.summarizer.get_llm_provider")
def test_summarize_endpoint_short_input_skips_llm_call(mock_get_provider):
    response = client.post(
        "/summarize",
        json={"text": SHORT_TEXT},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 200
    assert response.json() == {"summary": SHORT_TEXT}
    mock_get_provider.assert_not_called()
