from fastapi import FastAPI

from app.api.chat import router as chat_router
from app.api.ingest import router as ingest_router
from app.api.sentiment import router as sentiment_router
from app.api.summarize import router as summarize_router

app = FastAPI(title="AI Customer Support - AI Service")

app.include_router(chat_router)
app.include_router(ingest_router)
app.include_router(sentiment_router)
app.include_router(summarize_router)

@app.get("/health")
def health():
    return {"status": "ok"}