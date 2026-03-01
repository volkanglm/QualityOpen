import { useResizable } from "@/hooks/useResizable";
import { PANEL_LIMITS } from "@/store/app.store";

interface PanelResizerProps {
  value: number;
  onChange: (px: number) => void;
  max: number;
  direction?: "right" | "left";
}

export function PanelResizer({ value, onChange, max, direction = "right" }: PanelResizerProps) {
  const min = direction === "right" ? PANEL_LIMITS.MIN_LEFT : PANEL_LIMITS.MIN_RIGHT;
  const { onMouseDown } = useResizable({ value, onChange, min, max, direction });

  return (
    <div
      className="resizer"
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
    />
  );
}
