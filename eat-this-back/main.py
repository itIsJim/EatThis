import asyncio
import base64
import imghdr

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from openai_api.route import api_router


import matplotlib
matplotlib.use('Agg')

origins = [
    "http://localhost:3000",
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/hello/{name}")
async def say_hello(name: str):
    return {"message": f"Hello {name}"}


processed_data = {}



@app.post("/image/upload")
async def img_upload(background_tasks: BackgroundTasks, image_file: UploadFile = File(...)):
    try:
        # Check if the uploaded file is a JPEG image
        image_format = imghdr.what(None, h=image_file.file.read(32))
        if image_format not in {"jpeg", "jpg"}:
            raise HTTPException(status_code=400, detail="Only JPEG images are allowed.")

        # Reset file cursor position to the beginning
        image_file.file.seek(0)
        content = await image_file.read()
        vision_result = api_router("vision", content)
        return JSONResponse(content={"message": "Image processed", "data": vision_result})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {e}")


class MessageSchema(BaseModel):
    message: str
@app.post("/recipe/description")
async def img_description(background_tasks: BackgroundTasks, message_body: MessageSchema):
    try:
        message = message_body.message
        gpt_chat_result = api_router("gpt_chat", message)
        return JSONResponse(content={"message":"Recipe Processed", "data": gpt_chat_result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image description: {e}")


@app.post("/dalle/generate")
async def img_description(background_tasks: BackgroundTasks, message_body: MessageSchema):
    try:
        message = message_body.message
        dalle_result = api_router("dalle", message)
        return JSONResponse(content={"message":"Recipe Processed", "data": dalle_result})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image description: {e}")