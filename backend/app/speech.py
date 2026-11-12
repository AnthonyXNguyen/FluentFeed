import json
import logging
import subprocess

import azure.cognitiveservices.speech as speechsdk

from app.config import AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
from app.schemas import PronunciationAssessmentResponse, WordScore

logger = logging.getLogger(__name__)


class AudioConversionError(Exception):
    """The uploaded recording couldn't be decoded (client-side problem)."""


class SpeechNotRecognizedError(Exception):
    """Azure ran fine but heard no usable speech - the user should retry."""


class SpeechServiceError(Exception):
    """Azure itself failed (bad key/region, quota, network) - not the user's fault."""


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
        logger.warning("ffmpeg failed: %s", result.stderr.decode(errors="replace"))
        raise AudioConversionError("Audio conversion failed")
    return result.stdout


def parse_word_scores(detail: dict) -> list[WordScore]:
    # With enable_miscue, words the user skipped ("Omission") or added
    # ("Insertion") come back without an AccuracyScore - they weren't
    # pronounced against the reference, so they score 0.
    return [
        WordScore(
            word=w["Word"],
            accuracy_score=w.get("PronunciationAssessment", {}).get("AccuracyScore", 0),
            error_type=w.get("PronunciationAssessment", {}).get("ErrorType", "None"),
        )
        for w in detail["NBest"][0].get("Words", [])
    ]


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

    if result.reason == speechsdk.ResultReason.Canceled:
        details = result.cancellation_details
        if details.reason == speechsdk.CancellationReason.Error:
            # e.g. AuthenticationFailure (401) when the key/region is wrong.
            logger.error(
                "Azure Speech request failed: code=%s details=%s",
                details.code,
                details.error_details,
            )
            raise SpeechServiceError(str(details.code))
        raise SpeechNotRecognizedError(f"Recognition canceled: {details.reason}")

    if result.reason != speechsdk.ResultReason.RecognizedSpeech:
        raise SpeechNotRecognizedError(f"Speech not recognized: {result.reason}")

    pronunciation_result = speechsdk.PronunciationAssessmentResult(result)
    detail = json.loads(
        result.properties.get(speechsdk.PropertyId.SpeechServiceResponse_JsonResult)
    )
    words = parse_word_scores(detail)

    return PronunciationAssessmentResponse(
        recognized_text=result.text,
        accuracy_score=pronunciation_result.accuracy_score,
        fluency_score=pronunciation_result.fluency_score,
        completeness_score=pronunciation_result.completeness_score,
        pronunciation_score=pronunciation_result.pronunciation_score,
        words=words,
    )
