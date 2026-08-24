from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import verify_internal_api_key
from app.db.models import DocumentChunk
from app.db.session import get_db
from app.schemas.ingest import IngestRequest, IngestResponse
from app.services.chunking import chunk_text
from app.services.embeddings import embed_texts

router = APIRouter()

@router.post(
    "/ingest",
    response_model=IngestResponse,
    dependencies=[Depends(verify_internal_api_key)],
)
def ingest(request: IngestRequest, db: Session = Depends(get_db)):
    chunks = chunk_text(request.text)
    if not chunks:
        return IngestResponse(chunks_created=0)

    embeddings = embed_texts(chunks)

    for chunk_value, embedding in zip(chunks, embeddings):
        db.add(DocumentChunk(
            document_id=request.document_id,
            chunk_text=chunk_value,
            embedding=embedding,
        ))
    db.commit()

    return IngestResponse(chunks_created=len(chunks))