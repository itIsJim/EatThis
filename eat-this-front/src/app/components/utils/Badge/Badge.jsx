import React from "react";

export const Badge = ({ children, dot }) => {
    return (
        <div className="relative">
            {children}
            {dot && (
                <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full"></span>
            )}
        </div>
    );
};