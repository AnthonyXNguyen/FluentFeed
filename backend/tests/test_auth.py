import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app import auth
from app.main import app

pytestmark = pytest.mark.real_auth
client = TestClient(app)

# Stand-in for Supabase's signing key; the test serves its public half.
SUPABASE_KEY = ec.generate_private_key(ec.SECP256R1())
ATTACKER_KEY = ec.generate_private_key(ec.SECP256R1())


class FakeSigningKey:
    key = SUPABASE_KEY.public_key()


class FakeJwksClient:
    def get_signing_key_from_jwt(self, _token):
        return FakeSigningKey()


@pytest.fixture(autouse=True)
def fake_jwks(monkeypatch):
    monkeypatch.setattr(auth, "jwks_client", FakeJwksClient())


def make_token(key=SUPABASE_KEY, alg="ES256", **overrides) -> str:
    claims = {
        "sub": "user-123",
        "aud": "authenticated",
        "iss": auth.ISSUER,
        "exp": int(time.time()) + 3600,
        **overrides,
    }
    return jwt.encode(claims, key, algorithm=alg)


def post(headers: dict[str, str]):
    return client.post(
        "/pronunciation-assessment",
        headers=headers,
        data={"reference_text": "hola"},
        files={"audio": ("clip.webm", b"\x00\x00", "audio/webm")},
    )


def test_valid_token_gives_user_id() -> None:
    assert auth.current_user_id(f"Bearer {make_token()}") == "user-123"


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "not-bearer"},
        {"Authorization": "Bearer garbage"},
        {"Authorization": f"Bearer {make_token(key=ATTACKER_KEY)}"},  # forged
        {"Authorization": f"Bearer {make_token(exp=int(time.time()) - 10)}"},  # expired
        {"Authorization": f"Bearer {make_token(aud='anon')}"},  # not a signed-in user
        {"Authorization": f"Bearer {make_token(iss='https://evil.example/auth/v1')}"},
        {"Authorization": f"Bearer {make_token(key='secret', alg='HS256')}"},  # wrong alg
    ],
    ids=["missing", "not-bearer", "garbage", "forged", "expired", "anon", "wrong-issuer", "hs256"],
)
def test_rejected_tokens_get_401_before_azure(monkeypatch, headers) -> None:
    from app import main as main_module

    def azure_must_not_run(*_a, **_k):
        raise AssertionError("Azure was called for an unauthenticated request")

    monkeypatch.setattr(main_module, "assess_pronunciation", azure_must_not_run)
    response = post(headers)
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "unauthorized"


def test_unreachable_supabase_is_503_not_401(monkeypatch) -> None:
    class Down:
        def get_signing_key_from_jwt(self, _token):
            raise jwt.PyJWKClientConnectionError("timeout")

    monkeypatch.setattr(auth, "jwks_client", Down())
    response = post({"Authorization": f"Bearer {make_token()}"})
    assert response.status_code == 503
