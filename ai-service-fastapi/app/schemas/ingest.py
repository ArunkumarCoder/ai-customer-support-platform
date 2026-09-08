from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    document_id: int = Field(gt=0)
    text: str = Field(min_length=1, max_length=200_000)


class IngestResponse(BaseModel):
    chunks_created: int