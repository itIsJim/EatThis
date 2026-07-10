import time

from openai_api.client import IMAGE_MODEL, get_client
from telemetry import image_cost, log_call


def dalle(msg: str) -> str:
    prompt = "Hyper-realistic photo of a single plated serving of: " + msg

    kwargs = {
        "model": IMAGE_MODEL,
        "prompt": prompt,
        "size": "1024x1024",
        "n": 1,
    }
    # dall-e models take quality "standard"/"hd"; gpt-image models default to "auto"
    if IMAGE_MODEL.startswith("dall-e"):
        kwargs["quality"] = "standard"

    t0 = time.perf_counter()
    response = get_client().images.generate(**kwargs)
    item = response.data[0]
    # dall-e returns a hosted URL; gpt-image models return base64 only
    url = getattr(item, "url", None)
    usage = getattr(response, "usage", None)
    log_call(
        "image", "openai", IMAGE_MODEL, time.perf_counter() - t0,
        cost=image_cost(IMAGE_MODEL),
        tokens_in=getattr(usage, "input_tokens", None),
        tokens_out=getattr(usage, "output_tokens", None),
        size=kwargs["size"],
        result="url" if url else f"b64({len(item.b64_json) // 1024}KB)",
    )
    if url:
        return url
    return "data:image/png;base64," + item.b64_json
