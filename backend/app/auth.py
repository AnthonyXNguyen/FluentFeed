"""Checks the Supabase login token the app sends with each request."""

import logging

import jwt
from fastapi import Header, HTTPException

from app.config import SUPABASE_URL

logger = logging.getLogger(__name__)

ISSUER = f"{SUPABASE_URL}/auth/v1"
# Supabase signs tokens with a private key and publishes the public half
# here, so verifying needs no secret. Keys are cached and refetched hourly.
jwks_client = jwt.PyJWKClient(f"{ISSUER}/.well-known/jwks.json", lifespan=3600)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail={"code": "unauthorized", "message": "Sign in to continue."},
        headers={"WWW-Authenticate": "Bearer"},
    )


def current_user_id(authorization: str | None = Header(default=None)) -> str:
    """FastAPI dependency: the signed-in user's id, or a 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise _unauthorized()
    token = authorization.removeprefix("Bearer ")
    try:
        key = jwks_client.get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key,
            # Only Supabase's asymmetric algorithms; never accept HS256/none.
            algorithms=["ES256", "RS256"],
            audience="authenticated",  # signed-in users, not the public anon key
            issuer=ISSUER,
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWKClientConnectionError as exc:
        # Our problem (can't reach Supabase), not the user's token.
        logger.error("Couldn't fetch Supabase signing keys: %s", exc)
        raise HTTPException(
            status_code=503,
            detail={"code": "service_unavailable", "message": "Sign-in check is unavailable."},
        ) from exc
    except jwt.PyJWTError as exc:  # bad signature, expired, unknown key, garbage...
        raise _unauthorized() from exc
    return claims["sub"]
