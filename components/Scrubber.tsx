"use client";

import { useState } from "react";
import { formatTime } from "@/lib/youtube";

/** A position bar you can tap, drag by its thumb, or move with the arrow keys. The video jumps when you let go. */
export function Scrubber({
  length,
  elapsed,
  enabled = true,
  onCommit,
  onPreview,
  label = "Position in this clip",
  variant = "full",
}: {
  length: number;
  elapsed: number;
  enabled?: boolean;
  /** seconds from the start of the clip */
  onCommit: (t: number) => void;
  /** the second under the finger while dragging, or null when let go */
  onPreview?: (t: number | null) => void;
  label?: string;
  variant?: "full" | "thin";
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? elapsed;
  const pct = `${(Math.min(Math.max(shown, 0), length) / length) * 100}%`;
  const at = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * length;
  };
  const move = (t: number | null) => {
    setDrag(t);
    onPreview?.(t);
  };
  const thin = variant === "thin";
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={length}
      aria-valuenow={Math.round(shown)}
      aria-valuetext={`${formatTime(shown)} of ${formatTime(length)}`}
      onPointerDown={(e) => {
        if (!enabled || (e.pointerType === "mouse" && e.button !== 0)) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(at(e));
      }}
      onPointerMove={(e) => drag !== null && move(at(e))}
      onPointerUp={(e) => {
        if (drag === null) return;
        onCommit(at(e));
        move(null);
      }}
      onPointerCancel={() => move(null)}
      onKeyDown={(e) => {
        const step = e.key === "ArrowRight" ? 5 : e.key === "ArrowLeft" ? -5 : 0;
        if (!enabled || !step) return;
        e.preventDefault();
        onCommit(Math.min(Math.max(elapsed + step, 0), length));
      }}
      className={
        thin
          ? "group absolute inset-x-0 top-0 h-5 cursor-pointer touch-none select-none"
          : "group relative h-9 min-w-[160px] flex-1 cursor-pointer touch-none select-none"
      }
    >
      <div className={thin ? "absolute inset-x-0 top-0 h-[3px] bg-gold/20" : "absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-gold/20"} />
      <div
        className={
          thin
            ? "absolute left-0 top-0 h-[3px] bg-marigold"
            : "absolute left-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,var(--color-marigold-deep),var(--color-marigold))]"
        }
        style={{ width: pct }}
      />
      <div
        className={`absolute -translate-x-1/2 rounded-full bg-marigold shadow-[0_1px_4px_rgb(0_0_0/0.5)] transition-transform ${
          thin ? `top-[1.5px] size-3 -translate-y-1/2 ${drag !== null ? "scale-150" : "scale-0 group-hover:scale-100"}` : `top-1/2 size-4 -translate-y-1/2 group-hover:scale-125 ${drag !== null ? "scale-150" : ""}`
        }`}
        style={{ left: pct }}
      />
    </div>
  );
}
