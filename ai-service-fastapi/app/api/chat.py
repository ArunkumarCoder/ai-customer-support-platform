from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import verify_internal_api_key
from app.services.openai_client import get_chat_completion

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
    reply = get_chat_completion([{"role": "user", "content": request.message}])
    return ChatResponse(reply=reply)