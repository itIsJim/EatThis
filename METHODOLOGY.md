# Methodology

This document describes the EatThis processing pipeline and the role of each model.

## Pipeline Overview

```
photo (upload / camera)
        │
        ▼
[1] Preprocessing                      (PIL, server)
        │
        ▼
[2] Ingredient identification          (GPT-4o-mini, vision)
        │
        ▼
[3a] Instance segmentation ──┐         (SAM 3, local)          ─ parallel
[3b] Recipe pre-generation ──┘         (local LLM)             ─ parallel
        │
        ▼
[4] Preview rendering                  (server-rendered SVG + CSS)
        │  user confirms
        ▼
[5a] Recipe served from cache          (pre-generated in 3b)
[5b] Dish illustration                 (gpt-image-1.5, prompted with dish name + visual brief)
```

### 1. Preprocessing

Captured or uploaded images are downscaled server-side (PIL, longest edge ≤ 1024 px, JPEG q85) on receipt. This bounds vision-token consumption and segmentation input size irrespective of source resolution.

### 2. Ingredient identification

A single vision request to `gpt-4o-mini` returns a comma-separated list of visible items. Images are submitted at `detail: low` (fixed ~2.8K image tokens), which empirically matches high-detail accuracy for countertop ingredient scenes at roughly one-tenth the cost. The model output serves two purposes: the text-prompt vocabulary for segmentation (step 3a) and the input for recipe generation (step 3b).

### 3. Instance segmentation — SAM 3

Segmentation uses Meta's **SAM 3** (`facebook/sam3`), a promptable concept-segmentation model, executed locally in the FastAPI process via Hugging Face Transformers.

- **Prompting.** SAM 3 does not perform open-ended object discovery; it segments instances of concepts supplied as text prompts. Each ingredient name from step 2 (capped at 10) is issued as an independent text prompt, yielding masks that are inherently labeled.
- **Inference.** The model is lazily loaded once per process and placed on Apple Silicon GPU (MPS) when available, otherwise CPU. Inputs are bounded at 1024 px. Instance post-processing applies a 0.5 score and mask threshold.
- **Vectorization.** Binary masks are converted to compact outline polygons (OpenCV external contours → Douglas-Peucker simplification, ≤ 60 vertices, sub-100 px² regions discarded). Polygon payloads are orders of magnitude smaller than raster masks and directly renderable as SVG paths.
- **Degradation.** Segmentation is best-effort: on any failure the endpoint still returns the ingredient list, and the client renders the preview without overlays.

### 4. Preview rendering

Overlay layout is computed server-side (`web/layout.py`): labels are deduplicated per ingredient; each label is placed directly on its item when the tag fits the mask (threshold scaling with mask density), with the remainder rendered as gutter callouts capped at a golden-ratio minority and collision-resolved vertically. The server emits render-ready SVG in a viewBox extending into lateral gutters, guaranteeing mask registration at any display size. Animation (~1.5 s) is pure CSS: stroke-dashoffset line drawing with per-element delays computed in Python, subtle fills, leader lines, and label pop-ins. The user reviews detected ingredients before committing to generation.

### 5. Generation

Recipe generation starts on the local LLM (`Qwen/Qwen2.5-1.5B-Instruct`, `RECIPE_ENGINE=local`) the moment ingredients are identified — concurrent with segmentation — so on confirmation the recipe is typically served from the pre-generation cache and printed immediately. A second local pass distills the recipe steps into a one-sentence **visual brief** (cooked state, colors, plating); the dish name plus this brief is the sole prompt for the illustration (`gpt-image-1.5`, 1024×1024). Ingredient emoji in the recipe are assigned deterministically from a keyword lexicon rather than trusted to the small model.

Net API surface per run: one low-detail vision call and one compact image prompt; all text generation is local. `RECIPE_ENGINE=openai` substitutes `gpt-4o-mini` at confirmation time (no pre-generation, to avoid speculative API spend).

## Cost and Latency Profile

Per full run (defaults, as of 2026-07):

| Stage | Model | Typical latency | Approximate cost |
|---|---|---|---|
| Identification | gpt-4o-mini (detail: low) | 1–3 s | <$0.001 |
| Segmentation | SAM 3 (local) | 3–10 s / prompt* | $0 |
| Recipe + visual brief | Qwen2.5-1.5B (local) | 3–15 s (hidden behind masking) | $0 |
| Illustration | gpt-image-1.5 | 10–25 s | ~$0.01–0.04 |

\* Apple Silicon (MPS). First request per process additionally incurs model load (~10–20 s); first request ever downloads ~3.4 GB of weights.

## Design Decisions

- **Vision + SAM 3 split.** SAM 3 requires a prompt vocabulary; exhaustively prompting a fixed ingredient dictionary is computationally infeasible locally. A single low-cost vision call supplies an image-specific vocabulary, and its output is reused for generation, so segmentation adds no marginal API cost.
- **Local segmentation.** Zero per-request cost and no third-party image transfer, at the expense of one-time weight download and host-dependent latency. The module is isolated behind one function; substituting a hosted endpoint (e.g. Replicate) requires no changes elsewhere.
- **Polygons over rasters.** Contour polygons reduce payload size, avoid mask compositing in the client, and enable stroke-based line animation directly.
