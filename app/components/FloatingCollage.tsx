"use client";

import { useEffect, useRef } from "react";

interface Slot {
  top: string;
  left: string;
  size: number;
  /** height / width — <1 reads as landscape, 1 as square, >1 as portrait. */
  ratio: number;
  depth: number;
  ease: number;
  tier: "edge" | "wide";
}

/**
 * Modelled directly on telescope.fyi's exact layout & animation mechanics.
 */
const SLOTS: Slot[] = [
  // Far left item
  { top: "18%", left: "-1%", size: 140, ratio: 1.5, depth: 1.4, ease: 0.04, tier: "edge" },
  // Top center-left double stacked
  { top: "3%", left: "28%", size: 175, ratio: 0.9, depth: 0.8, ease: 0.03, tier: "wide" },
  { top: "14%", left: "22%", size: 145, ratio: 0.9, depth: 1.1, ease: 0.035, tier: "wide" },
  // Mid left small portrait
  { top: "44%", left: "7%", size: 95, ratio: 1.2, depth: 1.5, ease: 0.045, tier: "edge" },
  // Top center-right drinks
  { top: "8%", left: "61%", size: 145, ratio: 1.0, depth: 1.0, ease: 0.035, tier: "wide" },
  // Top far right small photo
  { top: "4%", left: "89%", size: 110, ratio: 1.1, depth: 1.8, ease: 0.05, tier: "edge" },
  // Right anchor large fashion model
  { top: "25%", left: "78%", size: 220, ratio: 1.3, depth: 0.6, ease: 0.025, tier: "wide" },
  // Bottom left colorful graphic
  { top: "66%", left: "15%", size: 180, ratio: 1.0, depth: 1.1, ease: 0.035, tier: "edge" },
  // Bottom left small cake
  { top: "64%", left: "28%", size: 110, ratio: 1.0, depth: 1.3, ease: 0.04, tier: "wide" },
  // Bottom right red books stack
  { top: "70%", left: "68%", size: 230, ratio: 0.7, depth: 0.9, ease: 0.03, tier: "wide" },
  // Bottom center blue chair peek
  { top: "85%", left: "53%", size: 140, ratio: 0.45, depth: 1.6, ease: 0.05, tier: "edge" },
];

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

export default function FloatingCollage({ images }: { images: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef(SLOTS.map(() => ({ x: 0, y: 0 })));
  const frame = useRef<number | null>(null);

  const items = SLOTS.map((slot, index) => ({
    src: images[index % images.length],
    slot,
  }));

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      target.current = {
        x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
      };
    };

    const MAX_SHIFT = 28; // Higher displacement range for true parallax depth

    const tick = (now: number) => {
      const time = now * 0.0012; // Time factor for sin-wave floating

      itemRefs.current.forEach((el, index) => {
        if (!el) return;
        const { depth, ease } = SLOTS[index];
        const state = current.current[index];

        // 1. Mouse Parallax target calculation
        state.x = lerp(state.x, target.current.x * MAX_SHIFT * depth, ease);
        state.y = lerp(state.y, target.current.y * MAX_SHIFT * depth, ease);

        // 2. Smooth GPU-accelerated idle floating (no CSS margin layout thrashing)
        const idleX = Math.cos(time * 0.7 + index * 1.3) * 5 * depth;
        const idleY = Math.sin(time * 0.9 + index * 1.7) * 7 * depth;

        const posX = state.x + idleX;
        const posY = state.y + idleY;

        el.style.transform = `translate3d(${posX.toFixed(2)}px, ${posY.toFixed(2)}px, 0)`;
      });

      frame.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    frame.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  if (images.length === 0) return null;

  return (
    <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
      {items.map(({ src, slot }, index) => (
        <div
          key={index}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          className={`absolute overflow-hidden rounded-none will-change-transform ${
            slot.tier === "wide" ? "hidden lg:block" : ""
          }`}
          style={{
            top: slot.top,
            left: slot.left,
            width: slot.size,
            height: slot.size * slot.ratio,
          }}
        >
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" draggable={false} />
        </div>
      ))}
    </div>
  );
}
