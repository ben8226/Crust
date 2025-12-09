"use client";

import { useEffect, useRef } from "react";

interface InstagramEmbedProps {
  url: string;
  width?: number;
  height?: number;
}

export default function InstagramEmbed({ url, width = 400, height = 500 }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Instagram oEmbed API
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    document.body.appendChild(script);

    // Load the embed
    if (containerRef.current) {
      const blockquote = document.createElement("blockquote");
      blockquote.className = "instagram-media";
      blockquote.setAttribute("data-instgrm-permalink", url);
      blockquote.setAttribute("data-instgrm-version", "14");
      blockquote.style.background = "#FFF";
      blockquote.style.border = "0";
      blockquote.style.borderRadius = "3px";
      blockquote.style.margin = "1px";
      blockquote.style.maxWidth = `${width}px`;
      blockquote.style.minWidth = "326px";
      blockquote.style.padding = "0";
      blockquote.style.width = "99.375%";

      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(blockquote);

      // Trigger Instagram embed
      if (window.instgrm) {
        window.instgrm.Embeds.process();
      }
    }

    return () => {
      // Cleanup
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [url, width]);

  return (
    <div className="flex justify-center my-4">
      <div ref={containerRef} className="instagram-embed-container" />
    </div>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}


