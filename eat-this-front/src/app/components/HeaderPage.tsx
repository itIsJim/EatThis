'use client'

import React, {useEffect} from "react";
import TextPrompt from "@/app/components/utils/textPrompt/TextPrompt";
import { useTextContext} from "@/app/store/store";
import Link from "next/link";
import {Badge} from "@/app/components/utils/Badge/Badge";
import AuthBar from "@/app/components/AuthBar";


export default function HeaderPage({children}: Readonly<{
    children: React.ReactNode;
}>) {
    const {headerText, isNewItemSaved} = useTextContext();

    useEffect(() => {
        console.log(headerText)
    }, [headerText]);

    return (
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 lg:p-24">
            <div className="z-10 max-w-5xl w-full font-mono text-sm">
                <div className="flex flex-row items-center w-full justify-center gap-2">
                    <Link
                        className={"flex items-center justify-center shrink-0"}
                        href="/"
                        target="_self"
                        rel="noopener noreferrer"
                    >
                           <div className="hover:cursor-pointer p-2 text-xl">
                               <Badge dot={isNewItemSaved}>
                                   <span>🏠</span>
                               </Badge>
                           </div>
                    </Link>
                    <TextPrompt text={headerText}/>
                    <AuthBar/>
                </div>
            </div>
            {
                <div className="mt-4 sm:mt-6 h-auto w-full max-w-5xl rounded-lg border px-3 py-4 sm:px-5 transition-all duration-300 ease-in-out border-gray-500 bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800/30 ">
                    {children}
                </div>
            }
        </main>
    );
}
