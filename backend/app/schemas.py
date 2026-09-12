from pydantic import BaseModel


class WordScore(BaseModel):
    word: str
    accuracy_score: float
    error_type: str


class PronunciationAssessmentResponse(BaseModel):
    recognized_text: str
    accuracy_score: float
    fluency_score: float
    completeness_score: float
    pronunciation_score: float
    words: list[WordScore]
