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
        <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 lg:p-16">
            <div className="z-10 max-w-5xl w-full">
                <div className="flex flex-row items-center w-full justify-center gap-3">
                    <Link
                        className={"flex items-center justify-center shrink-0"}
                        href="/"
                        target="_self"
                        rel="noopener noreferrer"
                        aria-label="Home"
                    >
                           <div className="hover:cursor-pointer">
                               <Badge dot={isNewItemSaved}>
                                   <span className="flex h-10 w-10 items-center justify-center border-2 border-black bg-black text-lg font-bold text-white transition-colors hover:bg-white hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:bg-black dark:hover:text-white">
                                       ET
                                   </span>
                               </Badge>
                           </div>
                    </Link>
                    <TextPrompt text={headerText}/>
                    <AuthBar/>
                </div>
            </div>
            {
                <div className="mt-4 sm:mt-6 h-auto w-full max-w-5xl border-2 border-black bg-white px-3 py-4 sm:px-5 dark:border-white dark:bg-black">
                    {children}
                </div>
            }
        </main>
    );
}
