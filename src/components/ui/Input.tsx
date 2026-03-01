import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            className="text-[12px] font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-muted)" }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-8 rounded-[var(--radius-sm)] border px-3 text-[13px] outline-none transition-colors",
              icon && "pl-8",
              className
            )}
            style={{
              background:   "var(--bg-tertiary)",
              borderColor:  "var(--border)",
              color:        "var(--text-primary)",
              // inline placeholder handled via CSS below
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLInputElement).style.boxShadow   = "0 0 0 2px var(--accent-subtle)";
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLInputElement).style.boxShadow   = "none";
              props.onBlur?.(e);
            }}
            {...props}
          />
        </div>
      </div>
    );
  }
);
Input.displayName = "Input";
