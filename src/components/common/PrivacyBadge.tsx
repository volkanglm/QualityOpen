import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Providers that run fully on the user's machine. */
const LOCAL_PROVIDERS = new Set(["ollama", "local", "llamacpp", "lmstudio"]);

interface PrivacyBadgeProps {
  /** The active AI provider id (e.g. "ollama", "openai"). */
  provider?: string;
  /** Force the badge on/off. Takes precedence over `provider` detection. */
  isLocal?: boolean;
  /** Extra classes merged onto the badge. */
  className?: string;
  /** `compact` shows a short label; `full` shows the reassuring long form. */
  variant?: "full" | "compact";
  /**
   * Optional pre-translated label override. When provided it replaces the
   * built-in default text (use this to pass a `t("ai.privacy.*")` string once
   * the i18n keys are added — see component header note).
   */
  label?: string;
}

/**
 * Small badge shown when an AI request runs fully on-device.
 *
 * Renders nothing unless the request is local, so callers can always drop it
 * in unconditionally:
 *   <PrivacyBadge isLocal={provider.isLocal} variant="compact" />
 *
 * i18n: this component ships English/Turkish-neutral English defaults. To
 * localize, add these keys to src/locales/{tr,en}.ts and pass the translated
 * value via the `label` prop:
 *   ai.privacy.compact  →  EN "100% on-device"            TR "%100 cihazınızda"
 *   ai.privacy.full      →  EN "Running 100% on-device — data never leaves your computer"
 *                            TR "%100 cihazınızda çalışıyor — veriler bilgisayarınızdan çıkmaz"
 */
export function PrivacyBadge({
  provider,
  isLocal,
  className,
  variant = "compact",
  label,
}: PrivacyBadgeProps) {
  const local =
    isLocal ?? (provider ? LOCAL_PROVIDERS.has(provider.toLowerCase()) : false);

  if (!local) return null;

  const defaultLabel =
    variant === "full"
      ? "Running 100% on-device — data never leaves your computer"
      : "100% on-device";

  const text = label ?? defaultLabel;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/60",
        "dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50",
        className
      )}
      title={text}
    >
      <ShieldCheck className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
      {text}
    </span>
  );
}
