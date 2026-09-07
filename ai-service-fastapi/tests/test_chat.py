from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def _mock_provider(reply: str) -> MagicMock:
    provider = MagicMock()
    provider.chat_completion.return_value = reply
    return provider


@patch("app.api.chat.get_llm_provider")
@patch("app.api.chat.retrieve_relevant_chunks")
def test_chat_with_strong_match_returns_reply_and_does_not_escalate(mock_retrieve, mock_get_provider):
    mock_retrieve.return_value = [
        {"text": "Our refund policy allows returns within 30 days.", "distance": 0.1},
    ]
    mock_get_provider.return_value = _mock_provider("You can return it within 30 days.")

    response = client.post(
        "/chat",
        json={"message": "What is your refund policy?"},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 200
    assert response.json() == {
        "reply": "You can return it within 30 days.",
        "escalate": False,
    }


@patch("app.api.chat.get_llm_provider")
@patch("app.api.chat.retrieve_relevant_chunks")
def test_chat_with_no_matches_escalates_but_still_replies_gracefully(mock_retrieve, mock_get_provider):
    mock_retrieve.return_value = []
    mock_get_provider.return_value = _mock_provider(
        "I don't have that information, let me connect you with a human agent."
    )

    response = client.post(
        "/chat",
        json={"message": "Some completely unrelated question"},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 200
    assert response.json() == {
        "reply": "I don't have that information, let me connect you with a human agent.",
        "escalate": True,
    }


@patch("app.api.chat.get_llm_provider")
@patch("app.api.chat.retrieve_relevant_chunks")
def test_chat_with_only_weak_matches_escalates(mock_retrieve, mock_get_provider):
    mock_retrieve.return_value = [
        {"text": "Unrelated chunk from a different topic.", "distance": 0.9},
    ]
    mock_get_provider.return_value = _mock_provider("I'm not fully sure, let me get a human to help.")

    response = client.post(
        "/chat",
        json={"message": "Something obscure"},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 200
    assert response.json()["escalate"] is True


@patch("app.api.chat.get_llm_provider")
@patch("app.api.chat.retrieve_relevant_chunks")
def test_chat_without_header_returns_422(mock_retrieve, mock_get_provider):
    response = client.post("/chat", json={"message": "Hello"})

    assert response.status_code == 422
    mock_get_provider.assert_not_called()
    mock_retrieve.assert_not_called()


@patch("app.api.chat.get_llm_provider")
@patch("app.api.chat.retrieve_relevant_chunks")
def test_chat_with_wrong_header_returns_401(mock_retrieve, mock_get_provider):
    response = client.post(
        "/chat",
        json={"message": "Hello"},
        headers={"X-Internal-Api-Key": "wrong-key"},
    )

    assert response.status_code == 401
    mock_get_provider.assert_not_called()
    mock_retrieve.assert_not_called()


@patch("app.api.chat.get_llm_provider")
@patch("app.api.chat.retrieve_relevant_chunks")
def test_chat_with_missing_message_field_returns_422(mock_retrieve, mock_get_provider):
    response = client.post(
        "/chat",
        json={},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 422
    mock_get_provider.assert_not_called()
    mock_retrieve.assert_not_called()
