import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  color?: string;
  className?: string;
  onClick?: () => void;
}

export function Badge({ children, color, className, onClick }: BadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity",
        onClick && "cursor-pointer hover:opacity-75",
        className
      )}
      style={
        color
          ? {
              background:   `${color}1a`,
              color,
              border:       `1px solid ${color}38`,
            }
          : {
              background:   "var(--surface)",
              color:        "var(--text-secondary)",
              border:       "1px solid var(--border)",
            }
      }
    >
      {color && (
        <span
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
      )}
      {children}
    </span>
  );
}
