import React from "react";

export const Badge = ({ children, dot }) => {
    return (
        <div className="relative">
            {children}
            {dot && (
                <span className="absolute top-0 right-0 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 transform bg-black dark:bg-white"></span>
            )}
        </div>
    );
};