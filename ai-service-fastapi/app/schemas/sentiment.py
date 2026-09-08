from pydantic import BaseModel, Field


class SentimentRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5_000)


class SentimentResponse(BaseModel):
    label: str
    score: float
