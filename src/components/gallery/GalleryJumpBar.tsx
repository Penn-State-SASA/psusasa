"use client";

import { useEffect, useRef, useState } from "react";

export interface JumpTarget {
  id: string;
  heading: string;
  semester: string;
}

interface GalleryJumpBarProps {
  targets: JumpTarget[];
}

export default function GalleryJumpBar({ targets }: GalleryJumpBarProps) {
  const [activeId, setActiveId] = useState<string | null>(
    targets[0]?.id ?? null
  );
  const navRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Highlight the album currently in view.
  useEffect(() => {
    const sections = targets
      .map((t) => document.getElementById(`album-${t.id}`))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.id.replace(/^album-/, "");
          setActiveId(id);
        }
      },
      {
        // Trigger when a section reaches just below the sticky bars.
        rootMargin: "-140px 0px -55% 0px",
        threshold: 0,
      }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [targets]);

  // Keep the active chip scrolled into view within the bar.
  useEffect(() => {
    if (!activeId) return;
    const chip = chipRefs.current[activeId];
    chip?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(`album-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
    // Reflect the anchor in the URL without a jump.
    history.replaceState(null, "", `#album-${id}`);
  };

  if (targets.length < 2) return null;

  return (
    <div
      ref={navRef}
      className="sticky top-[60px] z-40 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 py-3">
          <span className="hidden shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:inline">
            Jump to
          </span>
          <div
            className="flex gap-2 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="navigation"
            aria-label="Jump to event photos"
          >
            {targets.map((t) => {
              const isActive = t.id === activeId;
              return (
                <a
                  key={t.id}
                  href={`#album-${t.id}`}
                  ref={(el) => {
                    chipRefs.current[t.id] = el;
                  }}
                  onClick={(e) => handleClick(e, t.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sasa-red-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t.heading}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
