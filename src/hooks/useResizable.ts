import { useCallback, useRef } from "react";

interface UseResizableOptions {
  /** current width in px */
  value: number;
  /** called with new width during drag */
  onChange: (px: number) => void;
  /** minimum allowed width */
  min: number;
  /** maximum allowed width */
  max: number;
  /** which direction grows when moving mouse right */
  direction?: "right" | "left";
}

/**
 * Returns a mousedown handler that starts a drag-resize session.
 * Cleans up all global listeners on mouseup automatically.
 */
export function useResizable({
  value,
  onChange,
  min,
  max,
  direction = "right",
}: UseResizableOptions) {
  const startX   = useRef(0);
  const startVal = useRef(0);
  const resizerEl = useRef<HTMLElement | null>(null);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const delta = e.clientX - startX.current;
      const raw   = direction === "right"
        ? startVal.current + delta
        : startVal.current - delta;
      onChange(Math.min(max, Math.max(min, raw)));
    },
    [onChange, min, max, direction]
  );

  const onMouseUp = useCallback(() => {
    document.body.classList.remove("is-resizing");
    resizerEl.current?.classList.remove("dragging");
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup",   onMouseUp);
  }, [onMouseMove]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();
      startX.current   = e.clientX;
      startVal.current = value;
      resizerEl.current = e.currentTarget;
      document.body.classList.add("is-resizing");
      e.currentTarget.classList.add("dragging");
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup",   onMouseUp);
    },
    [value, onMouseMove, onMouseUp]
  );

  return { onMouseDown };
}
