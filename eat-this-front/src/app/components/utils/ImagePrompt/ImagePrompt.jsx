'use client'
import React, {useEffect, useState} from "react";
import Image from "next/image";

const ImagePrompt = ({obj, url}) => {
    return (
        <div>
            <div className="whitespace-pre-line fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                <Image
                    src={url}
                    height={800}
                    width={800}
                    alt={"DALLE generated image"}
                />
            </div>
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
    )
}
export default ImagePrompt;