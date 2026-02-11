"use client";

import { useEffect, useRef } from "react";

const CURSOR_RADIUS = 5;

export function OrangeCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursorElement = dotRef.current;
    if (!cursorElement) {
      return;
    }

    const desktopPointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!desktopPointerQuery.matches) {
      return;
    }

    const updatePosition = (x: number, y: number) => {
      cursorElement.style.transform = `translate3d(${x - CURSOR_RADIUS}px, ${y - CURSOR_RADIUS}px, 0)`;
    };

    const handleMouseMove = (event: MouseEvent) => {
      cursorElement.style.opacity = "1";
      updatePosition(event.clientX, event.clientY);
    };

    const handleMouseLeave = () => {
      cursorElement.style.opacity = "0";
    };

    const handleMouseEnter = (event: MouseEvent) => {
      cursorElement.style.opacity = "1";
      updatePosition(event.clientX, event.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, []);

  return <div ref={dotRef} aria-hidden className="lev-orange-cursor" />;
}
