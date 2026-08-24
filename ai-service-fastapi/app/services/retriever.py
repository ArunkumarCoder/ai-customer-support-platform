from sqlalchemy.orm import Session

from app.db.models import DocumentChunk
from app.services.embeddings import embed_texts


def retrieve_relevant_chunks(query: str, db: Session, top_k: int = 4) -> list[dict]:
    query_embedding = embed_texts([query])[0]

    results = (
        db.query(
            DocumentChunk.chunk_text,
            DocumentChunk.embedding.cosine_distance(query_embedding).label("distance"),
        )
        .order_by("distance")
        .limit(top_k)
        .all()
    )

    return [{"text": row.chunk_text, "distance": row.distance} for row in results]