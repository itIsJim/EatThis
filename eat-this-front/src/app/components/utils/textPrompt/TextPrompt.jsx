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
            <p className="whitespace-pre-line fixed left-0 top-0 right-0 bottom-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                <span>{displayedText}<code className="cursor font-mono font-bold">|</code></span>
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
