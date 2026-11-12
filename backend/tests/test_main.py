import pytest
from fastapi.testclient import TestClient

from app import main as main_module
from app.main import app
from app.speech import AudioConversionError, SpeechNotRecognizedError, SpeechServiceError

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_pronunciation_requires_reference_text() -> None:
    response = client.post(
        "/pronunciation-assessment",
        files={"audio": ("clip.wav", b"\x00\x00", "audio/wav")},
    )
    assert response.status_code == 422



@pytest.mark.parametrize(
    ("error", "status", "code"),
    [
        (SpeechNotRecognizedError("nomatch"), 422, "no_speech"),
        (AudioConversionError("bad audio"), 422, "audio_unreadable"),
        (SpeechServiceError("AuthenticationFailure"), 503, "service_unavailable"),
    ],
)
def test_pronunciation_errors_map_to_codes(monkeypatch, error, status, code) -> None:
    def fail(*_args, **_kwargs):
        raise error

    monkeypatch.setattr(main_module, "assess_pronunciation", fail)
    response = client.post(
        "/pronunciation-assessment",
        data={"reference_text": "hola"},
        files={"audio": ("clip.webm", b"\x00\x00", "audio/webm")},
    )
    assert response.status_code == status
    assert response.json()["detail"]["code"] == code
    # Azure internals must never leak to the client.
    assert "Authentication" not in response.text
