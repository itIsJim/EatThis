# EatThis

EatThis is an AI-powered recipe generator. From a single photograph of ingredients — uploaded or captured in-app — it identifies the ingredients, visualizes them with instance segmentation, generates a recipe, and renders an illustration of the finished dish.

The application is a single Python service: FastAPI serves both the JSON API and a server-rendered UI (Jinja2 + htmx). Client-side JavaScript is limited to camera capture and the theme toggle; all logic, layout computation, and animation timing run in Python, with animations executed as CSS keyframes.

See [METHODOLOGY.md](METHODOLOGY.md) for the processing pipeline and model architecture.

## Project Structure

| Path | Stack | Role |
|---|---|---|
| `eat-this-back` | Python, FastAPI, PyTorch, Jinja2/htmx | Complete application: UI, API, OpenAI integration, SAM 3 segmentation, local LLM analysis |
| `eat-this-back/web` | Python + templates | Server-rendered UI: pages, htmx fragments, mask-overlay layout engine, saved-recipes store |

## Requirements

- Python 3.11+ (tested on 3.13)
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A [Hugging Face access token](https://huggingface.co/settings/tokens) with approved access to [`facebook/sam3`](https://huggingface.co/facebook/sam3)
- Approximately 9 GB of disk space (PyTorch, SAM 3, and local LLM weights)

## Configuration

Create `eat-this-back/.env` (template: `eat-this-back/.env.example`):

```
OPENAI_API_KEY=sk-...
HF_TOKEN=hf_...
```

Optional overrides (defaults shown):

```
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1.5
OPENAI_VISION_DETAIL=low
DISH_SCOPE_MODEL=Qwen/Qwen2.5-1.5B-Instruct
RECIPE_ENGINE=local
LOG_LEVEL=INFO
```

## Running

```bash
cd eat-this-back
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Application: http://127.0.0.1:8000 · API documentation: http://127.0.0.1:8000/docs

Notes:
- Model weights (~6.5 GB total) download automatically on first use.
- Browser camera access requires HTTPS or `localhost`.

## API Reference

The UI is served at `/`, `/app`, and `/list` (htmx fragments under `/ui/*`). JSON endpoints:

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/image/segment` | POST | multipart `image_file` (JPEG/PNG/WebP) | Ingredient list and labeled segmentation polygons |
| `/image/upload` | POST | multipart `image_file` | Ingredient list (identification only) |
| `/recipe/scope` | POST | `{"message": "<ingredients>"}` | Dimension-tagged culinary characteristics (local LLM) |
| `/recipe/description` | POST | `{"message": "<brief>"}` | Formatted recipe text |
| `/dalle/generate` | POST | `{"message": "<brief>"}` | Generated image (URL or data URI) |
| `/health`, `/config` | GET | — | Service status / mode and credit costs |
