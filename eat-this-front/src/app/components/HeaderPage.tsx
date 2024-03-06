'use client'

import React, {useEffect} from "react";
import TextPrompt from "@/app/components/utils/textPrompt/TextPrompt";
import { useTextContext} from "@/app/store/store";
import Link from "next/link";
import {Badge} from "@/app/components/utils/Badge/Badge";


export default function HeaderPage({children}: Readonly<{
    children: React.ReactNode;
}>) {
    const {headerText, isNewItemSaved} = useTextContext();

    useEffect(() => {
        console.log(headerText)
    }, [headerText]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <div className="fixed left-0 top-0 flex flex-row w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                    <Link
                        className={"flex items-center justify-center"}
                        href="/"
                        target="_self"
                        rel="noopener noreferrer"
                    >
                           <div className="hover:cursor-pointer mr-10">
                               <Badge dot={isNewItemSaved}>
                                   <span>🏠</span>
                               </Badge>
                           </div>
                    </Link>
                    <TextPrompt text={headerText}/>
                </div>
                <div className="fixed bottom-0 left-0 flex h-48 w-full items-start justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
                    {/*<a*/}
                    {/*    className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"*/}
                    {/*    href="https://vercel.com?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"*/}
                    {/*    target="_blank"*/}
                    {/*    rel="noopener noreferrer"*/}
                    {/*>*/}
                    {/*    By{" "}*/}
                    {/*    <Image*/}
                    {/*        src="/vercel.svg"*/}
                    {/*        alt="Vercel Logo"*/}
                    {/*        className="dark:invert"*/}
                    {/*        width={100}*/}
                    {/*        height={24}*/}
                    {/*        priority*/}
                    {/*    />*/}
                    {/*</a>*/}
                </div>
            </div>
            {
                <div className="mt-10 h-auto w-full p-15 group rounded-lg border border-transparent px-5 py-4 transition-all duration-300 ease-in-out border-gray-500 bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800/30 ">
                    <br/>
                    {children}
                </div>
            }

            <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
            </div>
        </main>
    );
}
