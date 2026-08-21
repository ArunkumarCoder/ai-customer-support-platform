from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import verify_internal_api_key
from app.services.llm.factory import get_llm_provider

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    ticket_id: int | None = None


class ChatResponse(BaseModel):
    reply: str


@router.post(
    "/chat",
    response_model=ChatResponse,
    dependencies=[Depends(verify_internal_api_key)],
)
def chat(request: ChatRequest):
    provider = get_llm_provider()
    reply = provider.chat_completion([{"role": "user", "content": request.message}])
    return ChatResponse(reply=reply)