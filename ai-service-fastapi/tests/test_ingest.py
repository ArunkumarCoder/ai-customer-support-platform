import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
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
