'use client'
import Link from "next/link";
import React, { useState } from 'react';
import TextPrompt from "@/app/components/utils/textPrompt/TextPrompt";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function Home() {
  const [headerText, setHeaderText] = useState("Welcome to Eat This");
  const handleHeaderText = (strValue: string) => {
    setHeaderText(strValue);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 sm:p-8 lg:p-16">
      <div className="flex w-full max-w-4xl items-center gap-3">
        <TextPrompt text={headerText}/>
        <ThemeToggle/>
      </div>

      <div className="my-10 flex flex-col items-center">
        {/* Bauhaus form triad */}
        <div className="mb-8 flex items-center gap-5" aria-hidden="true">
          <span className="h-8 w-8 rounded-full bg-black dark:bg-white"/>
          <span className="h-8 w-8 bg-black dark:bg-white"/>
          <span className="h-0 w-0 border-b-[32px] border-l-[18px] border-r-[18px] border-b-black border-l-transparent border-r-transparent dark:border-b-white"/>
        </div>
        <h1 className="text-center text-6xl font-bold uppercase leading-none tracking-tight sm:text-8xl">
          Eat<br/>This
        </h1>
        <p className="mt-6 text-center text-xs uppercase tracking-[0.4em] opacity-60">
          Photo · Ingredients · Recipe
        </p>
      </div>

      <div className="mb-4 grid w-full max-w-4xl grid-cols-1 sm:grid-cols-2">
        <Link
          onMouseOver={() => handleHeaderText("Upload an image now")}
          onMouseLeave={() => handleHeaderText("Welcome to Eat This")}
          href="/upload"
          className="group border-2 border-black p-6 transition-colors hover:bg-black hover:text-white sm:border-r-0 dark:border-white dark:hover:bg-white dark:hover:text-black"
        >
          <h2 className="mb-2 text-xl font-bold uppercase tracking-[0.15em]">
            Upload <span className="inline-block transition-transform group-hover:translate-x-2 motion-reduce:transform-none">→</span>
          </h2>
          <p className="m-0 max-w-[36ch] text-sm opacity-60">
            Photograph your ingredients and get a recipe
          </p>
        </Link>
        <Link
          onMouseOver={() => handleHeaderText("Check recipe list")}
          onMouseLeave={() => handleHeaderText("Welcome to Eat This")}
          href="/list"
          className="group border-2 border-t-0 border-black p-6 transition-colors hover:bg-black hover:text-white sm:border-t-2 dark:border-white dark:hover:bg-white dark:hover:text-black"
        >
          <h2 className="mb-2 text-xl font-bold uppercase tracking-[0.15em]">
            List <span className="inline-block transition-transform group-hover:translate-x-2 motion-reduce:transform-none">→</span>
          </h2>
          <p className="m-0 max-w-[36ch] text-sm opacity-60">
            The recipes you have saved
          </p>
        </Link>
      </div>
    </main>
  );
}
