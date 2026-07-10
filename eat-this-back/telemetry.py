"""Terminal telemetry for model calls: status, latency, tokens, cost.

One aligned log line per call, e.g.:

  21:14:03 INFO  llm  | task=vision    provider=openai model=gpt-4o-mini dur=1.82s tokens=2843+21 detail=low cost=$0.000439 session=$0.0004
  21:14:22 INFO  llm  | task=segment   provider=local  model=facebook/sam3 dur=8.31s device=mps labels=6 masks=9
  21:15:02 INFO  llm  | task=image     provider=openai model=gpt-image-1.5 dur=18.40s size=1024x1024 result=b64(2326KB) cost=$0.032000 session=$0.0324

LOG_LEVEL env var controls verbosity (default INFO).
"""
import logging
import os
import threading

LLM_LOGGER = logging.getLogger("llm")
HTTP_LOGGER = logging.getLogger("http")

# USD per 1M tokens (input, output)
TOKEN_PRICES = {
    "gpt-4o-mini": (0.15, 0.60),
    "gpt-4o": (2.50, 10.00),
    "gpt-4.1-mini": (0.40, 1.60),
    "gpt-4.1": (2.00, 8.00),
}

# Flat USD estimate per generated image (1024x1024)
IMAGE_PRICES = {
    "gpt-image-1.5": 0.03,
    "gpt-image-1": 0.04,
    "dall-e-3": 0.04,
    "dall-e-2": 0.02,
}

_session = {"cost": 0.0, "calls": 0}
_lock = threading.Lock()


def setup_logging() -> None:
    level = os.environ.get("LOG_LEVEL", "INFO").upper()
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)-5s %(name)-4s | %(message)s", datefmt="%H:%M:%S"
    )
    for logger in (LLM_LOGGER, HTTP_LOGGER):
        if not logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        logger.setLevel(level)
        logger.propagate = False


def token_cost(model: str, tokens_in: int, tokens_out: int) -> float | None:
    # Longest matching prefix wins (gpt-4o-mini before gpt-4o)
    for prefix in sorted(TOKEN_PRICES, key=len, reverse=True):
        if model.startswith(prefix):
            p_in, p_out = TOKEN_PRICES[prefix]
            return tokens_in / 1e6 * p_in + tokens_out / 1e6 * p_out
    return None


def image_cost(model: str) -> float | None:
    for prefix in sorted(IMAGE_PRICES, key=len, reverse=True):
        if model.startswith(prefix):
            return IMAGE_PRICES[prefix]
    return None


def log_call(task: str, provider: str, model: str, dur: float,
             cost: float | None = None, tokens_in: int | None = None,
             tokens_out: int | None = None, **fields) -> None:
    with _lock:
        _session["calls"] += 1
        if cost:
            _session["cost"] += cost
        session_cost = _session["cost"]

    parts = [
        f"task={task:<9}",
        f"provider={provider:<6}",
        f"model={model}",
        f"dur={dur:.2f}s",
    ]
    if tokens_in is not None and tokens_out is not None:
        parts.append(f"tokens={tokens_in}+{tokens_out}")
    elif tokens_out is not None:
        parts.append(f"tokens_out={tokens_out}")
    elif tokens_in is not None:
        parts.append(f"tokens_in={tokens_in}")
    parts += [f"{k}={v}" for k, v in fields.items() if v is not None]
    if cost is not None:
        parts.append(f"cost=${cost:.6f}")
    if provider == "openai":
        parts.append(f"session=${session_cost:.4f}")
    LLM_LOGGER.info(" ".join(parts))


def log_status(message: str) -> None:
    LLM_LOGGER.info(message)
