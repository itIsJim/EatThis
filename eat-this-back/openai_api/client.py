import os
from functools import lru_cache

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

VISION_MODEL = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o-mini")
CHAT_MODEL = os.environ.get("OPENAI_CHAT_MODEL", "gpt-4o-mini")
IMAGE_MODEL = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1.5")


@lru_cache(maxsize=1)
def get_client() -> OpenAI:
    return OpenAI()
