import math

from fastapi import Depends, FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.auth import current_user_id
from app.config import CORS_ORIGINS
from app.rate_limit import RateLimiter
from app.schemas import PronunciationAssessmentResponse
from app.speech import (
    AudioConversionError,
    SpeechNotRecognizedError,
    SpeechServiceError,
    assess_pronunciation,
)

# A spoken word or phrase is a few seconds; 1 MB is about a minute of the
# app's audio. Azure bills per second of audio, so refuse anything longer.
MAX_AUDIO_BYTES = 1_000_000

app = FastAPI(title="FluentFeed Backend")
rate_limiter = RateLimiter()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/pronunciation-assessment", response_model=PronunciationAssessmentResponse)
async def pronunciation_assessment(
    audio: UploadFile,
    reference_text: str = Form(...),
    user_id: str = Depends(current_user_id),
) -> PronunciationAssessmentResponse:
    # `detail.code` is a stable machine-readable value the client maps to
    # its own user-facing copy; internals (Azure error text) only go to logs.
    wait = rate_limiter.try_acquire(user_id)
    if wait is not None:
        raise HTTPException(
            status_code=429,
            detail={"code": "rate_limited", "message": "Too many attempts."},
            headers={"Retry-After": str(math.ceil(wait))},
        )

    audio_bytes = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=413,
            detail={"code": "audio_too_long", "message": "The recording is too long."},
        )

    try:
        return assess_pronunciation(audio_bytes, reference_text)
    except SpeechNotRecognizedError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "no_speech", "message": "No speech was recognized."},
        ) from exc
    except AudioConversionError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "audio_unreadable", "message": "The recording couldn't be read."},
        ) from exc
    except SpeechServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "service_unavailable", "message": "Speech scoring is unavailable."},
        ) from exc
