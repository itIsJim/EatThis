import base64


from dotenv import load_dotenv
import os
import requests
from openai import OpenAI, OpenAIError

client = OpenAI()
load_dotenv()


def vision(img):
    base64_image = base64.b64encode(img).decode('utf-8')
    openai_api_key = os.environ.get("OPENAI_API_KEY")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {openai_api_key}"
    }

    payload = {
        "model": "gpt-4-vision-preview",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Analyze the content of the uploaded image carefully. Identify all distinct objects present in the image. Return a list of these objects in a simple, concise format, separated by commas. For example, if you recognize a dog, a tree, and a car in the image, your response should be formatted as 'dog, tree, car'. Please ensure the list is comprehensive and only includes items clearly visible in the image."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 300
    }
    try:
        print("Running GPT Vision...")

        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)

        print(response.json())

        return response.json()
    except OpenAIError as e:
        print(e)

    print("Vision Done!")