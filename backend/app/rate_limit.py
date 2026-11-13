"""Per-user caps on scoring requests, so one account can't run up the Azure bill.

The limits sit above anything a person can do: a card takes at least ~3-4
seconds (hold the mic, wait for the score, watch the feedback), and nobody
keeps that pace up for hours. Only scripts sending audio nonstop hit them.
"""

import threading
import time
from bisect import bisect_right
from collections.abc import Callable

# (window in seconds, max scored attempts in that window)
LIMITS: tuple[tuple[int, int], ...] = (
    (60, 40),  # one every 1.5s: quick retries never hit this
    (60 * 60, 900),  # one every 4s for a full hour without stopping
    (24 * 60 * 60, 3000),  # ~3 hours of nonstop practice
)


class RateLimiter:
    """Sliding-window counts, kept in memory.

    Counts reset when the server restarts and aren't shared between server
    processes. Fine for one instance; use Redis or the database once there
    are several.
    """

    def __init__(
        self,
        limits: tuple[tuple[int, int], ...] = LIMITS,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.limits = limits
        self.clock = clock
        self._longest = max(window for window, _ in limits)
        self._hits: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def try_acquire(self, user_id: str) -> float | None:
        """Record an attempt if allowed. Returns None, or seconds to wait."""
        with self._lock:
            now = self.clock()
            hits = self._hits.setdefault(user_id, [])
            del hits[: bisect_right(hits, now - self._longest)]  # forget old attempts

            for window, max_hits in self.limits:
                recent = len(hits) - bisect_right(hits, now - window)
                if recent >= max_hits:
                    oldest_counted = hits[len(hits) - recent]
                    return oldest_counted + window - now

            hits.append(now)
            return None
