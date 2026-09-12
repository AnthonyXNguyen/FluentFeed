from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.schemas import PronunciationAssessmentResponse
from app.speech import assess_pronunciation

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
    try:
        return assess_pronunciation(audio_bytes, reference_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
