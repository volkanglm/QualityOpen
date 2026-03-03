import { motion, AnimatePresence } from "framer-motion";
import { X, FileText } from "lucide-react";
import { useProjectStore } from "@/store/project.store";
import { useT } from "@/hooks/useT";
import type { Code, Segment } from "@/types";

interface SegmentDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    code: Code;
    propertyKey?: string;
    propertyValue?: string;
    filterDocIds?: string[];
}

export function SegmentDrawer({
    isOpen,
    onClose,
    code,
    propertyKey,
    propertyValue,
    filterDocIds
}: SegmentDrawerProps) {
    const t = useT();
    const { documents, segments } = useProjectStore();

    // Filter segments that belong to the code AND the specific property value
    const filteredSegments = segments.filter(seg => {
        const hasCode = seg.codeIds.includes(code.id);
        if (!hasCode) return false;

        if (filterDocIds && filterDocIds.length > 0) {
            if (!filterDocIds.includes(seg.documentId)) return false;
        }

        if (!propertyKey || !propertyValue) return true;

        const doc = documents.find(d => d.id === seg.documentId);
        return doc?.properties?.[propertyKey] === propertyValue;
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-[450px] bg-[var(--bg-primary)] border-l border-[var(--border)] shadow-2xl z-[120] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: code.color }} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                                        {code.name}
                                    </h3>
                                </div>
                                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">
                                    {propertyKey ? `${propertyKey}: ${propertyValue}` : t("synthesis.allDocs")} — {filteredSegments.length} {t("analysis.segments")}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            {filteredSegments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-[var(--text-disabled)] italic text-sm">
                                    {t("retrieval.noSegs")}
                                </div>
                            ) : (
                                filteredSegments.map((seg: Segment) => {
                                    const doc = documents.find(d => d.id === seg.documentId);
                                    return (
                                        <div
                                            key={seg.id}
                                            className="group bg-[var(--bg-secondary)]/30 border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-strong)] transition-all cursor-default"
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <FileText className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                                <span className="text-[11px] font-bold text-[var(--text-secondary)] truncate max-w-[200px]">
                                                    {doc?.name || "Bilinmeyen Belge"}
                                                </span>
                                            </div>

                                            <div className="pl-4 border-l-2 border-[var(--border)]">
                                                <p
                                                    className="text-[13px] leading-relaxed text-[var(--text-primary)] italic"
                                                    style={{ fontFamily: '"Georgia", serif' }}
                                                >
                                                    "{seg.text}"
                                                </p>
                                            </div>

                                            {seg.memo && (
                                                <div className="mt-3 flex items-start gap-2 text-[11px] text-[var(--text-muted)] bg-[var(--surface)]/40 p-2 rounded-lg border border-[var(--border)]/30">
                                                    <span className="text-xs">💬</span>
                                                    <span>{seg.memo}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
