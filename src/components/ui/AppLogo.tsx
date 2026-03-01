import { useAppStore } from "@/store/app.store";

interface AppLogoProps {
  /**
   * Rendered size in px (width = height, the icon is square).
   * @default 24
   */
  size?: number;
  /**
   * "badge"  — full logo with rounded-rect background (for splash, login, paywall)
   * "mark"   — icon mark only, no background (for TitleBar, inline usage)
   * @default "badge"
   */
  variant?: "badge" | "mark";
  className?: string;
  style?: React.CSSProperties;
}

/**
 * QualityOpen brand logo.
 *
 * Two overlapping circles (qualitative lens metaphor) with a magnifier handle.
 * Renders the light or dark variant based on the active theme.
 */
export function AppLogo({
  size     = 24,
  variant  = "badge",
  className,
  style,
}: AppLogoProps) {
  const { theme } = useAppStore();

  if (variant === "badge") {
    return theme === "dark" ? (
      <DarkBadge size={size} className={className} style={style} />
    ) : (
      <LightBadge size={size} className={className} style={style} />
    );
  }

  // ── Mark-only variant (no background rect) ────────────────────────────────
  const primary   = theme === "dark" ? "#fafafa" : "#27272a";
  const secondary = theme === "dark" ? "#52525b" : "#a1a1aa";
  const sw        = theme === "dark" ? 4  : 4;   // stroke-width primary
  const sw2       = theme === "dark" ? 3  : 4;   // stroke-width secondary

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
    >
      {/* Secondary (background) circle */}
      <circle cx="72" cy="55" r="20" stroke={secondary} strokeWidth={sw2} />
      {/* Primary circle */}
      <circle cx="48" cy="55" r="20" stroke={primary}   strokeWidth={sw} />
      {/* Magnifier handle */}
      <path d="M 56 67 L 68 79" stroke={primary} strokeWidth={sw} strokeLinecap="round" />
      {/* Lens centre dot */}
      <circle cx="60" cy="55" r="6" fill={primary} />
    </svg>
  );
}

// ── Badge variants ─────────────────────────────────────────────────────────────

type SvgProps = Pick<AppLogoProps, "size" | "className" | "style">;

function DarkBadge({ size, className, style }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
    >
      <rect width="120" height="120" rx="28" fill="#18181b" />
      <circle cx="72" cy="55" r="20" stroke="#52525b" strokeWidth="3" />
      <circle cx="48" cy="55" r="20" stroke="#fafafa"  strokeWidth="4" />
      <path d="M 56 67 L 68 79" stroke="#fafafa" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="55" r="6" fill="#fafafa" />
    </svg>
  );
}

function LightBadge({ size, className, style }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="none"
    >
      <rect width="120" height="120" rx="28" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
      <circle cx="72" cy="55" r="20" stroke="#a1a1aa" strokeWidth="4" />
      <circle cx="48" cy="55" r="20" stroke="#27272a" strokeWidth="4" />
      <path d="M 56 67 L 68 79" stroke="#27272a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="55" r="6" fill="#27272a" />
    </svg>
  );
}
