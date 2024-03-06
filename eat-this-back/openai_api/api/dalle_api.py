
from dotenv import load_dotenv
from openai import OpenAI, OpenAIError

client = OpenAI()
load_dotenv()


def dalle(msg):

    prompt="Make a hyper-realistic and photo-like image of a dish using this recipe description. Only make a single image for one dish." + msg + ""

    try:
        print("Running DALL.E...")

        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )

        image_url = response.data[0].url
        print("DALL.E Done!")
        return image_url
    except OpenAIError as e:
        print(e)
