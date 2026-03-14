import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, FileText, CheckSquare, Square, Tag } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useProjectStore } from "@/store/project.store";
import { useAppStore } from "@/store/app.store";
import { useT } from "@/hooks/useT";
import type { Segment } from "@/types";

interface SegmentSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SegmentSearchPanel({ isOpen, onClose }: SegmentSearchPanelProps) {
  const t = useT();
  const { activeProjectId } = useAppStore();
  const { documents, codes, segments } = useProjectStore();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCodePicker, setShowCodePicker] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelected(new Set());
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const projectCodes = useMemo(
    () => codes.filter((c) => c.projectId === activeProjectId),
    [codes, activeProjectId]
  );

  const filteredSegments = useMemo(() => {
    const projectSegs = segments.filter((s) => s.projectId === activeProjectId);
    if (!query.trim()) return projectSegs;
    const q = query.toLowerCase();
    return projectSegs.filter((s) => s.text.toLowerCase().includes(q));
  }, [segments, activeProjectId, query]);

  const virtualizer = useVirtualizer({
    count: filteredSegments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(filteredSegments.map((s) => s.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const applyBulkAssign = (codeId: string) => {
    if (!codeId || selected.size === 0) return;
    useProjectStore.setState((state) => ({
      segments: state.segments.map((s) =>
        selected.has(s.id) && !s.codeIds.includes(codeId)
          ? { ...s, codeIds: [...s.codeIds, codeId] }
          : s
      ),
    }));
    setSelected(new Set());
    setShowCodePicker(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[480px] bg-[var(--bg-primary)] border-l border-[var(--border)] shadow-2xl z-[120] flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[var(--text-muted)]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  {t("segment.search.title")}
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label={t("common.close")}
                className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search input */}
            <div className="flex-shrink-0 px-6 py-3 border-b border-[var(--border)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("segment.search.placeholder")}
                  className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border outline-none"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                {filteredSegments.length} {t("analysis.segments")}
                {selected.size > 0 && ` · ${selected.size} ${t("segment.clearSelection").toLowerCase().replace("clear ", "")}`}
              </p>
            </div>

            {/* Bulk actions bar */}
            {filteredSegments.length > 0 && (
              <div className="flex-shrink-0 px-6 py-2 border-b border-[var(--border)] flex items-center gap-2 flex-wrap">
                <button
                  onClick={selected.size === filteredSegments.length ? clearSelection : selectAll}
                  className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  {selected.size === filteredSegments.length
                    ? <CheckSquare className="h-3.5 w-3.5" />
                    : <Square className="h-3.5 w-3.5" />}
                  {selected.size === filteredSegments.length ? t("segment.clearSelection") : t("segment.selectAll")}
                </button>

                {selected.size > 0 && (
                  <div className="relative ml-auto">
                    <button
                      onClick={() => setShowCodePicker((v) => !v)}
                      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md font-medium transition-colors"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {t("segment.bulkAssign")}
                    </button>
                    {showCodePicker && (
                      <div
                        className="absolute right-0 top-full mt-1 w-52 rounded-xl border shadow-lg overflow-hidden z-10"
                        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                      >
                        <div className="max-h-48 overflow-y-auto py-1">
                          {projectCodes.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => applyBulkAssign(c.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-[12px] hover:bg-[var(--surface-hover)] transition-colors text-left"
                              style={{ color: "var(--text-primary)" }}
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar px-6">
              {filteredSegments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-[var(--text-disabled)] italic text-sm">
                  {query ? t("segment.search.noResults") : t("retrieval.noSegs")}
                </div>
              ) : (
                <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const seg = filteredSegments[virtualItem.index] as Segment;
                    const doc = documents.find((d) => d.id === seg.documentId);
                    const isSelected = selected.has(seg.id);
                    const segCodes = seg.codeIds
                      .map((id) => codes.find((c) => c.id === id))
                      .filter(Boolean);

                    return (
                      <div
                        key={seg.id}
                        data-index={virtualItem.index}
                        ref={virtualizer.measureElement}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualItem.start}px)`,
                          paddingTop: virtualItem.index === 0 ? 20 : 10,
                          paddingBottom: virtualItem.index === filteredSegments.length - 1 ? 20 : 0,
                        }}
                      >
                        <div
                          onClick={() => toggleSelect(seg.id)}
                          className="group border rounded-xl p-4 cursor-pointer transition-all"
                          style={{
                            background: isSelected ? "var(--accent-subtle)" : "var(--bg-secondary)/30",
                            borderColor: isSelected ? "var(--accent)" : "var(--border)",
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex-shrink-0">
                              {isSelected
                                ? <CheckSquare className="h-4 w-4" style={{ color: "var(--accent)" }} />
                                : <Square className="h-4 w-4 text-[var(--text-muted)]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-2">
                                <FileText className="h-3 w-3 text-[var(--text-muted)]" />
                                <span className="text-[10px] font-bold text-[var(--text-secondary)] truncate">
                                  {doc?.name || t("retrieval.unknown")}
                                </span>
                              </div>
                              <div className="pl-3 border-l-2 border-[var(--border)]">
                                <p
                                  className="text-[12px] leading-relaxed text-[var(--text-primary)] italic"
                                  style={{ fontFamily: '"Georgia", serif' }}
                                >
                                  &quot;{seg.text}&quot;
                                </p>
                              </div>
                              {segCodes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {segCodes.map((c) => c && (
                                    <span
                                      key={c.id}
                                      className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                      style={{ background: `${c.color}22`, color: c.color }}
                                    >
                                      {c.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
