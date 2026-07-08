import io
import threading

import cv2
import numpy as np
import torch
from PIL import Image

MODEL_ID = "facebook/sam3"

_lock = threading.Lock()
_model = None
_processor = None


def _device() -> str:
    return "mps" if torch.backends.mps.is_available() else "cpu"


def _load():
    global _model, _processor
    with _lock:
        if _model is None:
            from transformers import Sam3Model, Sam3Processor

            _processor = Sam3Processor.from_pretrained(MODEL_ID)
            _model = Sam3Model.from_pretrained(MODEL_ID).to(_device()).eval()
    return _model, _processor


def _mask_to_polygon(mask: np.ndarray, max_points: int = 60):
    contours, _ = cv2.findContours(
        mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    if not contours:
        return None
    contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(contour) < 100:
        return None
    epsilon = 0.004 * cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)
    if len(approx) < 3:
        return None
    if len(approx) > max_points:
        idx = np.linspace(0, len(approx) - 1, max_points).astype(int)
        approx = approx[idx]
    return approx.tolist()


def segment_image(content: bytes, labels: list[str], score_threshold: float = 0.5, max_side: int = 1024) -> dict:
    """Run SAM 3 text-prompted segmentation for each label; return labelled polygons."""
    model, processor = _load()
    image = Image.open(io.BytesIO(content)).convert("RGB")
    if max(image.size) > max_side:
        scale = max_side / max(image.size)
        image = image.resize((round(image.width * scale), round(image.height * scale)))

    device = next(model.parameters()).device
    masks = []
    for label in labels:
        inputs = processor(images=image, text=label, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model(**inputs)
        results = processor.post_process_instance_segmentation(
            outputs,
            threshold=score_threshold,
            mask_threshold=0.5,
            target_sizes=inputs.get("original_sizes").tolist(),
        )[0]
        for mask, score in zip(results["masks"], results["scores"]):
            polygon = _mask_to_polygon(mask.cpu().numpy())
            if polygon:
                masks.append({
                    "label": label,
                    "score": round(float(score), 3),
                    "polygon": polygon,
                })

    return {"width": image.width, "height": image.height, "masks": masks}
