import React, { useEffect, useState } from "react";

const TextPrompt = ({ text }) => {
    // Messages ending in "..." are waiting states: type the message without
    // the dots, then show a looping animated ellipsis.
    const waiting = /\.\.\.\s*$/.test(text || '');
    const base = waiting ? (text || '').replace(/\s*\.\.\.\s*$/, ' ') : (text || '');

    const [displayedText, setDisplayedText] = useState('');
    const typingSpeedMs = 100 / (0.05 * base?.length || 1); // Avoid division by zero
    const doneTyping = displayedText.length >= base.length;

    // Reset displayedText when text prop changes
    useEffect(() => {
        setDisplayedText('');
    }, [text]);

    useEffect(() => {
        if (base && displayedText.length < base.length) {
            const timeoutId = setTimeout(() => {
                setDisplayedText(base.substring(0, displayedText.length + 1));
            }, typingSpeedMs);

            return () => clearTimeout(timeoutId);
        }
    }, [displayedText, base]);

    return (
        <div className="typewriter w-full">
            <p className="whitespace-pre-line flex w-full justify-center border-2 border-black bg-white p-3 text-sm sm:p-4 sm:text-base dark:border-white dark:bg-black">
                <span className="break-words">
                    {displayedText}
                    {waiting && doneTyping && <span className="dots font-bold"/>}
                    <code className="cursor font-mono font-bold">|</code>
                </span>
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

                @keyframes dots {
                    0% { content: ''; }
                    25% { content: '.'; }
                    50% { content: '..'; }
                    75% { content: '...'; }
                }

                .dots::after {
                    display: inline-block;
                    content: '';
                    animation: dots 1.2s steps(1, end) infinite;
                }
            `}</style>
        </div>
    );
};

export default TextPrompt;
