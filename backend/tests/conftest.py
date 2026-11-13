import os

# config.py reads these at import time; tests never call Azure or Supabase.
os.environ.setdefault("AZURE_SPEECH_KEY", "test-key")
os.environ.setdefault("AZURE_SPEECH_REGION", "test-region")
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")

# Imported after the env vars above are set.
import pytest  # noqa: E402

from app import main as main_module  # noqa: E402
from app.auth import current_user_id  # noqa: E402
from app.rate_limit import RateLimiter  # noqa: E402


def pytest_configure(config):
    config.addinivalue_line("markers", "real_auth: check the real sign-in token")


@pytest.fixture(autouse=True)
def signed_in_user(request):
    """Every test runs as signed-in "user-1" with fresh rate limits.

    Tests of the sign-in check itself opt out with `@pytest.mark.real_auth`.
    """
    main_module.rate_limiter = RateLimiter()
    if not request.node.get_closest_marker("real_auth"):
        main_module.app.dependency_overrides[current_user_id] = lambda: "user-1"
    yield
    main_module.app.dependency_overrides.clear()
