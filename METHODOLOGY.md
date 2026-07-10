# Methodology

This document describes the EatThis processing pipeline and the role of each model.

## Pipeline Overview

```
photo (upload / camera)
        │
        ▼
[1] Client-side preprocessing          (browser)
        │
        ▼
[2] Ingredient identification          (GPT-4o-mini, vision)
        │
        ▼
[3] Instance segmentation              (SAM 3, local inference)
        │
        ▼
[4] Preview rendering                  (SVG + GSAP, browser)
        │
[4b] Dish-scope analysis               (Qwen2.5-1.5B, local)   ─ concurrent with [4c]
[4c] Taste preference input            (user: salty/sweet, hot/cold)
        │  user confirms
        ▼
[5a] Recipe generation ──┐             (GPT-4o-mini, chat)     ─ parallel
[5b] Dish illustration ──┘             (gpt-image-1.5)         ─ parallel
```

### 1. Client-side preprocessing

Captured or uploaded images are downscaled in the browser (canvas, longest edge ≤ 1024 px, JPEG q0.85) before transmission. This bounds upload latency, vision-token consumption, and segmentation input size irrespective of source resolution.

### 2. Ingredient identification

A single vision request to `gpt-4o-mini` returns a comma-separated list of visible items. Images are submitted at `detail: low` (fixed ~2.8K image tokens), which empirically matches high-detail accuracy for countertop ingredient scenes at roughly one-tenth the cost. The model output serves two purposes: the text-prompt vocabulary for segmentation (step 3) and the input for recipe generation (step 5a).

### 3. Instance segmentation — SAM 3

Segmentation uses Meta's **SAM 3** (`facebook/sam3`), a promptable concept-segmentation model, executed locally in the FastAPI process via Hugging Face Transformers.

- **Prompting.** SAM 3 does not perform open-ended object discovery; it segments instances of concepts supplied as text prompts. Each ingredient name from step 2 (capped at 10) is issued as an independent text prompt, yielding masks that are inherently labeled.
- **Inference.** The model is lazily loaded once per process and placed on Apple Silicon GPU (MPS) when available, otherwise CPU. Inputs are bounded at 1024 px. Instance post-processing applies a 0.5 score and mask threshold.
- **Vectorization.** Binary masks are converted to compact outline polygons (OpenCV external contours → Douglas-Peucker simplification, ≤ 60 vertices, sub-100 px² regions discarded). Polygon payloads are orders of magnitude smaller than raster masks and directly renderable as SVG paths.
- **Degradation.** Segmentation is best-effort: on any failure the endpoint still returns the ingredient list, and the client renders the preview without overlays.

### 4. Preview rendering

The client renders the photograph with an SVG overlay whose viewBox extends beyond the image into lateral gutters, guaranteeing mask registration at any display size. A GSAP timeline (~1.5 s total) animates, per mask with short staggers: a monochrome double-stroke outline drawn via stroke-dashoffset, a subtle fill, a leader line from the item to its label, and the ingredient name — set in the application typeface, placed as a callout in the gutter nearest the item and connected by the leader line to a square marker at the mask centroid. Label positions are collision-resolved vertically per side. The user reviews detected ingredients before committing to generation.

### 4b–4c. Dish-scope analysis and taste preference

While the user reviews the preview, two inputs are gathered concurrently:

- **Dish-scope analysis** — a small open-weight LLM (`Qwen/Qwen2.5-1.5B-Instruct`, Apache-2.0, ungated) runs locally to propose up to four dish directions achievable with the detected ingredients, each tagged salty/sweet and hot/cold. Zero API cost; greedy decoding, ≤180 new tokens.
- **Taste preference** — optional salty/sweet and hot/cold selections in the UI; unset dimensions are left to the model.

These are combined with the ingredient list into a single generation brief (`Ingredients / Craving / Candidate dishes`).

### 5. Generation

On confirmation, the brief is dispatched concurrently to:

- **Recipe generation** — `gpt-4o-mini` with a compact system prompt enforcing a fixed plain-text format (dish name, emoji-prefixed ingredients, en-dash steps), capped at 400 output tokens; instructed to honor the craving and may adapt a candidate dish.
- **Dish illustration** — `gpt-image-1.5` (1024×1024), prompted from the same brief.

Running these in parallel reduces end-to-end latency from `vision + recipe + image` to `vision + max(recipe, image)`. No image or vision call is repeated after the preview stage.

## Cost and Latency Profile

Per full run (defaults, as of 2026-07):

| Stage | Model | Typical latency | Approximate cost |
|---|---|---|---|
| Identification | gpt-4o-mini (detail: low) | 1–3 s | <$0.001 |
| Segmentation | SAM 3 (local) | 3–10 s / prompt* | $0 |
| Recipe | gpt-4o-mini (≤400 tokens out) | 2–5 s | <$0.001 |
| Illustration | DALL·E 3 | 10–20 s | ~$0.04 |

\* Apple Silicon (MPS). First request per process additionally incurs model load (~10–20 s); first request ever downloads ~3.4 GB of weights.

## Design Decisions

- **Vision + SAM 3 split.** SAM 3 requires a prompt vocabulary; exhaustively prompting a fixed ingredient dictionary is computationally infeasible locally. A single low-cost vision call supplies an image-specific vocabulary, and its output is reused for generation, so segmentation adds no marginal API cost.
- **Local segmentation.** Zero per-request cost and no third-party image transfer, at the expense of one-time weight download and host-dependent latency. The module is isolated behind one function; substituting a hosted endpoint (e.g. Replicate) requires no changes elsewhere.
- **Polygons over rasters.** Contour polygons reduce payload size, avoid mask compositing in the client, and enable stroke-based line animation directly.
