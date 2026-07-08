'use client'
import React, {useEffect, useMemo, useRef} from "react";
import gsap from "gsap";

const toPath = (polygon) =>
    `M ${polygon.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;

const centroid = (polygon) => {
    const [sx, sy] = polygon.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
    return [sx / polygon.length, sy / polygon.length];
};

const SegmentPreview = ({previewUrl, segData, isSegmenting}) => {
    const svgRef = useRef(null);
    const masks = segData?.masks || [];
    const width = segData?.width || 0;
    const height = segData?.height || 0;
    // viewBox units; the canvas is wider than the image, so keep labels readable
    const fontSize = Math.max(16, Math.round((width || 480) * 0.032));

    // Place each label in the left or right gutter (whichever side its item
    // is on), stacked to avoid overlaps, with a leader line to the item.
    const layout = useMemo(() => {
        if (!masks.length) return {items: [], gutter: 0};
        const maxChars = Math.max(...masks.map(m => m.label.length));
        const gutter = Math.min(width * 0.55, maxChars * fontSize * 0.62 + fontSize * 2);
        const left = [];
        const right = [];
        masks.forEach((mask) => {
            const [cx, cy] = centroid(mask.polygon);
            (cx < width / 2 ? left : right).push({...mask, cx, cy});
        });
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
        return {
            items: [
                ...left.map(m => ({...m, side: 'left'})),
                ...right.map(m => ({...m, side: 'right'})),
            ],
            gutter,
        };
    }, [segData, fontSize]);

    const {items, gutter} = layout;
    const gutterPct = width ? (gutter / (width + 2 * gutter)) * 100 : 0;

    useEffect(() => {
        if (!items.length || !svgRef.current) return;
        const ctx = gsap.context(() => {
            const drawn = gsap.utils.toArray('.mask-outline, .mask-leader');
            drawn.forEach((el) => {
                const len = el.getTotalLength();
                gsap.set(el, {strokeDasharray: len, strokeDashoffset: len, opacity: 1});
            });

            const tl = gsap.timeline({defaults: {ease: 'power2.out'}});
            tl.to('.mask-outline', {strokeDashoffset: 0, duration: 0.6, stagger: 0.06});
            tl.to('.mask-fill', {opacity: 0.12, duration: 0.25, stagger: 0.06}, 0.15);
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
                stagger: 0.05,
            }, 0.45);
            tl.to('.mask-outline', {opacity: 0.75, duration: 0.4, ease: 'sine.inOut'}, '>0.1');
        }, svgRef);
        return () => ctx.revert();
    }, [items]);

    if (!previewUrl) return null;

    return (
        <div className="relative mx-auto w-full max-w-3xl">
            <div
                className="relative"
                style={items.length ? {marginLeft: `${gutterPct}%`, marginRight: `${gutterPct}%`} : undefined}
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
            {items.length > 0 && (
                <svg
                    ref={svgRef}
                    viewBox={`${-gutter} 0 ${width + 2 * gutter} ${height}`}
                    className="pointer-events-none absolute inset-0 h-full w-full select-none"
                >
                    {items.map((mask, i) => {
                        const strokeW = Math.max(1.5, width * 0.0028);
                        const isLeft = mask.side === 'left';
                        const textX = isLeft ? -fontSize * 0.6 : width + fontSize * 0.6;
                        const lineStartX = isLeft ? -fontSize * 0.35 : width + fontSize * 0.35;
                        const markerSize = fontSize * 0.32;
                        return (
                            <g key={i}>
                                <path
                                    className="mask-fill"
                                    d={toPath(mask.polygon)}
                                    fill="#ffffff"
                                    opacity="0"
                                />
                                <path
                                    className="mask-outline"
                                    d={toPath(mask.polygon)}
                                    fill="none"
                                    stroke="#000000"
                                    strokeWidth={strokeW * 1.8}
                                    strokeLinejoin="round"
                                    opacity="0"
                                />
                                <path
                                    className="mask-outline"
                                    d={toPath(mask.polygon)}
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth={strokeW * 0.9}
                                    strokeLinejoin="round"
                                    opacity="0"
                                />
                                {/* leader line: background casing + foreground line */}
                                <line
                                    className="mask-leader"
                                    x1={lineStartX} y1={mask.ly}
                                    x2={mask.cx} y2={mask.cy}
                                    style={{stroke: 'var(--background)'}}
                                    strokeWidth={strokeW * 2.2}
                                    opacity="0"
                                />
                                <line
                                    className="mask-leader"
                                    x1={lineStartX} y1={mask.ly}
                                    x2={mask.cx} y2={mask.cy}
                                    style={{stroke: 'var(--foreground)'}}
                                    strokeWidth={strokeW * 0.9}
                                    opacity="0"
                                />
                                <g className="mask-label" opacity="0">
                                    {/* Bauhaus square marker on the item */}
                                    <rect
                                        x={mask.cx - markerSize / 2}
                                        y={mask.cy - markerSize / 2}
                                        width={markerSize}
                                        height={markerSize}
                                        style={{fill: 'var(--foreground)', stroke: 'var(--background)'}}
                                        strokeWidth={strokeW * 0.5}
                                    />
                                    <text
                                        x={textX}
                                        y={mask.ly}
                                        textAnchor={isLeft ? 'end' : 'start'}
                                        dominantBaseline="central"
                                        fontSize={fontSize}
                                        fontWeight="700"
                                        letterSpacing="0.1em"
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
