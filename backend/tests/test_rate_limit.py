from fastapi.testclient import TestClient

from app import main as main_module
from app.main import MAX_AUDIO_BYTES, app
from app.rate_limit import LIMITS, RateLimiter

client = TestClient(app)


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_heavy_but_human_practice_is_never_limited() -> None:
    clock = Clock()
    limiter = RateLimiter(clock=clock)
    # Rapid retries: one every 1.5s for 5 minutes.
    for _ in range(200):
        assert limiter.try_acquire("u") is None
        clock.now += 1.5
    clock.now += 3600  # come back later
    # A marathon: one card every 4s, nonstop, for 3 hours.
    for _ in range(3 * 60 * 60 // 4):
        assert limiter.try_acquire("u") is None
        clock.now += 4


def test_script_spamming_is_capped_per_minute() -> None:
    clock = Clock()
    limiter = RateLimiter(clock=clock)
    per_minute = LIMITS[0][1]
    for _ in range(per_minute):
        assert limiter.try_acquire("bot") is None
    wait = limiter.try_acquire("bot")
    assert wait is not None and 0 < wait <= 60
    # Other users are unaffected.
    assert limiter.try_acquire("someone-else") is None
    # And the bot gets back in once the window has passed.
    clock.now += wait
    assert limiter.try_acquire("bot") is None


def test_daily_cap() -> None:
    clock = Clock()
    limiter = RateLimiter(clock=clock)
    allowed = 0
    while limiter.try_acquire("bot") is None:
        allowed += 1
        clock.now += 10  # slow enough to dodge the minute/hour caps
    assert allowed == LIMITS[2][1]


def test_api_returns_429_with_retry_after(monkeypatch) -> None:
    monkeypatch.setattr(main_module, "assess_pronunciation", lambda *_: _ok())
    main_module.rate_limiter = RateLimiter(limits=((60, 2),))
    send = lambda: client.post(  # noqa: E731
        "/pronunciation-assessment",
        data={"reference_text": "hola"},
        files={"audio": ("clip.webm", b"\x00\x00", "audio/webm")},
    )
    assert send().status_code == 200
    assert send().status_code == 200
    response = send()
    assert response.status_code == 429
    assert response.json()["detail"]["code"] == "rate_limited"
    assert int(response.headers["Retry-After"]) > 0


def test_oversized_audio_is_refused_before_azure(monkeypatch) -> None:
    def azure_must_not_run(*_a, **_k):
        raise AssertionError("Azure was called with oversized audio")

    monkeypatch.setattr(main_module, "assess_pronunciation", azure_must_not_run)
    response = client.post(
        "/pronunciation-assessment",
        data={"reference_text": "hola"},
        files={"audio": ("clip.webm", b"\x00" * (MAX_AUDIO_BYTES + 1), "audio/webm")},
    )
    assert response.status_code == 413
    assert response.json()["detail"]["code"] == "audio_too_long"


def _ok():
    from app.schemas import PronunciationAssessmentResponse

    return PronunciationAssessmentResponse(
        recognized_text="hola",
        accuracy_score=90,
        fluency_score=90,
        completeness_score=90,
        pronunciation_score=90,
        words=[],
    )
