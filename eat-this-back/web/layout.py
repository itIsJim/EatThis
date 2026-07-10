"""Mask-label layout engine (ported from the former React SegmentPreview).

Given SAM 3 masks, computes a render-ready overlay spec: deduplicated labels,
on-item tags where they fit, callout leader lines capped at a golden-ratio
minority, gutters, and per-element animation delays. All geometry runs here so
the client only renders SVG.
"""
import math

DIMENS = None  # placeholder to avoid confusion with analysis.dish_scope.DIMENSIONS

CALLOUT_SHARE = 0.382  # golden-ratio minority


def _centroid(polygon):
    n = len(polygon)
    sx = sum(p[0] for p in polygon)
    sy = sum(p[1] for p in polygon)
    return sx / n, sy / n


def _area(polygon):
    total = 0.0
    for i, (x, y) in enumerate(polygon):
        x2, y2 = polygon[(i + 1) % len(polygon)]
        total += x * y2 - x2 * y
    return abs(total) / 2


def _bbox(polygon):
    xs = [p[0] for p in polygon]
    ys = [p[1] for p in polygon]
    return min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)


def _perimeter(polygon):
    total = 0.0
    for i, (x, y) in enumerate(polygon):
        x2, y2 = polygon[(i + 1) % len(polygon)]
        total += math.hypot(x2 - x, y2 - y)
    return total


def _path(polygon):
    return "M " + " L ".join(f"{x} {y}" for x, y in polygon) + " Z"


def build_overlay(masks: list[dict], width: int, height: int) -> dict:
    """Return a render-ready overlay spec for the segmentation preview."""
    if not masks or not width or not height:
        return {"width": width, "height": height, "gutter": 0,
                "outlines": [], "on_item": [], "callouts": []}

    font_size = max(15, round(width * 0.03))
    stroke_w = max(1.5, width * 0.0028)

    outlines = [{
        "path": _path(m["polygon"]),
        "length": round(_perimeter(m["polygon"]), 1),
        "delay_ms": i * 60,
    } for i, m in enumerate(masks)]

    # One label per unique ingredient: largest instance represents it
    by_label = {}
    for m in masks:
        area = _area(m["polygon"])
        if m["label"] not in by_label or area > by_label[m["label"]]["area"]:
            cx, cy = _centroid(m["polygon"])
            bx, by, bw, bh = _bbox(m["polygon"])
            by_label[m["label"]] = {"label": m["label"], "area": area,
                                    "cx": cx, "cy": cy, "bw": bw}
    reps = list(by_label.values())

    crowding = min(1.0, len(reps) / 10)
    fit_ratio = 0.3 + 0.35 * crowding

    def tag_w(label, size):
        return len(label) * size * 0.62 + size * 0.9

    for r in reps:
        w = tag_w(r["label"], font_size)
        r["fits"] = w <= r["bw"] * 0.95 and w * font_size * 1.5 <= r["area"] * fit_ratio
        r["font_size"] = font_size

    callouts = [r for r in reps if not r["fits"]]
    on_item = [r for r in reps if r["fits"]]

    max_callouts = max(1, round(len(reps) * CALLOUT_SHARE))
    if len(callouts) > max_callouts:
        callouts.sort(key=lambda r: r["area"])
        for r in callouts[max_callouts:]:
            r["font_size"] = max(10, min(
                font_size,
                (r["bw"] * 0.92 - font_size * 0.9) / (len(r["label"]) * 0.62),
            ))
            on_item.append(r)
        callouts = callouts[:max_callouts]

    gutter = 0
    if callouts:
        max_chars = max(len(r["label"]) for r in callouts)
        gutter = min(width * 0.5, max_chars * font_size * 0.62 + font_size * 2)
        min_gap = font_size * 1.9
        for side, group in (("left", [r for r in callouts if r["cx"] < width / 2]),
                            ("right", [r for r in callouts if r["cx"] >= width / 2])):
            group.sort(key=lambda r: r["cy"])
            prev = -math.inf
            for r in group:
                r["side"] = side
                r["ly"] = max(r["cy"], prev + min_gap, font_size)
                prev = r["ly"]
            overflow = prev - (height - font_size * 0.6)
            if overflow > 0:
                for r in group:
                    r["ly"] -= overflow

    base_delay = len(outlines) * 60 + 300
    for i, r in enumerate(on_item + callouts):
        r["delay_ms"] = base_delay + i * 50

    def round_fields(items, fields):
        return [{**r, **{f: round(r[f], 1) for f in fields if f in r}} for r in items]

    return {
        "width": width,
        "height": height,
        "font_size": font_size,
        "stroke_w": round(stroke_w, 2),
        "gutter": round(gutter, 1),
        "outlines": outlines,
        "on_item": round_fields(
            [{k: r[k] for k in ("label", "cx", "cy", "font_size", "delay_ms")} for r in on_item],
            ("cx", "cy", "font_size")),
        "callouts": round_fields(
            [{k: r[k] for k in ("label", "cx", "cy", "ly", "side", "delay_ms")} for r in callouts],
            ("cx", "cy", "ly")),
    }
