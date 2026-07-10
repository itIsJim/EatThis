'use client'
import React, {useEffect, useState} from "react";
import Image from "next/image";

const ImagePrompt = ({obj, url}) => {
    return (
        <div>
            <div className="flex w-full justify-center border-2 border-black bg-white p-2 sm:p-3 dark:border-white dark:bg-black">
                <Image
                    src={url}
                    height={800}
                    width={800}
                    alt={"Generated dish"}
                    className="h-auto w-full max-w-md"
                    unoptimized={url?.startsWith('data:')}
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