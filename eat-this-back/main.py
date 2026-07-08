import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAIError
from pydantic import BaseModel

from auth.deps import APP_MODE, HOSTED, charge_credits, optional_user
from openai_api.api.dalle_api import dalle
from openai_api.api.gpt_chat_api import gpt_chat
from openai_api.api.vision_api import vision

RECIPE_COST = int(os.environ.get("RECIPE_COST", 1))
IMAGE_COST = int(os.environ.get("IMAGE_COST", 4))

origins = [o.strip() for o in os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",") if o.strip()]

app = FastAPI(title="EatThis API")

if HOSTED:
    from auth.routes import router as auth_router

    app.include_router(auth_router)

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


@app.get("/config")
async def config():
    return {
        "mode": APP_MODE,
        "recipe_cost": RECIPE_COST,
        "image_cost": IMAGE_COST,
    }


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
async def recipe_description(message_body: MessageSchema, user=Depends(optional_user)):
    charge_credits(user, RECIPE_COST)
    try:
        gpt_chat_result = await run_in_threadpool(gpt_chat, message_body.message)
    except OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI recipe request failed: {e}")

    return JSONResponse(content={"message": "Recipe processed", "data": gpt_chat_result})


@app.post("/dalle/generate")
async def dalle_generate(message_body: MessageSchema, user=Depends(optional_user)):
    charge_credits(user, IMAGE_COST)
    try:
        dalle_result = await run_in_threadpool(dalle, message_body.message)
    except OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI image generation failed: {e}")

    return JSONResponse(content={"message": "Image generated", "data": dalle_result})
