'use client'
import React, {useEffect, useState} from "react";
import Image from "next/image";

const ImagePrompt = ({obj, url}) => {
    return (
        <div>
            <div className="flex w-full justify-center rounded-xl border border-gray-300 bg-gray-200 p-2 sm:p-4 dark:border-neutral-800 dark:bg-zinc-800/30">
                <Image
                    src={url}
                    height={800}
                    width={800}
                    alt={"DALLE generated image"}
                    className="h-auto w-full max-w-md rounded-lg"
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