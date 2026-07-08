'use client'
import React, {useEffect, useRef} from "react";
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
    // Sizes are in viewBox units — scaled so labels stay legible when a
    // ~1024px-wide viewBox is squeezed onto a phone screen.
    const fontSize = Math.max(16, Math.round((width || 480) * 0.032));

    useEffect(() => {
        if (!masks.length || !svgRef.current) return;
        const ctx = gsap.context(() => {
            const outlines = gsap.utils.toArray('.mask-outline');
            outlines.forEach((path) => {
                const len = path.getTotalLength();
                gsap.set(path, {strokeDasharray: len, strokeDashoffset: len, opacity: 1});
            });

            const tl = gsap.timeline({defaults: {ease: 'power2.inOut'}});
            tl.to(outlines, {
                strokeDashoffset: 0,
                duration: 1.3,
                stagger: 0.2,
            });
            tl.to('.mask-fill', {
                opacity: 0.12,
                duration: 0.6,
                stagger: 0.2,
            }, 0.5);
            tl.fromTo('.mask-label', {
                opacity: 0,
                scale: 0.4,
                transformOrigin: 'center center',
            }, {
                opacity: 1,
                scale: 1,
                duration: 0.5,
                ease: 'back.out(2.2)',
                stagger: 0.2,
            }, 0.9);
            tl.to(outlines, {
                opacity: 0.75,
                duration: 0.8,
                ease: 'sine.inOut',
            }, '>0.3');
        }, svgRef);
        return () => ctx.revert();
    }, [segData]);

    if (!previewUrl) return null;

    return (
        <div className="relative mx-auto w-full max-w-xl">
            <img
                src={previewUrl}
                alt="Your ingredients"
                className={`w-full h-auto rounded-xl border border-gray-300 dark:border-neutral-700 ${isSegmenting ? 'animate-pulse' : ''}`}
            />
            {isSegmenting && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                    <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-800">
                        🔍 Detecting ingredients ...
                    </span>
                </div>
            )}
            {masks.length > 0 && (
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    className="pointer-events-none absolute inset-0 h-full w-full select-none"
                >
                    {masks.map((mask, i) => {
                        const strokeW = Math.max(1.5, width * 0.0028);
                        return (
                            <g key={i}>
                                <path
                                    className="mask-fill"
                                    d={toPath(mask.polygon)}
                                    fill="#ffffff"
                                    opacity="0"
                                />
                                {/* black under-stroke + white line: monochrome, legible on any photo */}
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
                            </g>
                        );
                    })}
                    {masks.map((mask, i) => {
                        const [cx, cy] = centroid(mask.polygon);
                        const label = mask.label.toUpperCase();
                        // Estimated tag width: uppercase Jost with tracking ≈ 0.72em per char
                        const tagW = label.length * fontSize * 0.72 + fontSize;
                        const tagH = fontSize * 1.6;
                        return (
                            <g key={`label-${i}`} className="mask-label" opacity="0">
                                <rect
                                    x={cx - tagW / 2}
                                    y={cy - tagH / 2}
                                    width={tagW}
                                    height={tagH}
                                    fill="#000000"
                                />
                                <text
                                    x={cx}
                                    y={cy}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize={fontSize}
                                    fontWeight="700"
                                    letterSpacing="0.12em"
                                    fill="#ffffff"
                                >
                                    {label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            )}
        </div>
    );
};

export default SegmentPreview;
