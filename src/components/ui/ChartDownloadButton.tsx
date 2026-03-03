import { useState } from "react";
import { Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChartDownloadButtonProps {
    /** Label shown in the download button tooltip */
    label?: string;
    /** Called when the user clicks the download button */
    onDownload: () => void;
}

/**
 * A hover-activated download button that sits in the top-right corner of any
 * chart or data table wrapper.
 *
 * Usage:
 * ```tsx
 * <div className="relative group/chart">
 *   <ChartDownloadButton
 *     label="PNG"
 *     onDownload={() => downloadChartAsPng(chartRef)}
 *   />
 *   <MyChart ref={chartRef} />
 * </div>
 * ```
 */
export function ChartDownloadButton({ label = "PNG", onDownload }: ChartDownloadButtonProps) {
    const [clicked, setClicked] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setClicked(true);
        onDownload();
        setTimeout(() => setClicked(false), 1200);
    };

    return (
        <AnimatePresence>
            <motion.button
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                onClick={handleClick}
                className="absolute top-2 right-2 z-20 opacity-0 group-hover/chart:opacity-100 transition-opacity flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm"
                style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                    color: clicked ? "var(--code-2, #10b981)" : "var(--text-secondary)",
                }}
                title={`${label} olarak indir`}
            >
                <Download className="h-3 w-3" />
                {clicked ? "✓" : label}
            </motion.button>
        </AnimatePresence>
    );
}

// ─── Utility: download a DOM element as PNG ───────────────────────────────────

/**
 * Captures a DOM element as a high-resolution PNG and triggers a file download.
 * Requires `html2canvas` to be available. Dynamically imports it to keep the
 * main bundle lean.
 */
export async function downloadElementAsPng(
    element: HTMLElement | null,
    filename = "chart.png",
    scale = 2,
): Promise<void> {
    if (!element) return;
    try {
        const html2canvas = ((await import("html2canvas" as any)) as any).default;
        const canvas = await html2canvas(element, {
            scale,
            useCORS: true,
            backgroundColor: null,
            logging: false,
        });
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (e) {
        console.error("PNG export failed:", e);
    }
}

// ─── Utility: download a data array as CSV ───────────────────────────────────

/**
 * Converts an array of objects to CSV and downloads it as a .csv file.
 */
export function downloadAsCsv(
    rows: Record<string, unknown>[],
    filename = "data.csv",
): void {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const lines = [
        headers.join(","),
        ...rows.map((r) =>
            headers
                .map((h) => {
                    const v = String(r[h] ?? "").replace(/"/g, '""');
                    return `"${v}"`;
                })
                .join(","),
        ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}
