import json
import subprocess

import azure.cognitiveservices.speech as speechsdk

from app.config import AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
from app.schemas import PronunciationAssessmentResponse, WordScore

# Azure's pronunciation assessment expects 16kHz, 16-bit, mono PCM audio.
# Clients record in whatever format their platform gives them (m4a/AAC on
# iOS/Android, webm/opus in most browsers), so every upload is transcoded
# to that exact format with ffmpeg before it's handed to the Speech SDK.
AUDIO_FORMAT = speechsdk.audio.AudioStreamFormat(
    samples_per_second=16000, bits_per_sample=16, channels=1
)


def _to_pcm16(audio_bytes: bytes) -> bytes:
    result = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "error",
            "-i", "pipe:0",
            "-ar", "16000",
            "-ac", "1",
            "-f", "s16le",
            "pipe:1",
        ],
        input=audio_bytes,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Audio conversion failed: {result.stderr.decode(errors='replace')}")
    return result.stdout


def assess_pronunciation(
    audio_bytes: bytes, reference_text: str, language: str = "en-US"
) -> PronunciationAssessmentResponse:
    pcm_bytes = _to_pcm16(audio_bytes)

    speech_config = speechsdk.SpeechConfig(
        subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION
    )

    push_stream = speechsdk.audio.PushAudioInputStream(stream_format=AUDIO_FORMAT)
    audio_config = speechsdk.audio.AudioConfig(stream=push_stream)

    pronunciation_config = speechsdk.PronunciationAssessmentConfig(
        reference_text=reference_text,
        grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
        granularity=speechsdk.PronunciationAssessmentGranularity.Word,
        enable_miscue=True,
    )

    recognizer = speechsdk.SpeechRecognizer(
        speech_config=speech_config, language=language, audio_config=audio_config
    )
    pronunciation_config.apply_to(recognizer)

    push_stream.write(pcm_bytes)
    push_stream.close()

    result = recognizer.recognize_once()

    if result.reason != speechsdk.ResultReason.RecognizedSpeech:
        raise RuntimeError(f"Speech not recognized (reason: {result.reason})")

    pronunciation_result = speechsdk.PronunciationAssessmentResult(result)
    detail = json.loads(
        result.properties.get(speechsdk.PropertyId.SpeechServiceResponse_JsonResult)
    )
    words = [
        WordScore(
            word=w["Word"],
            accuracy_score=w["PronunciationAssessment"]["AccuracyScore"],
            error_type=w["PronunciationAssessment"]["ErrorType"],
        )
        for w in detail["NBest"][0]["Words"]
    ]

    return PronunciationAssessmentResponse(
        recognized_text=result.text,
        accuracy_score=pronunciation_result.accuracy_score,
        fluency_score=pronunciation_result.fluency_score,
        completeness_score=pronunciation_result.completeness_score,
        pronunciation_score=pronunciation_result.pronunciation_score,
        words=words,
    )
