import React, { useEffect, useState } from "react";

const TextPrompt = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');
    // Adjust typing speed as needed
    const typingSpeedMs = 100 / (0.05 * text?.length || 1); // Avoid division by zero

    // Reset displayedText when text prop changes
    useEffect(() => {
        setDisplayedText('');
    }, [text]);

    useEffect(() => {
        if (text && displayedText.length < text.length) {
            const timeoutId = setTimeout(() => {
                setDisplayedText(text.substring(0, displayedText.length + 1));
            }, typingSpeedMs);

            return () => clearTimeout(timeoutId);
        }
    }, [displayedText, text]);

    return (
        <div className="typewriter">
            <p className="whitespace-pre-line flex w-full justify-center rounded-xl border border-gray-300 bg-gray-200 p-3 text-sm sm:p-4 sm:text-base dark:border-neutral-800 dark:bg-zinc-800/30">
                <span className="break-words">{displayedText}<code className="cursor font-mono font-bold">|</code></span>
            </p>
            <style jsx>{`
                @keyframes blink {
                    50% {
                        opacity: 0;
                    }
                }

                .cursor {
                    animation: blink 1s step-start infinite;
                }
            `}</style>
        </div>
    );
};

export default TextPrompt;
