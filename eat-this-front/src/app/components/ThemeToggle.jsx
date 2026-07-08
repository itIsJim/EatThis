'use client'
import React, {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";

const ThemeToggle = () => {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        setDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggle = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        try {
            localStorage.setItem('theme', next ? 'dark' : 'light');
        } catch {}
    };

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={toggle}
            aria-label="Toggle light/dark mode"
            className="shrink-0 text-base leading-none"
        >
            {dark ? '○' : '●'}
        </Button>
    );
};

export default ThemeToggle;
