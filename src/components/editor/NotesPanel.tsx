import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StickyNote, X, ChevronDown, Pencil, Trash2, Check } from "lucide-react";
import type { Segment, Code } from "@/types";
import { useT } from "@/hooks/useT";

interface NotesPanelProps {
  open: boolean;
  segments: Segment[];
  codes: Code[];
  onUpdateMemo?: (segId: string, memo: string) => void;
  onClose: () => void;
}

interface NoteItem {
  id: string;
  memo: string;
  excerpt: string;
  label: string;
  color: string;
}

/**
 * Scrolls the document reader to the segment with the given id and briefly
 * highlights it. Segments expose `data-segment-id` in TextHighlighter /
 * SearchHighlighter; PDF segments may not — in that case we silently do nothing.
 */
function scrollToSegment(id: string) {
  const el = document.querySelector(`[data-segment-id="${id}"]`) as HTMLElement | null;
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const prev = el.style.boxShadow;
  el.style.transition = "box-shadow 0.2s ease";
  el.style.boxShadow = "0 0 0 3px var(--accent)";
  setTimeout(() => {
    el.style.boxShadow = prev;
  }, 1200);
}

/**
 * Toggle-able right-side drawer that lists every note (segment memo) for the
 * active document. Replaces the old always-on MarginMemos overlay. Clicking a
 * note scrolls the document to its source highlight.
 */
export function NotesPanel({ open, segments, codes, onUpdateMemo, onClose }: NotesPanelProps) {
  const t = useT();
  const notes = useMemo<NoteItem[]>(() => {
    return segments
      .filter((s) => s.memo?.trim())
      .map((seg) => {
        const firstCode = codes.find((c) => seg.codeIds.includes(c.id));
        return {
          id: seg.id,
          memo: seg.memo ?? "",
          excerpt: seg.text,
          label: firstCode?.name ?? (seg.isHighlight ? t("notes.labelNote") : t("notes.labelCode")),
          color: seg.isHighlight
            ? (seg.highlightColor ?? "#fcd34d")
            : (firstCode?.color ?? "var(--accent)"),
        };
      });
  }, [segments, codes, t]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftMemo, setDraftMemo] = useState("");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          className="absolute top-0 right-0 bottom-0 w-64 z-20 flex flex-col border-l overflow-hidden"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          {/* Header */}
          <div
            className="sticky top-0 flex items-center gap-2 px-3 py-2.5 border-b flex-shrink-0"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <StickyNote className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} />
            <span
              className="text-[12px] font-semibold tracking-wide flex-1 truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {t("notes.title")} ({notes.length})
            </span>
            <button
              onClick={onClose}
              className="flex-shrink-0 rounded p-1 transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title={t("notes.close")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
            {notes.length === 0 ? (
              <div
                className="h-full flex items-center justify-center text-center text-[11px] px-4"
                style={{ color: "var(--text-muted)" }}
              >
                {t("notes.empty")}
              </div>
            ) : (
              notes.map((note) => {
                const expanded = expandedId === note.id;
                const isEditing = editingId === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      if (isEditing) return;
                      setExpandedId(expanded ? null : note.id);
                      scrollToSegment(note.id);
                    }}
                    className="group w-full text-left rounded-md border p-2.5 transition-colors cursor-pointer"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border-subtle)",
                    }}
                  >
                    {/* Label */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: note.color }}
                      />
                      <span
                        className="text-[10px] font-medium truncate flex-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {note.label}
                      </span>
                      {onUpdateMemo && !isEditing && (
                        <div
                          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setEditingId(note.id);
                              setExpandedId(note.id);
                              setDraftMemo(note.memo);
                            }}
                            className="p-0.5 rounded hover:bg-[var(--surface-hover)]"
                            style={{ color: "var(--text-muted)" }}
                            title={t("segment.editMemo")}
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={() => onUpdateMemo(note.id, "")}
                            className="p-0.5 rounded hover:bg-red-500/10"
                            style={{ color: "var(--text-muted)" }}
                            title={t("segment.deleteMemo")}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                      <ChevronDown
                        className="h-3 w-3 flex-shrink-0 transition-transform"
                        style={{
                          color: "var(--text-muted)",
                          transform: expanded ? "rotate(180deg)" : "none",
                        }}
                      />
                    </div>

                    {/* Source excerpt */}
                    <p
                      className={`text-[11px] italic mb-1 ${expanded ? "" : "line-clamp-1"}`}
                      style={{ color: "var(--text-muted)" }}
                    >
                      “{note.excerpt}”
                    </p>

                    {/* Memo body or inline editor */}
                    {isEditing && onUpdateMemo ? (
                      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          rows={3}
                          autoFocus
                          value={draftMemo}
                          onChange={(e) => setDraftMemo(e.target.value)}
                          className="w-full rounded border px-1.5 py-1 text-[11px] leading-relaxed outline-none resize-none"
                          style={{
                            background: "var(--bg-secondary)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                          }}
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-0.5 rounded text-[10px] hover:bg-[var(--surface-hover)]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {t("common.cancel")}
                          </button>
                          <button
                            onClick={() => {
                              onUpdateMemo(note.id, draftMemo);
                              setEditingId(null);
                            }}
                            className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-semibold"
                            style={{
                              background: "var(--accent)",
                              color: "var(--accent-fg, #09090b)",
                            }}
                          >
                            <Check className="h-2.5 w-2.5" />
                            {t("segment.saveMemo")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={`text-[11px] leading-relaxed ${expanded ? "whitespace-pre-wrap" : "line-clamp-3"}`}
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {note.memo}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
