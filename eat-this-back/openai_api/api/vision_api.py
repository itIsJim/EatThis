import base64
import os
import time

from openai_api.client import VISION_MODEL, get_client
from telemetry import log_call, token_cost

# "low" = fixed ~2.8K image tokens (~90% cheaper); set to "high" if small
# ingredients get missed.
VISION_DETAIL = os.environ.get("OPENAI_VISION_DETAIL", "low")

PROMPT = (
    "List the distinct objects clearly visible in this image as a "
    "comma-separated list, e.g. 'dog, tree, car'. Nothing else."
)


def vision(img: bytes, mime_type: str = "image/jpeg") -> str:
    base64_image = base64.b64encode(img).decode("utf-8")

    t0 = time.perf_counter()
    response = get_client().chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}",
                            "detail": VISION_DETAIL,
                        },
                    },
                ],
            }
        ],
        max_tokens=150,
    )
    usage = response.usage
    log_call(
        "vision", "openai", VISION_MODEL, time.perf_counter() - t0,
        cost=token_cost(VISION_MODEL, usage.prompt_tokens, usage.completion_tokens),
        tokens_in=usage.prompt_tokens, tokens_out=usage.completion_tokens,
        detail=VISION_DETAIL,
    )
    return response.choices[0].message.content
