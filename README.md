# EatThis

EatThis is an AI-powered recipe generator. From a single photograph of ingredients — uploaded or captured in-app — it identifies the ingredients, visualizes them with instance segmentation, generates a recipe, and renders an illustration of the finished dish.

See [METHODOLOGY.md](METHODOLOGY.md) for the processing pipeline and model architecture, and [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment (Vercel + Docker + Supabase) and the open/hosted mode model.

## Project Structure

| Directory | Stack | Role |
|---|---|---|
| `eat-this-back` | Python, FastAPI, PyTorch | API server: OpenAI integration, SAM 3 segmentation |
| `eat-this-front` | Next.js 14, React 18, Tailwind CSS, GSAP | Web client |

## Requirements

- Python 3.11+ (tested on 3.13)
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)
- A [Hugging Face access token](https://huggingface.co/settings/tokens) with approved access to [`facebook/sam3`](https://huggingface.co/facebook/sam3)
- Approximately 6 GB of disk space (PyTorch and SAM 3 model weights)

## Configuration

Create `eat-this-back/.env` (template: `eat-this-back/.env.example`):

```
OPENAI_API_KEY=sk-...
HF_TOKEN=hf_...
```

Optional overrides (defaults shown):

```
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=dall-e-3
OPENAI_VISION_DETAIL=low
```

To point the frontend at a non-default backend address, set `NEXT_PUBLIC_API_URL` in `eat-this-front/.env.local` (default: `http://127.0.0.1:8000`).

## Running

Backend:

```bash
cd eat-this-back
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Interactive API documentation: http://127.0.0.1:8000/docs

Frontend:

```bash
cd eat-this-front
npm install
npm run dev
```

Application: http://localhost:3000

Notes:
- SAM 3 weights (~3.4 GB) are downloaded automatically on the first segmentation request.
- Browser camera access requires HTTPS or `localhost`.

## API Reference

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/image/segment` | POST | multipart `image_file` (JPEG/PNG/WebP) | Ingredient list and labeled segmentation polygons |
| `/image/upload` | POST | multipart `image_file` | Ingredient list (identification only) |
| `/recipe/description` | POST | `{"message": "<ingredients>"}` | Formatted recipe text |
| `/dalle/generate` | POST | `{"message": "<description>"}` | Generated image URL |
