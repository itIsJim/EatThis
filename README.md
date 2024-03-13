## Overview
![landing page of the application. Upload in the bottom-left corner and List in the bottom-right](/eat-this-front/public/landing.gif)

This app is a GPT-powered generative AI software that helps the user generate recipes with OpenAI APIs. It allows the user to input a single picture of ingredients and returns a recipe with an image illustration. 

## Requirements
Please refer to OpenAI Configuration or scroll down.

## Getting Started

### FastAPI server
Then, run the development back-end server:

```bash
cd eat-this-back

uvicorn main:app --reload 
```
##### -> FastAPI server on 🚀

Open [http://127.0.0.1:8000/docs](http://localhost:3000) with your browser to see the API endpoints.
***

### Next.js server
First, run the development front-end server:

```bash
cd eat-this-front

npm install

npm run dev 
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
##### -> Next.js server on 🚀

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Eat this!
![illustration of the UI in upload_page](/eat-this-front/public/upload_page.gif)

## OpenAI Configuration
Please refer to the [OpenAI API documentation](https://beta.openai.com/docs/) to get your API key if you don't have one already.

Follow the step-by-step guide to set up your API key for your local system. Or you can simply set up your API key in a `.env` file in the `eat-this-back` of the project, as `OPENAI_API_KEY=sk-...`.

If you are using the `.env` file, make sure to add the `.env` file to your `.gitignore` file to avoid exposing your API key to the public. If the above-mentioned method does not work, please follow the OpenAI API documentation to set up your API key.

###### MacOS

- Open Terminal: You can find it in the Applications folder or search for it using Spotlight (Command + Space).


- Edit Bash Profile: Use the command `nano ~/.bash_profile` or `nano ~/.zshrc` (for newer MacOS versions) to open the profile file in a text editor.


- Add Environment Variable: In the editor, add the line below, replacing `your-api-key-here` with your actual API key:

     ```
     # in .bash_profile or .zshrc
     export OPENAI_API_KEY='your-api-key-here'
     ```

- Save and Exit: Press Ctrl+O to write the changes, followed by Ctrl+X to close the editor.


- Load Your Profile: Use the command `source ~/.bash_profile` or `source ~/.zshrc` to load the updated profile.


- Verification: Verify the setup by typing `echo $OPENAI_API_KEY` in the terminal. It should display your API key.

###### Windows

- Open Command Prompt: You can find it by searching "cmd" in the start menu.


- Set environment variable in the current session: To set the environment variable in the current session, use the command below, replacing `your-api-key-here` with your actual API key:

     ```
     setx OPENAI_API_KEY "your-api-key-here"
     ```
  This command will set the OPENAI_API_KEY environment variable for the current session.


- Permanent setup: To make the setup permanent, add the variable through the system properties as follows:
  Right-click on 'This PC' or 'My Computer' and select 'Properties'.
  Click on 'Advanced system settings'.
  Click the 'Environment Variables' button.
In the 'System variables' section, click 'New...' and enter OPENAI_API_KEY as the variable name and your API key as the variable value.


- Verification: Verification: To verify the setup, reopen the command prompt and type the command below. It should display your API key: `echo %OPENAI_API_KEY%`


## Specs
This is a Next.js project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with Python backend using FastAPI.
