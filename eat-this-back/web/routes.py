"""Server-rendered UI: pages and htmx fragments. All logic lives in Python;
the client only renders HTML and CSS animations."""
import base64
import io
import os
from pathlib import Path

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from openai import OpenAIError
from PIL import Image

from analysis.dish_scope import local_recipe, visual_brief
from openai_api.api.dalle_api import dalle
from openai_api.api.gpt_chat_api import gpt_chat
from openai_api.api.vision_api import vision
from telemetry import LLM_LOGGER
from web import precompute, saves
from web.layout import build_overlay

router = APIRouter()
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))

RECIPE_ENGINE = os.environ.get("RECIPE_ENGINE", "local").lower()

# Generated dish images awaiting save — kept server-side so the client never
# round-trips megabytes of base64 through a form post (which 400s).
_pending_images: dict[str, str] = {}


def _stash_image(image: str) -> str:
    import uuid

    token = uuid.uuid4().hex
    _pending_images[token] = image
    while len(_pending_images) > 8:
        _pending_images.pop(next(iter(_pending_images)))
    return token


def _prepare_dish(brief: str) -> dict:
    """Background pipeline: recipe, then a compact visual brief for the image."""
    recipe = local_recipe(brief)
    try:
        visual = visual_brief(recipe)
    except Exception as e:
        LLM_LOGGER.warning(f"visual brief failed: {e}")
        visual = ""
    return {"recipe": recipe, "visual": visual}


def _downscale(content: bytes, max_side: int = 1024, quality: int = 85):
    image = Image.open(io.BytesIO(content)).convert("RGB")
    if max(image.size) > max_side:
        scale = max_side / max(image.size)
        image = image.resize((round(image.width * scale), round(image.height * scale)))
    buf = io.BytesIO()
    image.save(buf, "JPEG", quality=quality)
    return buf.getvalue(), image.width, image.height


def _error(request: Request, message: str) -> HTMLResponse:
    return templates.TemplateResponse(request, "fragments/error.html", {"message": message})


# ---- pages ----

@router.get("/", response_class=HTMLResponse)
async def page_index(request: Request):
    return templates.TemplateResponse(request, "index.html", {})


@router.get("/app", response_class=HTMLResponse)
async def page_app(request: Request):
    return templates.TemplateResponse(request, "app.html", {})


@router.get("/list", response_class=HTMLResponse)
async def page_list(request: Request):
    sid = request.cookies.get("sid")
    items = saves.list_saves(sid) if sid else []
    return templates.TemplateResponse(request, "list.html", {"saves": items})


# ---- fragments ----

@router.post("/ui/segment", response_class=HTMLResponse)
async def ui_segment(request: Request, image_file: UploadFile = File(...)):
    from fastapi.concurrency import run_in_threadpool

    content = await image_file.read()
    if not content:
        return _error(request, "No image received — try again")
    try:
        small, width, height = _downscale(content)
    except Exception:
        return _error(request, "That file doesn't look like an image")

    try:
        ingredients = await run_in_threadpool(vision, small, "image/jpeg")
    except OpenAIError as e:
        LLM_LOGGER.warning(f"vision failed: {e}")
        return _error(request, "Couldn't identify the ingredients — check the backend logs")

    # Pre-generate the recipe on the local LLM while SAM 3 runs the masks,
    # so it is ready the moment the user hits Make recipe (free, local).
    if ingredients and RECIPE_ENGINE != "openai":
        precompute.start(ingredients, _prepare_dish)

    labels = [l.strip() for l in (ingredients or "").split(",") if l.strip()][:10]
    masks = []
    if labels:
        try:
            from segmentation.sam3_api import segment_image

            seg = await run_in_threadpool(segment_image, small, labels)
            masks, width, height = seg["masks"], seg["width"], seg["height"]
        except Exception as e:
            LLM_LOGGER.warning(f"segmentation failed (degrading to no masks): {e}")

    overlay = build_overlay(masks, width, height)
    photo = "data:image/jpeg;base64," + base64.b64encode(small).decode()
    status = (f"I found: {ingredients}.\nHit Make recipe!"
              if ingredients else "I couldn't spot anything — try another photo.")
    return templates.TemplateResponse(request, "fragments/preview.html", {
        "photo": photo, "overlay": overlay, "ingredients": ingredients or "", "status": status,
    })


@router.post("/ui/generate", response_class=HTMLResponse)
async def ui_generate(request: Request, ingredients: str = Form(...)):
    from fastapi.concurrency import run_in_threadpool

    visual = ""
    try:
        if RECIPE_ENGINE == "openai":
            recipe = await run_in_threadpool(gpt_chat, f"Ingredients: {ingredients}")
            try:
                visual = await run_in_threadpool(visual_brief, recipe)
            except Exception:
                visual = ""
        else:
            # Usually instant: pre-generated while the masks were drawing
            prepared = await run_in_threadpool(precompute.result, ingredients, _prepare_dish)
            recipe, visual = prepared["recipe"], prepared["visual"]
    except Exception as e:
        LLM_LOGGER.warning(f"recipe generation failed: {e}")
        return _error(request, "Recipe generation failed — try again")

    dish = next((line.strip() for line in recipe.splitlines() if line.strip()), "the dish")[:60]
    if visual:
        # Visual grounding distilled from the cooking steps by the local LLM
        image_brief = f"{dish} — {visual}"
        if len(image_brief) > 300:
            image_brief = image_brief[:300].rsplit(" ", 1)[0]
    else:
        key_ingredients = ", ".join([i.strip() for i in ingredients.split(",") if i.strip()][:6])
        image_brief = f"{dish}, made with {key_ingredients}"[:220] if key_ingredients else dish
    return templates.TemplateResponse(request, "fragments/generate.html", {
        "recipe": recipe, "dish": dish, "image_brief": image_brief,
    })


@router.post("/ui/image", response_class=HTMLResponse)
async def ui_image(request: Request, brief: str = Form(...)):
    from fastapi.concurrency import run_in_threadpool

    try:
        image = await run_in_threadpool(dalle, brief)
    except Exception as e:
        LLM_LOGGER.warning(f"image generation failed: {e}")
        return _error(request, "Couldn't draw the dish — the recipe still stands")
    return templates.TemplateResponse(request, "fragments/image.html", {
        "image": image, "image_token": _stash_image(image),
    })


@router.post("/ui/save", response_class=HTMLResponse)
async def ui_save(request: Request, recipe: str = Form(...), image_token: str = Form(...)):
    image = _pending_images.pop(image_token, None)
    if image is None:
        return _error(request, "This dish already expired — generate it again to save")
    sid = request.cookies.get("sid") or saves.new_sid()
    saves.add_save(sid, recipe, image)
    response = HTMLResponse(
        '<button class="bh-btn" id="action-btn" hx-swap-oob="true" disabled>Saved ✓</button>'
        '<span id="status-text" hx-swap-oob="true">Recipe and picture saved to your list!</span>'
    )
    response.set_cookie("sid", sid, max_age=365 * 24 * 3600, httponly=True, samesite="lax")
    return response


@router.post("/ui/save/{save_id}/delete", response_class=HTMLResponse)
async def ui_save_delete(request: Request, save_id: int):
    sid = request.cookies.get("sid")
    if sid:
        saves.delete_save(sid, save_id)
    return HTMLResponse("")
