'use client'
import React, {useEffect, useMemo, useRef} from "react";
import gsap from "gsap";

const toPath = (polygon) =>
    `M ${polygon.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;

const centroid = (polygon) => {
    const [sx, sy] = polygon.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
    return [sx / polygon.length, sy / polygon.length];
};

const polygonArea = (polygon) =>
    Math.abs(polygon.reduce((acc, [x, y], i) => {
        const [x2, y2] = polygon[(i + 1) % polygon.length];
        return acc + (x * y2 - x2 * y);
    }, 0)) / 2;

const bboxOf = (polygon) => {
    const xs = polygon.map(p => p[0]);
    const ys = polygon.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return {minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY};
};

// Callouts are held to a golden-ratio minority of all labels — the rest sit
// directly on their items, so leader lines stay an accent, not a thicket.
const CALLOUT_SHARE = 0.382;

const SegmentPreview = ({previewUrl, segData, isSegmenting}) => {
    const svgRef = useRef(null);
    const masks = segData?.masks || [];
    const width = segData?.width || 0;
    const height = segData?.height || 0;
    const fontSize = Math.max(15, Math.round((width || 480) * 0.03));

    const layout = useMemo(() => {
        if (!masks.length) return {onItem: [], callouts: [], gutter: 0};

        // One label per unique ingredient: the largest instance represents it;
        // every mask still gets an outline.
        const byLabel = new Map();
        masks.forEach((m) => {
            const area = polygonArea(m.polygon);
            const current = byLabel.get(m.label);
            if (!current || area > current.area) byLabel.set(m.label, {...m, area});
        });
        const reps = [...byLabel.values()].map(m => {
            const [cx, cy] = centroid(m.polygon);
            return {...m, cx, cy, bb: bboxOf(m.polygon)};
        });

        // Crowded scenes tolerate proportionally larger on-item tags: more
        // labels on items means fewer lines crossing the picture.
        const crowding = Math.min(1, reps.length / 10);
        const fitRatio = 0.3 + 0.35 * crowding;

        const tagDims = (label, size) => ({
            w: label.length * size * 0.62 + size * 0.9,
            h: size * 1.5,
        });

        reps.forEach(r => {
            const {w, h} = tagDims(r.label, fontSize);
            r.fits = w <= r.bb.w * 0.95 && w * h <= r.area * fitRatio;
            r.fontSize = fontSize;
        });

        let callouts = reps.filter(r => !r.fits);
        const onItem = reps.filter(r => r.fits);

        const maxCallouts = Math.max(1, Math.round(reps.length * CALLOUT_SHARE));
        if (callouts.length > maxCallouts) {
            callouts.sort((a, b) => a.area - b.area);
            // Smallest items keep their leader lines; the rest get shrunk on-item tags.
            callouts.slice(maxCallouts).forEach(r => {
                r.fontSize = Math.max(10, Math.min(
                    fontSize,
                    (r.bb.w * 0.92 - fontSize * 0.9) / (r.label.length * 0.62)
                ));
                onItem.push(r);
            });
            callouts = callouts.slice(0, maxCallouts);
        }

        let gutter = 0;
        if (callouts.length) {
            const maxChars = Math.max(...callouts.map(m => m.label.length));
            gutter = Math.min(width * 0.5, maxChars * fontSize * 0.62 + fontSize * 2);
            const left = callouts.filter(m => m.cx < width / 2);
            const right = callouts.filter(m => m.cx >= width / 2);
            const minGap = fontSize * 1.9;
            const place = (arr) => {
                arr.sort((a, b) => a.cy - b.cy);
                let prev = -Infinity;
                arr.forEach(item => {
                    item.ly = Math.max(item.cy, prev + minGap, fontSize);
                    prev = item.ly;
                });
                const overflow = prev - (height - fontSize * 0.6);
                if (overflow > 0) arr.forEach(item => { item.ly -= overflow; });
            };
            place(left);
            place(right);
            callouts = [
                ...left.map(m => ({...m, side: 'left'})),
                ...right.map(m => ({...m, side: 'right'})),
            ];
        }

        return {onItem, callouts, gutter};
    }, [segData, fontSize]);

    const {onItem, callouts, gutter} = layout;
    const hasLabels = onItem.length + callouts.length > 0;
    const gutterPct = width ? (gutter / (width + 2 * gutter)) * 100 : 0;
    const strokeW = Math.max(1.5, width * 0.0028);

    useEffect(() => {
        if (!hasLabels || !svgRef.current) return;
        const ctx = gsap.context(() => {
            const drawn = gsap.utils.toArray('.mask-outline, .mask-leader');
            drawn.forEach((el) => {
                const len = el.getTotalLength();
                gsap.set(el, {strokeDasharray: len, strokeDashoffset: len, opacity: 1});
            });

            const tl = gsap.timeline({defaults: {ease: 'power2.out'}});
            tl.to('.mask-outline', {strokeDashoffset: 0, duration: 0.6, stagger: 0.05});
            tl.to('.mask-fill', {opacity: 0.12, duration: 0.25, stagger: 0.05}, 0.15);
            tl.to('.mask-leader', {strokeDashoffset: 0, duration: 0.35, stagger: 0.05}, 0.35);
            tl.fromTo('.mask-label', {
                opacity: 0,
                scale: 0.6,
                transformOrigin: 'center center',
            }, {
                opacity: 1,
                scale: 1,
                duration: 0.3,
                ease: 'back.out(2)',
                stagger: 0.04,
            }, 0.4);
            tl.to('.mask-outline', {opacity: 0.75, duration: 0.4, ease: 'sine.inOut'}, '>0.1');
        }, svgRef);
        return () => ctx.revert();
    }, [layout]);

    if (!previewUrl) return null;

    return (
        <div className="relative mx-auto w-full max-w-3xl">
            <div
                className="relative"
                style={gutter ? {marginLeft: `${gutterPct}%`, marginRight: `${gutterPct}%`} : undefined}
            >
                <img
                    src={previewUrl}
                    alt="Your ingredients"
                    className={`h-auto w-full border-2 border-black dark:border-white ${isSegmenting ? 'animate-pulse' : ''}`}
                />
                {isSegmenting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black">
                            Detecting ingredients ...
                        </span>
                    </div>
                )}
            </div>
            {hasLabels && (
                <svg
                    ref={svgRef}
                    viewBox={`${-gutter} 0 ${width + 2 * gutter} ${height}`}
                    className="pointer-events-none absolute inset-0 h-full w-full select-none"
                >
                    {masks.map((mask, i) => (
                        <g key={`outline-${i}`}>
                            <path className="mask-fill" d={toPath(mask.polygon)} fill="#ffffff" opacity="0"/>
                            <path
                                className="mask-outline"
                                d={toPath(mask.polygon)}
                                fill="none" stroke="#000000"
                                strokeWidth={strokeW * 1.8} strokeLinejoin="round" opacity="0"
                            />
                            <path
                                className="mask-outline"
                                d={toPath(mask.polygon)}
                                fill="none" stroke="#ffffff"
                                strokeWidth={strokeW * 0.9} strokeLinejoin="round" opacity="0"
                            />
                        </g>
                    ))}
                    {onItem.map((mask, i) => {
                        const label = mask.label.toUpperCase();
                        const size = mask.fontSize;
                        const tagW = label.length * size * 0.62 + size * 0.9;
                        const tagH = size * 1.5;
                        return (
                            <g key={`tag-${i}`} className="mask-label" opacity="0">
                                <rect
                                    x={mask.cx - tagW / 2} y={mask.cy - tagH / 2}
                                    width={tagW} height={tagH} fill="#000000"
                                />
                                <text
                                    x={mask.cx} y={mask.cy}
                                    textAnchor="middle" dominantBaseline="central"
                                    fontSize={size} fontWeight="700" letterSpacing="0.1em"
                                    fill="#ffffff"
                                >
                                    {label}
                                </text>
                            </g>
                        );
                    })}
                    {callouts.map((mask, i) => {
                        const isLeft = mask.side === 'left';
                        const textX = isLeft ? -fontSize * 0.6 : width + fontSize * 0.6;
                        const lineStartX = isLeft ? -fontSize * 0.35 : width + fontSize * 0.35;
                        const markerSize = fontSize * 0.32;
                        return (
                            <g key={`callout-${i}`}>
                                <line
                                    className="mask-leader"
                                    x1={lineStartX} y1={mask.ly} x2={mask.cx} y2={mask.cy}
                                    style={{stroke: 'var(--background)'}}
                                    strokeWidth={strokeW * 2.2} opacity="0"
                                />
                                <line
                                    className="mask-leader"
                                    x1={lineStartX} y1={mask.ly} x2={mask.cx} y2={mask.cy}
                                    style={{stroke: 'var(--foreground)'}}
                                    strokeWidth={strokeW * 0.9} opacity="0"
                                />
                                <g className="mask-label" opacity="0">
                                    <rect
                                        x={mask.cx - markerSize / 2} y={mask.cy - markerSize / 2}
                                        width={markerSize} height={markerSize}
                                        style={{fill: 'var(--foreground)', stroke: 'var(--background)'}}
                                        strokeWidth={strokeW * 0.5}
                                    />
                                    <text
                                        x={textX} y={mask.ly}
                                        textAnchor={isLeft ? 'end' : 'start'} dominantBaseline="central"
                                        fontSize={fontSize} fontWeight="700" letterSpacing="0.1em"
                                        style={{fill: 'var(--foreground)'}}
                                    >
                                        {mask.label.toUpperCase()}
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                </svg>
            )}
        </div>
    );
};

export default SegmentPreview;
