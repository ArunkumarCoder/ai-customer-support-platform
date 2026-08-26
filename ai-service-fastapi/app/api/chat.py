from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import verify_internal_api_key
from app.db.session import get_db
from app.services.llm.factory import get_llm_provider
from app.services.prompt_builder import build_rag_messages
from app.services.retriever import retrieve_relevant_chunks

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    ticket_id: int | None = None


class ChatResponse(BaseModel):
    reply: str
    escalate: bool


@router.post(
    "/chat",
    response_model=ChatResponse,
    dependencies=[Depends(verify_internal_api_key)],
)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    retrieved = retrieve_relevant_chunks(request.message, db)
    print(f"[chat] retrieved {len(retrieved)} chunks, "
          f"distances={[round(r['distance'], 3) for r in retrieved]}")

    if retrieved:
        min_distance = min(r["distance"] for r in retrieved)
        escalate = min_distance > settings.confidence_distance_threshold
    else:
        escalate = True

    messages = build_rag_messages(request.message, [r["text"] for r in retrieved])

    provider = get_llm_provider()
    reply = provider.chat_completion(messages)
    return ChatResponse(reply=reply, escalate=escalate)