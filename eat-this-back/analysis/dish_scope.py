"""Local dish-scope analysis with a small open LLM (no API cost).

Given the detected ingredients, propose a handful of dish directions with
taste/temperature tags. Runs entirely locally via Hugging Face transformers;
the default model is ungated and Apache-2.0 licensed.
"""
import os
import threading
import time

import torch

from telemetry import log_call, log_status

MODEL_ID = os.environ.get("DISH_SCOPE_MODEL", "Qwen/Qwen2.5-1.5B-Instruct")

_lock = threading.Lock()
_pipe = None


def _load():
    global _pipe
    with _lock:
        if _pipe is None:
            from transformers import pipeline

            device = "mps" if torch.backends.mps.is_available() else "cpu"
            t0 = time.perf_counter()
            _pipe = pipeline(
                "text-generation",
                model=MODEL_ID,
                # fp16 on Apple GPU; fp32 on CPU (server deploys) where fp16 is slow
                torch_dtype=torch.float16 if device == "mps" else torch.float32,
                device=device,
            )
            log_status(f"loaded {MODEL_ID} on {_pipe.device} in {time.perf_counter() - t0:.1f}s")
    return _pipe


RECIPE_SYSTEM = (
    "You are a chef. You receive available ingredients and, optionally, "
    "characteristics the dish MUST have. Ignore non-food items. Write ONE "
    "concise recipe using the ingredients that satisfies EVERY required "
    "characteristic. Temperature is a strict rule: cold/cool means the dish is "
    "served cold or chilled (a salad, a chilled bowl — never served hot); hot "
    "means served hot. Write in English only. Plain text only, no markdown. "
    "At most 8 steps. Follow EXACTLY this output format:\n\n"
    "Golden Apple Toast\n"
    "Ingredients:\n"
    "🍎 1 apple, thinly sliced\n"
    "🍞 2 slices of bread\n"
    "🍯 1 tablespoon honey\n"
    "Steps:\n"
    "– Toast the bread until golden.\n"
    "– Layer the apple slices on the toast.\n"
    "– Drizzle with honey and serve."
)



# Deterministic ingredient emoji: small models guess these badly, so we
# overwrite whatever the model emitted using a keyword lexicon (longest
# match wins: "sweet potato" -> 🍠 before "potato" -> 🥔).
EMOJI_MAP = {
    "tomato": "🍅", "egg": "🥚", "basil": "🌿", "herb": "🌿", "parsley": "🌿",
    "cilantro": "🌿", "mint": "🌿", "rosemary": "🌿", "thyme": "🌿", "dill": "🌿",
    "bread": "🍞", "toast": "🍞", "baguette": "🥖", "cheese": "🧀", "milk": "🥛",
    "cream": "🥛", "yogurt": "🥛", "butter": "🧈", "salmon": "🐟", "fish": "🐟",
    "tuna": "🐟", "shrimp": "🦐", "prawn": "🦐", "crab": "🦀", "lobster": "🦞",
    "chicken": "🍗", "turkey": "🦃", "duck": "🍗", "beef": "🥩", "steak": "🥩",
    "meat": "🥩", "pork": "🥓", "bacon": "🥓", "ham": "🍖", "lamb": "🍖",
    "sausage": "🌭", "carrot": "🥕", "sweet potato": "🍠", "potato": "🥔",
    "broccoli": "🥦", "cauliflower": "🥦", "lettuce": "🥬", "spinach": "🥬",
    "kale": "🥬", "cabbage": "🥬", "bok choy": "🥬", "cucumber": "🥒",
    "zucchini": "🥒", "bell pepper": "🫑", "chili": "🌶", "chile": "🌶",
    "jalapeno": "🌶", "pepper": "🫑", "corn": "🌽", "mushroom": "🍄",
    "onion": "🧅", "shallot": "🧅", "garlic": "🧄", "avocado": "🥑",
    "lemon": "🍋", "lime": "🍋", "orange": "🍊", "apple": "🍎", "banana": "🍌",
    "strawberr": "🍓", "blueberr": "🫐", "raspberr": "🍓", "cranberr": "🍒",
    "grape": "🍇", "watermelon": "🍉", "melon": "🍈", "pineapple": "🍍",
    "mango": "🥭", "peach": "🍑", "pear": "🍐", "cherr": "🍒", "coconut": "🥥",
    "olive oil": "🫒", "olive": "🫒", "oil": "🫒", "rice": "🍚", "pasta": "🍝",
    "noodle": "🍜", "spaghetti": "🍝", "honey": "🍯", "salt": "🧂",
    "spice": "🧂", "seasoning": "🧂", "bean": "🫘", "chickpea": "🫘",
    "lentil": "🫘", "peanut": "🥜", "almond": "🥜", "walnut": "🥜", "nut": "🥜",
    "butternut": "🎃", "squash": "🎃", "pumpkin": "🎃", "juice": "🧃",
    "eggplant": "🍆", "pea": "🫛",
    "ginger": "🫚", "flour": "🌾", "oat": "🌾", "quinoa": "🌾",
    "chocolate": "🍫", "wine": "🍷", "broth": "🍲", "stock": "🍲",
    "water": "💧", "ice": "🧊",
}
_EMOJI_KEYS = sorted(EMOJI_MAP, key=len, reverse=True)


def _fix_ingredient_emoji(lines: list[str]) -> list[str]:
    import re

    out, in_ingredients = [], False
    for line in lines:
        stripped = line.strip()
        low = stripped.lower()
        if low.startswith("ingredients"):
            in_ingredients = True
            out.append(line)
            continue
        if low.startswith("steps"):
            in_ingredients = False
            out.append(line)
            continue
        if in_ingredients and stripped:
            core = re.sub(r"^[\W_]+", "", stripped).strip() or stripped
            emoji = next((EMOJI_MAP[k] for k in _EMOJI_KEYS if k in low), "🍽")
            out.append(f"{emoji} {core}")
        else:
            out.append(line)
    return out


def _normalize_recipe(text: str) -> str:
    import re

    # Small multilingual models occasionally bleed CJK tokens (e.g. 大蒜 for
    # garlic) — scrub them; emojis are outside these ranges and survive.
    text = re.sub(r'[⺀-鿿豈-﫿＀-￯]+', '', text)
    lines = [re.sub(r'^\s*(?:\d+[.)]|[-*•])\s+', '– ', line.strip()) for line in text.splitlines()]
    # If generation was cut off mid-sentence, drop the dangling fragment.
    while len(lines) > 3 and lines[-1].strip() and not re.search(r'[.!?:]$', lines[-1].strip()):
        lines.pop()
    lines = _fix_ingredient_emoji(lines)
    return '\n'.join(lines).strip()


def local_recipe(brief: str) -> str:
    pipe = _load()
    messages = [
        {"role": "system", "content": RECIPE_SYSTEM},
        {
            "role": "user",
            "content": brief + "\n\nSatisfy every required characteristic, "
            "especially the temperature (cold/cool = served chilled).",
        },
    ]
    t0 = time.perf_counter()
    out = pipe(messages, max_new_tokens=500, do_sample=False, return_full_text=False)
    text = out[0]["generated_text"].strip()
    log_call(
        "recipe", "local", MODEL_ID, time.perf_counter() - t0,
        tokens_out=len(pipe.tokenizer.encode(text)), device=str(pipe.device),
    )
    return _normalize_recipe(text)


# Semantic reference for culinary terms: canonical dimension per word.
# The lexicon overrides whatever bucket the LLM chose, so ambiguous words are
# deterministic — e.g. "hot" is always temperature (pungency is "spicy").
DIMENSIONS = ("taste", "temperature", "texture", "style")

LEXICON = {
    "taste": {
        "sweet", "savory", "salty", "sour", "bitter", "umami", "tangy",
        "spicy", "smoky", "rich", "mild", "zesty", "buttery", "garlicky",
        "herby", "nutty", "fruity", "earthy",
    },
    "temperature": {"hot", "cold", "warm", "chilled", "frozen", "iced"},
    "texture": {
        "creamy", "crunchy", "crispy", "tender", "juicy", "fluffy", "chewy",
        "smooth", "flaky", "silky", "sticky", "gooey", "moist",
    },
    "style": {
        "light", "hearty", "fresh", "comforting", "rustic", "elegant",
        "healthy", "indulgent", "quick", "simple", "vibrant", "wholesome",
    },
}

FALLBACK_TRAITS = [
    {"name": "savory", "dimension": "taste"},
    {"name": "sweet", "dimension": "taste"},
    {"name": "hot", "dimension": "temperature"},
    {"name": "cold", "dimension": "temperature"},
]


def _canonical_dimension(word: str, llm_dimension: str) -> str:
    for dimension, words in LEXICON.items():
        if word in words:
            return dimension
    return llm_dimension if llm_dimension in DIMENSIONS else "style"


def dish_scope(ingredients: str) -> list[dict]:
    """Ingredient-grounded culinary characteristics, each tagged with its
    semantic dimension: [{"name": "spicy", "dimension": "taste"}, ...]."""
    import re

    pipe = _load()
    messages = [
        {"role": "system", "content": "You are a concise culinary assistant."},
        {
            "role": "user",
            "content": (
                f"Available ingredients: {ingredients}.\n"
                "Which culinary characteristics could dishes cooked from these "
                "ingredients genuinely have? Only include characteristics these "
                "specific ingredients support. Reply in EXACTLY this format, "
                "single lowercase words, nothing else:\n"
                "taste: word, word, word\n"
                "temperature: word, word\n"
                "texture: word, word, word\n"
                "style: word, word"
            ),
        },
    ]
    t0 = time.perf_counter()
    out = pipe(messages, max_new_tokens=160, do_sample=False, return_full_text=False)
    text = out[0]["generated_text"].strip()

    traits, seen = [], set()
    for line in text.splitlines():
        if ':' not in line:
            continue
        llm_dimension, _, rest = line.partition(':')
        llm_dimension = llm_dimension.strip().lower()
        for word in rest.split(','):
            word = word.strip().lower()
            if word in seen or not re.fullmatch(r'[a-z][a-z-]{2,13}', word):
                continue
            seen.add(word)
            traits.append({"name": word, "dimension": _canonical_dimension(word, llm_dimension)})

    traits = traits[:16]
    if not traits:
        traits = FALLBACK_TRAITS
    traits.sort(key=lambda t: DIMENSIONS.index(t["dimension"]))

    log_call(
        "scope", "local", MODEL_ID, time.perf_counter() - t0,
        tokens_out=len(pipe.tokenizer.encode(text)), device=str(pipe.device),
        traits=len(traits),
    )
    return traits


def visual_brief(recipe: str) -> str:
    """One-sentence visual description of the finished dish, distilled from
    the recipe steps — grounding for the image generation prompt."""
    import re

    pipe = _load()
    messages = [
        {"role": "system", "content": "You describe finished dishes for a food photographer."},
        {
            "role": "user",
            "content": (
                f"Recipe:\n{recipe}\n\n"
                "In ONE sentence (max 30 words), describe exactly how the finished "
                "plated dish looks — cooked state, colors, arrangement, garnish — "
                "as implied by the steps. No instructions, only the visual. English only."
            ),
        },
    ]
    t0 = time.perf_counter()
    out = pipe(messages, max_new_tokens=60, do_sample=False, return_full_text=False)
    text = out[0]["generated_text"].strip()
    text = re.sub(r'[⺀-鿿豈-﫿＀-￯]+', '', text)
    text = " ".join(text.split())[:240]
    log_call(
        "visual", "local", MODEL_ID, time.perf_counter() - t0,
        tokens_out=len(pipe.tokenizer.encode(text)), device=str(pipe.device),
    )
    return text
