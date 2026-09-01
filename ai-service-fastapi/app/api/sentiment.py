from fastapi import APIRouter, Depends

from app.core.security import verify_internal_api_key
from app.schemas.sentiment import SentimentRequest, SentimentResponse
from app.services.sentiment import analyze_sentiment

router = APIRouter()


@router.post(
    "/sentiment",
    response_model=SentimentResponse,
    dependencies=[Depends(verify_internal_api_key)],
)
def sentiment(request: SentimentRequest):
    result = analyze_sentiment(request.text)
    return SentimentResponse(**result)
