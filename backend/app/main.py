from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.schemas import PronunciationAssessmentResponse
from app.speech import (
    AudioConversionError,
    SpeechNotRecognizedError,
    SpeechServiceError,
    assess_pronunciation,
)

app = FastAPI(title="FluentFeed Backend")

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
    audio: UploadFile, reference_text: str = Form(...)
) -> PronunciationAssessmentResponse:
    audio_bytes = await audio.read()
    # `detail.code` is a stable machine-readable value the client maps to
    # its own user-facing copy; internals (Azure error text) only go to logs.
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
