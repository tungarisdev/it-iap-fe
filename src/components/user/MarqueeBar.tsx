import React, { useState } from "react";
import { X } from "lucide-react";

interface MarqueeBarProps {
  text: string;
}

const MarqueeBar: React.FC<MarqueeBarProps> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!text || !text.trim() || !isVisible) return null;

  // Render multiple copies per track so it always covers ultrawide screens (>2560px)
  const repeatCount = 4;
  const items = Array.from({ length: repeatCount });

  return (
    <>
      <style>{`
        @keyframes marqueeLoop {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .marquee-track-smooth {
          display: flex;
          flex-shrink: 0;
          min-width: 100%;
          align-items: center;
          justify-content: space-around;
          animation: marqueeLoop 28s linear infinite;
        }
        .marquee-wrapper:hover .marquee-track-smooth {
          animation-play-state: paused;
        }
      `}</style>
      <div className="relative z-40 flex items-center overflow-hidden border-b border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 py-2 text-xs font-medium text-zinc-800">
        {/* Left Fade Gradient Mask */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-8 sm:w-16 bg-gradient-to-r from-blue-50 to-transparent" />

        {/* Marquee Infinite Track Wrapper */}
        <div className="marquee-wrapper relative flex flex-1 overflow-hidden select-none">
          {/* Primary Track */}
          <div className="marquee-track-smooth">
            {items.map((_, idx) => (
              <div key={idx} className="flex items-center gap-2.5 px-6">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                  {/* <Megaphone className="h-3 w-3 shrink-0" /> */}
                  <span>Welcome</span>
                </span>
                <span className="text-xs font-semibold text-zinc-800 tracking-wide">
                  {text}
                </span>
                <span className="ml-4 text-blue-300 font-bold">•</span>
              </div>
            ))}
          </div>

          {/* Secondary Track (Cloned for seamless infinite loop without stutter) */}
          <div className="marquee-track-smooth" aria-hidden="true">
            {items.map((_, idx) => (
              <div key={`copy-${idx}`} className="flex items-center gap-2.5 px-6">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                  {/* <Megaphone className="h-3 w-3 shrink-0" /> */}
                  <span>Xin chào</span>
                </span>
                <span className="text-xs font-semibold text-zinc-800 tracking-wide">
                  {text}
                </span>
                <span className="ml-4 text-blue-300 font-bold">•</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Fade Gradient Mask */}
        <div className="pointer-events-none absolute right-10 top-0 bottom-0 z-10 w-8 sm:w-16 bg-gradient-to-l from-blue-50 to-transparent" />

        {/* Dismiss Button */}
        <div className="relative z-20 flex items-center px-3 bg-blue-50/90">
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="shrink-0 rounded-full p-1 text-blue-600/70 transition-colors hover:bg-blue-100 hover:text-blue-900"
            title="Ẩn thông báo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default MarqueeBar;
