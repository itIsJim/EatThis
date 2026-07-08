from openai_api.client import CHAT_MODEL, get_client

SYSTEM_PROMPT = (
    "You are a chef. Given a comma-separated list of objects, ignore non-food "
    "items and write one concise recipe from the rest. Plain text only, no "
    "markdown. Format:\n"
    "Dish name on the first line.\n"
    "'Ingredients:' section — one per line, each starting with a fitting emoji.\n"
    "'Steps:' section — one per line, each starting with '–'."
)


def gpt_chat(message: str) -> str:
    response = get_client().chat.completions.create(
        model=CHAT_MODEL,
        max_tokens=400,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
    )
    return response.choices[0].message.content
