from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.models import DocumentChunk
from app.db.session import SessionLocal
from app.main import app
from app.services.chunking import chunk_text

client = TestClient(app)

TEST_DOCUMENT_ID = 999001


@pytest.fixture(autouse=True)
def cleanup_test_document_chunks():
    _delete_test_chunks()
    yield
    _delete_test_chunks()


def _delete_test_chunks():
    db = SessionLocal()
    try:
        db.query(DocumentChunk).filter(DocumentChunk.document_id == TEST_DOCUMENT_ID).delete()
        db.commit()
    finally:
        db.close()


def test_ingest_valid_request_creates_expected_document_chunks():
    text = " ".join(f"word{i}" for i in range(500))
    expected_chunks = chunk_text(text)

    response = client.post(
        "/ingest",
        json={"document_id": TEST_DOCUMENT_ID, "text": text},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 200
    assert response.json() == {"chunks_created": len(expected_chunks)}

    db = SessionLocal()
    try:
        rows = (
            db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == TEST_DOCUMENT_ID)
            .order_by(DocumentChunk.id)
            .all()
        )
        assert len(rows) == len(expected_chunks)
        assert [row.chunk_text for row in rows] == expected_chunks
        for row in rows:
            assert len(row.embedding) == 384
    finally:
        db.close()


def test_ingest_without_header_returns_422():
    response = client.post("/ingest", json={"document_id": TEST_DOCUMENT_ID, "text": "hello world"})

    assert response.status_code == 422

    db = SessionLocal()
    try:
        count = db.query(DocumentChunk).filter(DocumentChunk.document_id == TEST_DOCUMENT_ID).count()
        assert count == 0
    finally:
        db.close()


def test_ingest_with_wrong_header_returns_401():
    response = client.post(
        "/ingest",
        json={"document_id": TEST_DOCUMENT_ID, "text": "hello world"},
        headers={"X-Internal-Api-Key": "wrong-key"},
    )

    assert response.status_code == 401

    db = SessionLocal()
    try:
        count = db.query(DocumentChunk).filter(DocumentChunk.document_id == TEST_DOCUMENT_ID).count()
        assert count == 0
    finally:
        db.close()


def test_ingest_with_missing_required_field_returns_422():
    response = client.post(
        "/ingest",
        json={"text": "hello world"},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 422


def test_ingest_with_empty_text_returns_422():
    response = client.post(
        "/ingest",
        json={"document_id": TEST_DOCUMENT_ID, "text": ""},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 422


def test_ingest_with_non_positive_document_id_returns_422():
    response = client.post(
        "/ingest",
        json={"document_id": 0, "text": "hello world"},
        headers={"X-Internal-Api-Key": settings.internal_api_key},
    )

    assert response.status_code == 422


@patch("app.api.ingest.chunk_text")
def test_ingest_is_rate_limited_after_exceeding_limit(mock_chunk_text):
    # Reset the shared in-memory limiter storage first so this test's result
    # doesn't depend on how many successful /ingest calls earlier tests made.
    # chunk_text is mocked to return no chunks so the request short-circuits
    # before touching the real embedding model or the database.
    limiter.reset()
    mock_chunk_text.return_value = []

    headers = {"X-Internal-Api-Key": settings.internal_api_key}
    payload = {"document_id": TEST_DOCUMENT_ID, "text": "hello world"}

    for _ in range(100):
        response = client.post("/ingest", json=payload, headers=headers)
        assert response.status_code == 200

    response = client.post("/ingest", json=payload, headers=headers)
    assert response.status_code == 429
