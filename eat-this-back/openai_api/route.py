from openai_api.api.vision_api import vision
from openai_api.api.dalle_api import dalle
from openai_api.api.gpt_chat_api import gpt_chat


def api_router(api_name, obj):
    if api_name == "vision":
        return vision(obj)
    elif api_name == "gpt_chat":
        return gpt_chat(obj)
    elif api_name == "dalle":
        return dalle(obj)
    else:
        return "MISSING API NAME"
