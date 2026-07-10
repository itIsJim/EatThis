"""Recipe pre-generation: start the local LLM on the ingredients while SAM 3
is still drawing masks, so the recipe is ready the moment the user confirms."""
from concurrent.futures import Future, ThreadPoolExecutor
from threading import Lock

_executor = ThreadPoolExecutor(max_workers=1)
_futures: dict[str, Future] = {}
_lock = Lock()
_MAX_PENDING = 8


def start(ingredients: str, fn) -> None:
    """Kick off recipe generation in the background (idempotent per input)."""
    with _lock:
        if ingredients not in _futures:
            _futures[ingredients] = _executor.submit(fn, f"Ingredients: {ingredients}")
        while len(_futures) > _MAX_PENDING:
            _futures.pop(next(iter(_futures)))


def result(ingredients: str, fn, timeout: float = 180) -> str:
    """Return the precomputed recipe, or compute it now if none was started."""
    with _lock:
        future = _futures.pop(ingredients, None)
    if future is None:
        future = _executor.submit(fn, f"Ingredients: {ingredients}")
    return future.result(timeout=timeout)
