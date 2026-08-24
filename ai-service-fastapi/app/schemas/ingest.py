from pydantic import BaseModel


class IngestRequest(BaseModel):
    document_id: int
    text: str


class IngestResponse(BaseModel):
    chunks_created: int