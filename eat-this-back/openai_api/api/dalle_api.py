from openai_api.client import IMAGE_MODEL, get_client


def dalle(msg: str) -> str:
    prompt = "Hyper-realistic photo of a single plated dish cooked from these ingredients: " + msg

    response = get_client().images.generate(
        model=IMAGE_MODEL,
        prompt=prompt,
        size="1024x1024",
        quality="standard",
        n=1,
    )
    return response.data[0].url
