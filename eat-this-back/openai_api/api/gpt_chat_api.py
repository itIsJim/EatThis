import os

import requests
from openai import OpenAI, OpenAIError


client = OpenAI()


def gpt_chat(message):
    system_setup = ("Imagine you're a professional chef with a unique talent: you create recipes based on objects you're given, described in a string separated by commas. Your first task is to sift through these objects and discard any that aren't related to cooking. Then, using the culinary items left, devise a delicious recipe. Choose only one dish to create, although there might be more than one dish possible")
    system_setup2 = ("Please present your recipe in a structured format. Start with a creative name of the dish centered at the top of the prompt and then a section titled 'Ingredients:', followed by a list where each ingredient is introduced with its corresponding emoji and ends with a newline character. Each ingredient should be on its own line.")
    system_setup3 = ("Next, include a section titled 'Steps:', where you outline the recipe preparation steps. Begin each step with a '–' bullet point, followed by concise instructions, and end with a newline character, ensuring each step is on its own line. Make sure use plain texts. Do not use makrdown or any other scripting.")
    system_setup4= ("For example, if you are given the objects 'apple, tire, carrot, sunflower', you would first eliminate 'tire' and 'sunflower' as non-culinary. Then, you would proceed to create a recipe using 'apple' and 'carrot', adhering to the specified formatting guidelines.")
    user_setup = ("Make a recipe for the following image description: " + message)
    try:
        print("Running GPT Chat...")

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_setup},
                {"role": "system", "content": system_setup2},
                {"role": "system", "content": system_setup3},
                {"role": "system", "content": system_setup4},
                {"role": "user", "content": user_setup},

            ]
        )

        print(response.choices[0].message.content)

        return response.choices[0].message.content
    except OpenAIError as e:
        print(e)

    print("Chat Done!")