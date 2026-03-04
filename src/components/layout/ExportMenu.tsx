import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  FileImage,
  Table2,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useT } from "@/hooks/useT";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useLicenseStore } from "@/store/license.store";
import { useToastStore } from "@/store/toast.store";
import {
  exportCSV,
  exportExcel,
  exportWordAPA7,
  exportChartImage,
} from "@/lib/exportData";

// ─── Menu items ───────────────────────────────────────────────────────────────

type ExportFormat = "csv" | "excel" | "word" | "png" | "jpeg";

const MENU_ITEMS: {
  id: ExportFormat;
  labelKey: string;
  subKey: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  divider?: boolean;
}[] = [
    {
      id: "excel",
      labelKey: "Excel", // Keep label as is if it's a fixed name, or use a key if preferred
      subKey: "analysis.export.excelDesc",
      icon: FileSpreadsheet,
    },
    {
      id: "csv",
      labelKey: "CSV",
      subKey: "analysis.export.csvDesc",
      icon: Table2,
    },
    {
      id: "word",
      labelKey: "Word (APA 7)",
      subKey: "analysis.export.wordDesc",
      icon: FileText,
      divider: true,
    },
    {
      id: "png",
      labelKey: "PNG",
      subKey: "analysis.export.pngDesc",
      icon: FileImage,
    },
    {
      id: "jpeg",
      labelKey: "JPEG",
      subKey: "analysis.export.jpegDesc",
      icon: FileImage,
    },
  ];

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { activeProjectId, activeView } = useAppStore();
  const { projects, documents, codes, segments, syntheses } = useProjectStore();
  const { push } = useToastStore();
  const t = useT();

  const project = projects.find((p) => p.id === activeProjectId);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleExport = async (format: ExportFormat) => {
    const { isPro, openModal } = useLicenseStore.getState();
    if (!isPro) {
      openModal();
      return;
    }

    if (!project) {
      push(t("analysis.export.selectProject"), "error");
      return;
    }

    setLoading(format);
    setOpen(false);

    const payload = {
      project,
      documents: documents.filter((d) => d.projectId === project.id),
      codes: codes.filter((c) => c.projectId === project.id),
      segments: segments.filter((s) => s.projectId === project.id),
      syntheses: syntheses.filter((s) => s.projectId === project.id),
    };

    try {
      if (format === "csv") {
        exportCSV(payload);
        push(t("analysis.export.success").replace("{name}", project.name).replace("{format}", "CSV"), "success");
      } else if (format === "excel") {
        exportExcel(payload);
        push(t("analysis.export.success").replace("{name}", project.name).replace("{format}", "Excel"), "success");
      } else if (format === "word") {
        await exportWordAPA7(payload);
        push(t("analysis.export.success").replace("{name}", project.name).replace("{format}", "Word (APA 7)"), "success");
      } else if (format === "png" || format === "jpeg") {
        // Find the chart SVG in the DOM (Analysis page must be active)
        if (activeView !== "analysis") {
          push(t("analysis.export.goAnalysis"), "info");
          setLoading(null);
          return;
        }
        const chartEl = document.querySelector<HTMLElement>(".analysis-chart-area svg, .analysis-chart-area");
        if (!chartEl) {
          push(t("analysis.export.noChart"), "error");
          setLoading(null);
          return;
        }
        await exportChartImage(
          chartEl as HTMLElement | SVGSVGElement,
          `${project.name.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9_\- ]/g, "_").trim() || "export"}_grafik.${format}`,
          format,
        );
        push(t("analysis.export.success").replace("{name}", "Grafik").replace("{format}", format.toUpperCase()), "success");
      }
    } catch (err) {
      console.error("Export error:", err);
      push(t("analysis.export.error"), "error");
    } finally {
      setLoading(null);
    }
  };

  const disabled = !activeProjectId;

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      {/* Trigger button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="flex h-6 items-center gap-1.5 px-2.5 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors"
        style={{
          color: disabled ? "var(--text-disabled)" : open ? "var(--accent)" : "var(--text-secondary)",
          background: open ? "var(--accent-subtle)" : "transparent",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!disabled && !open)
            (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)";
        }}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
        title={disabled ? t("analysis.export.selectProject") : t("common.export")}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        <span>{t("common.export")}</span>
        <ChevronDown
          className="h-3 w-3 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 120,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--float-shadow)",
              minWidth: 220,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              className="px-3 py-2 border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("common.export")}
              </p>
              {project && (
                <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-disabled)" }}>
                  {project.name}
                </p>
              )}
            </div>

            {/* Items */}
            <div className="py-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isLoading = loading === item.id;
                return (
                  <div key={item.id}>
                    {item.divider && (
                      <div className="my-1 mx-3 border-t" style={{ borderColor: "var(--border-subtle)" }} />
                    )}
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2 transition-colors text-left"
                      style={{ background: "transparent" }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = "var(--surface-hover)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = "transparent")
                      }
                      onClick={() => handleExport(item.id)}
                      disabled={isLoading}
                    >
                      <div
                        className="h-7 w-7 flex items-center justify-center rounded-[var(--radius-sm)] flex-shrink-0"
                        style={{ background: "var(--surface)" }}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--accent)" }} />
                        ) : (
                          <Icon className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                          {item.labelKey}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--text-disabled)" }}>
                          {t(item.subKey as any)}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
