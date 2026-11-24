import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X, FileText, Globe, Quote, Star } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { flattenCodes } from "@/lib/tree";
import { exportCodebookWord, exportCodebookHtml } from "@/lib/exportCodebook";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/Button";

interface CodebookDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CodebookDrawer({ open, onClose }: CodebookDrawerProps) {
  const t = useT();
  const { activeProjectId } = useAppStore();
  const { projects, codes, segments, updateCode } = useProjectStore();
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const project = projects.find((p) => p.id === activeProjectId);
  const projectCodes = useMemo(
    () => codes.filter((c) => c.projectId === activeProjectId),
    [codes, activeProjectId]
  );
  const projectSegments = useMemo(
    () => segments.filter((s) => s.projectId === activeProjectId),
    [segments, activeProjectId]
  );
  const flatCodes = useMemo(() => flattenCodes(projectCodes, undefined, 0), [projectCodes]);

  const activeCode =
    flatCodes.find((c) => c.id === selectedCodeId) ?? flatCodes[0] ?? null;

  const activeCodeSegments = useMemo(() => {
    if (!activeCode) return [];
    return projectSegments.filter((s) => s.codeIds.includes(activeCode.id));
  }, [activeCode, projectSegments]);

  const handleExportWord = async () => {
    if (!project) return;
    setExporting(true);
    try {
      await exportCodebookWord(project, projectCodes, projectSegments);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex justify-end bg-black/50 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl h-full flex flex-col border-l shadow-2xl overflow-hidden"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-4 w-4" style={{ color: "var(--accent)" }} />
                <div>
                  <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {t("codebook.title")}
                  </h2>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {t("codebook.subtitle")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!project || flatCodes.length === 0 || exporting}
                  onClick={() => void handleExportWord()}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {t("codebook.exportWord")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!project || flatCodes.length === 0}
                  onClick={() => project && exportCodebookHtml(project, projectCodes, projectSegments)}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {t("codebook.exportHtml")}
                </Button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)]"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left code tree list */}
              <div
                className="w-60 border-r overflow-y-auto custom-scrollbar py-2 flex-shrink-0"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
              >
                {flatCodes.length === 0 ? (
                  <p className="text-xs px-4 py-3" style={{ color: "var(--text-muted)" }}>
                    {t("codebook.empty")}
                  </p>
                ) : (
                  flatCodes.map((c) => {
                    const count = projectSegments.filter((s) => s.codeIds.includes(c.id)).length;
                    const isSelected = activeCode?.id === c.id;
                    const filled = Boolean(
                      c.description?.trim() || c.inclusionCriteria?.trim() || c.exclusionCriteria?.trim()
                    );
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCodeId(c.id)}
                        className="w-full flex items-center gap-2 py-2 pr-3 text-left transition-colors"
                        style={{
                          paddingLeft: `${12 + c.depth * 14}px`,
                          background: isSelected ? "var(--accent-subtle)" : "transparent",
                        }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span
                          className="flex-1 text-xs truncate"
                          style={{
                            color: isSelected ? "var(--accent)" : "var(--text-primary)",
                            fontWeight: c.depth === 0 ? 600 : 400,
                          }}
                        >
                          {c.name}
                        </span>
                        {filled && (
                          <span
                            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: "var(--code-2)" }}
                          />
                        )}
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                          {count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Right editor */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                {activeCode ? (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3.5 w-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: activeCode.color }}
                      />
                      <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                        {activeCode.name}
                      </h3>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: "var(--surface)", color: "var(--text-muted)" }}
                      >
                        L{activeCode.depth + 1} · {activeCodeSegments.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        {t("codebook.definition")}
                      </label>
                      <textarea
                        rows={3}
                        value={activeCode.description ?? ""}
                        onChange={(e) => updateCode(activeCode.id, { description: e.target.value })}
                        placeholder={t("codebook.definitionPlaceholder")}
                        className="w-full rounded-lg border px-3 py-2 text-xs leading-relaxed outline-none resize-none"
                        style={{
                          background: "var(--bg-secondary)",
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--code-2)" }}>
                          {t("codebook.inclusion")}
                        </label>
                        <textarea
                          rows={3}
                          value={activeCode.inclusionCriteria ?? ""}
                          onChange={(e) => updateCode(activeCode.id, { inclusionCriteria: e.target.value })}
                          placeholder={t("codebook.inclusionPlaceholder")}
                          className="w-full rounded-lg border px-3 py-2 text-xs leading-relaxed outline-none resize-none"
                          style={{
                            background: "var(--bg-secondary)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#f87171" }}>
                          {t("codebook.exclusion")}
                        </label>
                        <textarea
                          rows={3}
                          value={activeCode.exclusionCriteria ?? ""}
                          onChange={(e) => updateCode(activeCode.id, { exclusionCriteria: e.target.value })}
                          placeholder={t("codebook.exclusionPlaceholder")}
                          className="w-full rounded-lg border px-3 py-2 text-xs leading-relaxed outline-none resize-none"
                          style={{
                            background: "var(--bg-secondary)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                        <Quote className="h-3 w-3" />
                        {t("codebook.exampleQuote")}
                      </label>
                      <textarea
                        rows={2}
                        value={activeCode.exampleQuote ?? ""}
                        onChange={(e) => updateCode(activeCode.id, { exampleQuote: e.target.value })}
                        placeholder={t("codebook.examplePlaceholder")}
                        className="w-full rounded-lg border px-3 py-2 text-xs italic leading-relaxed outline-none resize-none"
                        style={{
                          background: "var(--bg-secondary)",
                          borderColor: "var(--border)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </div>

                    {/* Quick pick from existing coded segments */}
                    {activeCodeSegments.length > 0 && (
                      <div className="space-y-2 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                          {t("codebook.pickQuote")}
                        </p>
                        <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
                          {activeCodeSegments.slice(0, 12).map((seg) => (
                            <button
                              key={seg.id}
                              onClick={() => updateCode(activeCode.id, { exampleQuote: seg.text })}
                              className="w-full text-left p-2 rounded-lg border hover:bg-[var(--surface-hover)] transition-colors flex items-start gap-2"
                              style={{ borderColor: "var(--border-subtle)", background: "var(--surface)" }}
                            >
                              <span className="flex-1 text-[11px] line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                                “{seg.text}”
                              </span>
                              {seg.weight && (
                                <span className="flex items-center gap-0.5 text-[10px] flex-shrink-0 text-amber-400 font-semibold">
                                  <Star className="h-2.5 w-2.5 fill-amber-400" />
                                  {seg.weight}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs" style={{ color: "var(--text-muted)" }}>
                    {t("codebook.empty")}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
