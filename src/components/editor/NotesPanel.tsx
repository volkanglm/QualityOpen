import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StickyNote, X, ChevronDown } from "lucide-react";
import type { Segment, Code } from "@/types";
import { useT } from "@/hooks/useT";

interface NotesPanelProps {
  open: boolean;
  segments: Segment[];
  codes: Code[];
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
export function NotesPanel({ open, segments, codes, onClose }: NotesPanelProps) {
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
                return (
                  <button
                    key={note.id}
                    // Click expands the note (read full text) AND scrolls the doc to it.
                    onClick={() => {
                      setExpandedId(expanded ? null : note.id);
                      scrollToSegment(note.id);
                    }}
                    className="w-full text-left rounded-md border p-2.5 transition-colors"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border-subtle)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
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

                    {/* Memo body */}
                    <p
                      className={`text-[11px] leading-relaxed ${expanded ? "whitespace-pre-wrap" : "line-clamp-3"}`}
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {note.memo}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
