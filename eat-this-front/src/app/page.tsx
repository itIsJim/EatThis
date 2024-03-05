'use client'
import Image from "next/image";
import Link from "next/link";
import React, {createContext, useContext, useEffect, useState} from 'react';

export default function Home() {

  return (
          <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
              <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
                <a
                  className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
                  href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  By{" "}
                  <Image
                    src="/vercel.svg"
                    alt="Vercel Logo"
                    className="dark:invert"
                    width={100}
                    height={24}
                    priority
                  />
                </a>
              </div>
            </div>

            {
              <div >
                  <h1 className="mb-4 text-5xl font-bold text-center text-gray-900 dark:text-gray-100">
                      Eat This
                  </h1>
                  <p className="mb-8 text-center text-gray-600 dark:text-gray-400">
                      Your personal recipe generator
                  </p>
              </div>
            }

            <div className="mb-32 flex justify-around text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:text-left">
              <Link
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