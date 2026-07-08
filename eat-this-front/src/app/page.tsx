'use client'
import Link from "next/link";
import React, { useEffect, useState} from 'react';
import {Badge} from "@/app/components/utils/Badge/Badge";
import TextPrompt from "@/app/components/utils/textPrompt/TextPrompt";

export default function Home() {
  const [headerText, setHeaderText] = useState("Welcome to Eat This!");
  const handleHeaderText = (strValue:string) => {
    setHeaderText(strValue);
  };

  return (
          <main className="flex min-h-screen flex-col items-center justify-between p-4 sm:p-8 lg:p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
              <div className="flex flex-row w-full justify-center lg:w-auto">
                <TextPrompt text={headerText}/>
              </div>
            </div>

            {
              <div className="my-8">
                  <h1 className="mb-4 text-4xl sm:text-5xl font-bold text-center text-gray-900 dark:text-gray-100">
                      Eat This
                  </h1>
                  <p className="mb-8 text-center text-gray-600 dark:text-gray-400">
                      Your personal recipe generator
                  </p>
              </div>
            }

            <div className="mb-8 flex w-full max-w-5xl flex-col gap-4 text-center sm:flex-row sm:justify-around lg:mb-0 lg:text-left">
              <Link
                  onMouseOver={() => handleHeaderText("Upload a image now")}
                  onMouseLeave={()=> handleHeaderText("Welcome to Eat This!")}
                href="/upload"
                className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
                target="_self"
                rel="noopener noreferrer"
              >
                <h2 className={`mb-3 text-2xl font-semibold`}>
                  Upload{" "}
                  <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                    -&gt;
                  </span>
                </h2>
                <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
                  Upload a picture of your food and get a list of ingredients
                </p>
              </Link>
                <Link
                    onMouseOver={() => handleHeaderText("Check recipe list")}
                    onMouseLeave={()=> handleHeaderText("Welcome to Eat This!")}
                  href="/list"
                  className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
                  target="_self"
                  rel="noopener noreferrer"
                >
                  <h2 className={`mb-3 text-2xl font-semibold`}>
                    List{" "}
                    <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                      -&gt;
                    </span>
                  </h2>
                  <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
                    See the recipes that you have made
                  </p>
                </Link>

            </div>
          </main>
  );
}

