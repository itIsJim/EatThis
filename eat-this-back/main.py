from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAIError
from pydantic import BaseModel

from openai_api.api.dalle_api import dalle
from openai_api.api.gpt_chat_api import gpt_chat
from openai_api.api.vision_api import vision

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app = FastAPI(title="EatThis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

IMAGE_SIGNATURES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",
}


def detect_image_type(content: bytes) -> str | None:
    for signature, mime_type in IMAGE_SIGNATURES.items():
        if content.startswith(signature):
            return mime_type
    return None


class MessageSchema(BaseModel):
    message: str


@app.get("/")
async def root():
    return {"message": "EatThis API is running"}


@app.post("/image/upload")
async def img_upload(image_file: UploadFile = File(...)):
    content = await image_file.read()
    mime_type = detect_image_type(content)
    if mime_type is None:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed.")

    try:
        vision_result = await run_in_threadpool(vision, content, mime_type)
    except OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI vision request failed: {e}")

    return JSONResponse(content={"message": "Image processed", "data": vision_result})


@app.post("/image/segment")
async def img_segment(image_file: UploadFile = File(...)):
    content = await image_file.read()
    mime_type = detect_image_type(content)
    if mime_type is None:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed.")

    try:
        ingredients = await run_in_threadpool(vision, content, mime_type)
    except OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI vision request failed: {e}")

    labels = [label.strip() for label in (ingredients or "").split(",") if label.strip()][:10]

    seg = {"width": None, "height": None, "masks": []}
    if labels:
        try:
            from segmentation.sam3_api import segment_image

            seg = await run_in_threadpool(segment_image, content, labels)
        except Exception as e:
            # Segmentation is best-effort: the preview degrades to no masks,
            # but the ingredient list must still reach the client.
            print(f"SAM 3 segmentation failed: {e}")

    return JSONResponse(content={
        "message": "Image segmented",
        "data": {"ingredients": ingredients, **seg},
    })


@app.post("/recipe/description")
async def recipe_description(message_body: MessageSchema):
    try:
        gpt_chat_result = await run_in_threadpool(gpt_chat, message_body.message)
    except OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI recipe request failed: {e}")

    return JSONResponse(content={"message": "Recipe processed", "data": gpt_chat_result})


@app.post("/dalle/generate")
async def dalle_generate(message_body: MessageSchema):
    try:
        dalle_result = await run_in_threadpool(dalle, message_body.message)
    except OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI image generation failed: {e}")

    return JSONResponse(content={"message": "Image generated", "data": dalle_result})
