import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import React from "react";
import { cn } from "@/lib/utils";

const jost = Jost({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "EatThis",
  description: "Snap a photo of your ingredients and get a recipe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", jost.variable)} suppressHydrationWarning>
      <head>
        {/* Apply saved/OS theme before paint to avoid a flash of the wrong mode */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();",
          }}
        />
      </head>
      <body className={jost.className}>{children}</body>
    </html>
  );
}
