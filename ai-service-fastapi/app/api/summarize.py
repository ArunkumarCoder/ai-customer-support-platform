from fastapi import APIRouter, Depends

from app.core.security import verify_internal_api_key
from app.schemas.summarize import SummarizeRequest, SummarizeResponse
from app.services.summarizer import summarize_text

router = APIRouter()


@router.post(
    "/summarize",
    response_model=SummarizeResponse,
    dependencies=[Depends(verify_internal_api_key)],
)
def summarize(request: SummarizeRequest):
    summary = summarize_text(request.text)
    return SummarizeResponse(summary=summary)
