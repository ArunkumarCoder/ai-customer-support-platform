from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.chat import router as chat_router
from app.api.ingest import router as ingest_router
from app.api.sentiment import router as sentiment_router
from app.api.summarize import router as summarize_router
from app.core.rate_limit import limiter

app = FastAPI(title="AI Customer Support - AI Service")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(chat_router)
app.include_router(ingest_router)
app.include_router(sentiment_router)
app.include_router(summarize_router)

@app.get("/health")
def health():
    return {"status": "ok"}