from contextlib import asynccontextmanager

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.chat import router as chat_router
from app.api.ingest import router as ingest_router
from app.api.sentiment import router as sentiment_router
from app.api.summarize import router as summarize_router
from app.core.rate_limit import limiter
from app.services.embeddings import get_embedding_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm the sentence-transformers model once at startup instead of paying
    # the ~7s load cost on whichever request happens to hit it first.
    get_embedding_model()
    yield


app = FastAPI(title="AI Customer Support - AI Service", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(chat_router)
app.include_router(ingest_router)
app.include_router(sentiment_router)
app.include_router(summarize_router)

@app.get("/health")
def health():
    return {"status": "ok"}