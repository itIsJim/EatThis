import os

import requests
from openai import OpenAI, OpenAIError


client = OpenAI()


def gpt_chat(message):
    system_setup = ("You are a professional chef that takes in a string of objects delimited by commas descripting the objects in an image. First remove the objects that are not useful for cooking and generates a delicious recipe based on the given objects in the image. The prompt should give a list of ingredient and a list of steps to coook the food")
    system_setup2 = ("Always write the text in with Ingredient: and Steps: with \"–\" bullet points for each step and ingredients.")
    system_setup3 = ("Add an emoji that represents that ingredient and a newline character at the end of each step and ingredient. That is, new line for each string.")
    user_setup = ("Make a recipe for the following image description: " + message)
    try:
        print("Running GPT Chat...")

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_setup},
                {"role": "system", "content": system_setup2},
                {"role": "system", "content": system_setup3},
                {"role": "user", "content": user_setup},

            ]
        )

        print(response.choices[0].message.content)

        return response.choices[0].message.content
    except OpenAIError as e:
        print(e)

    print("Chat Done!")