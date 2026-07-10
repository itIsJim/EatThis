import time

from openai_api.client import CHAT_MODEL, get_client
from telemetry import log_call, token_cost

SYSTEM_PROMPT = (
    "You are a chef. You receive available ingredients and, optionally, "
    "characteristics the dish MUST have. Ignore non-food items. Write ONE "
    "concise recipe using the ingredients that satisfies EVERY required "
    "characteristic — temperature strictly (cold/cool = served chilled, "
    "hot = served hot). Plain text only, no markdown. Format:\n"
    "Dish name on the first line.\n"
    "'Ingredients:' section — one per line, each starting with a fitting emoji.\n"
    "'Steps:' section — one per line, each starting with '–'."
)


def gpt_chat(message: str) -> str:
    t0 = time.perf_counter()
    response = get_client().chat.completions.create(
        model=CHAT_MODEL,
        max_tokens=400,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
    )
    usage = response.usage
    log_call(
        "recipe", "openai", CHAT_MODEL, time.perf_counter() - t0,
        cost=token_cost(CHAT_MODEL, usage.prompt_tokens, usage.completion_tokens),
        tokens_in=usage.prompt_tokens, tokens_out=usage.completion_tokens,
    )
    return response.choices[0].message.content
