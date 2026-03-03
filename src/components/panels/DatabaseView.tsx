import { useMemo } from "react";
import { Download, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app.store";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToastStore } from "@/store/toast.store";
import { useProjectStore } from "@/store/project.store"; // Assuming this import is missing and needed for useProjectStore

export function DatabaseView() {
    const { documents } = useProjectStore();
    const { activeProjectId, setActiveDocument } = useAppStore();
    const { push: addToast } = useToastStore();

    const projectDocs = useMemo(
        () => documents.filter((d) => d.projectId === activeProjectId),
        [documents, activeProjectId]
    );

    // Extract all unique property keys
    const allPropertyKeys = useMemo(() => {
        const keys = new Set<string>();
        projectDocs.forEach((doc) => {
            if (doc.properties) {
                Object.keys(doc.properties).forEach((k) => keys.add(k));
            }
        });
        return Array.from(keys).sort(); // Alphabetical sort
    }, [projectDocs]);

    const handleDownloadCSV = () => {
        if (projectDocs.length === 0) return;

        // Build headers
        const headers = ["ID", "Belge Adı", "Format", "Tür", "Kelime Sayısı", "Oluşturulma Tarihi", ...allPropertyKeys];

        // Build rows
        const rows = projectDocs.map((doc) => {
            const row = [
                doc.id,
                doc.name.replace(/"/g, '""'), // escape quotes
                doc.format || "text",
                doc.type || "document",
                doc.wordCount?.toString() || "0",
                new Date(doc.createdAt).toLocaleDateString(),
            ];

            allPropertyKeys.forEach((key) => {
                const val = doc.properties?.[key] || "";
                row.push(val.replace(/"/g, '""'));
            });

            return row.map((cell) => `"${cell}"`).join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `QualityOpen_Database_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        addToast("Veritabanı İndirildi", "success");
    };

    if (projectDocs.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 bg-[var(--bg-primary)]">
                <FileText className="h-12 w-12 mb-4" style={{ color: "var(--border)" }} />
                <h2 className="text-lg font-medium mb-1" style={{ color: "var(--text-primary)" }}>Veritabanı Boş</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Tabloyu görmek için yeni bir belge ekleyin.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
                <div>
                    <h2 className="text-sm font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
                        Belge Veritabanı
                    </h2>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Toplam {projectDocs.length} belge, {allPropertyKeys.length} özel özellik
                    </p>
                </div>

                <Tooltip content="CSV olarak indir" side="bottom">
                    <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="gap-2">
                        <Download className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-medium">İndir</span>
                    </Button>
                </Tooltip>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto p-4">
                <div className="min-w-max rounded-[var(--radius-lg)] border bg-transparent overflow-hidden shadow-sm" style={{ borderColor: "var(--border-subtle)" }}>
                    <table className="w-full border-collapse text-[12px] text-left">
                        <thead>
                            <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border-subtle)" }}>
                                <th className="px-4 py-3 font-semibold w-12 text-center" style={{ color: "var(--text-secondary)" }}>#</th>
                                <th className="px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Belge Adı</th>
                                <th className="px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Tür</th>
                                <th className="px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Kelime</th>
                                {allPropertyKeys.map((key) => (
                                    <th key={key} className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: "var(--text-secondary)", borderLeft: "1px solid var(--border-subtle)" }}>
                                        {key}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {projectDocs.map((doc, idx) => (
                                <motion.tr
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                    className="group cursor-pointer transition-colors"
                                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                                    onClick={() => setActiveDocument(doc.id)}
                                    whileHover={{ backgroundColor: "var(--surface-hover)" }}
                                >
                                    <td className="px-4 py-2.5 text-center" style={{ color: "var(--text-disabled)" }}>
                                        {idx + 1}
                                    </td>
                                    <td className="px-4 py-2.5 font-medium whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                                        {doc.name}
                                    </td>
                                    <td className="px-4 py-2.5 capitalize" style={{ color: "var(--text-muted)" }}>
                                        {doc.type}
                                    </td>
                                    <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>
                                        {doc.wordCount?.toLocaleString() || "0"}
                                    </td>

                                    {/* Dynamic Properties */}
                                    {allPropertyKeys.map((key) => {
                                        const val = doc.properties?.[key];
                                        return (
                                            <td
                                                key={key}
                                                className="px-4 py-2.5 truncate max-w-[200px]"
                                                style={{ borderLeft: "1px solid var(--border-subtle)" }}
                                            >
                                                {val ? (
                                                    <span className="inline-block px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 text-[11px]">
                                                        {val}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "var(--text-disabled)" }}>—</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
