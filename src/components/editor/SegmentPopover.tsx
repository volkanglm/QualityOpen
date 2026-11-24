import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Trash2, StickyNote, Check, Star } from "lucide-react";
import type { Code, Segment } from "@/types";
import { useT } from "@/hooks/useT";

interface SegmentPopoverProps {
  segment: Segment;
  codes: Code[];
  x: number;
  y: number;
  autoFocusMemo?: boolean;
  onRemoveCode: (segId: string, codeId: string) => void;
  onAddCode: (segId: string, codeId: string) => void;
  onSaveMemo: (segId: string, memo: string) => void;
  onSetWeight: (segId: string, weight: number | undefined) => void;
  onDeleteSegment: (segId: string) => void;
  onClose: () => void;
}

const POPOVER_W = 310;

export function SegmentPopover({
  segment,
  codes,
  x,
  y,
  autoFocusMemo = false,
  onRemoveCode,
  onAddCode,
  onSaveMemo,
  onSetWeight,
  onDeleteSegment,
  onClose,
}: SegmentPopoverProps) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [memoText, setMemoText] = useState(segment.memo ?? "");
  const [showAddCode, setShowAddCode] = useState(false);
  const [codeQuery, setCodeQuery] = useState("");
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    setMemoText(segment.memo ?? "");
  }, [segment.id, segment.memo]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", onMouseDown);
      window.addEventListener("keydown", onKeyDown);
    }, 60);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const assignedCodes = codes.filter((c) => segment.codeIds.includes(c.id));
  const availableCodes = codes.filter(
    (c) =>
      !segment.codeIds.includes(c.id) &&
      (!codeQuery.trim() || c.name.toLowerCase().includes(codeQuery.toLowerCase()))
  );

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.max(12, Math.min(x - POPOVER_W / 2, vw - POPOVER_W - 12));
  const top = Math.max(12, Math.min(y + 10, vh - 340));

  const handleSaveMemo = () => {
    onSaveMemo(segment.id, memoText);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1200);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.96 }}
      transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
      style={{
        position: "fixed",
        top,
        left,
        width: POPOVER_W,
        zIndex: 350,
        background: "var(--bg-secondary)",
        borderColor: "var(--border)",
        boxShadow: "var(--float-shadow)",
      }}
      className="rounded-xl border p-3 flex flex-col gap-2.5"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header + excerpt */}
      <div className="flex items-start gap-2">
        <p
          className="flex-1 text-[11px] italic line-clamp-2 leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          “{segment.text}”
        </p>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-[var(--surface-hover)] flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
          aria-label={t("common.close")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Assigned codes with individual remove buttons */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            {t("segment.assignedCodes")}
          </span>
          <button
            onClick={() => setShowAddCode((v) => !v)}
            className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded hover:bg-[var(--surface-hover)] transition-colors"
            style={{ color: "var(--accent)" }}
          >
            <Plus className="h-2.5 w-2.5" />
            {t("segment.addCode")}
          </button>
        </div>

        {assignedCodes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {assignedCodes.map((code) => (
              <span
                key={code.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border"
                style={{
                  background: `${code.color}18`,
                  borderColor: `${code.color}50`,
                  color: "var(--text-primary)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: code.color }}
                />
                <span className="max-w-[140px] truncate">{code.name}</span>
                <button
                  onClick={() => onRemoveCode(segment.id, code.id)}
                  title={t("segment.removeCode")}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-black/20 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: "var(--text-disabled)" }}>
            {t("segment.noCodes")}
          </p>
        )}

        {showAddCode && (
          <div
            className="mt-1 rounded-lg border p-1.5 flex flex-col gap-1"
            style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
          >
            <input
              type="text"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              placeholder={t("canvas.search")}
              className="w-full bg-transparent text-[11px] px-1.5 py-1 outline-none border-b"
              style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}
              autoFocus
            />
            <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-0.5">
              {availableCodes.length === 0 ? (
                <p className="text-[10px] px-1.5 py-1" style={{ color: "var(--text-muted)" }}>
                  {t("segment.noAvailableCodes")}
                </p>
              ) : (
                availableCodes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onAddCode(segment.id, c.id);
                      setShowAddCode(false);
                      setCodeQuery("");
                    }}
                    className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-left text-[11px] hover:bg-[var(--surface-hover)] transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Weight score (1-5) */}
      <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--border-subtle)" }}>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          {t("segment.weight")}
        </span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((score) => {
            const active = (segment.weight ?? 0) >= score;
            return (
              <button
                key={score}
                type="button"
                onClick={() => onSetWeight(segment.id, segment.weight === score ? undefined : score)}
                title={`${score}/5`}
                className="p-0.5 rounded hover:bg-[var(--surface-hover)] transition-colors"
              >
                <Star
                  className="h-3.5 w-3.5"
                  style={{
                    color: active ? "#fbbf24" : "var(--text-disabled)",
                    fill: active ? "#fbbf24" : "transparent",
                  }}
                />
              </button>
            );
          })}
          {segment.weight && (
            <span className="ml-1 text-[10px] font-mono" style={{ color: "#fbbf24" }}>
              {segment.weight}/5
            </span>
          )}
        </div>
      </div>

      {/* Segment memo */}
      <div className="flex flex-col gap-1 border-t pt-2" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center justify-between">
          <span
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            <StickyNote className="h-3 w-3" />
            {t("segment.memoLabel")}
          </span>
          {savedFeedback && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--code-2)" }}>
              <Check className="h-2.5 w-2.5" />
              {t("segment.memoSaved")}
            </span>
          )}
        </div>
        <textarea
          rows={3}
          autoFocus={autoFocusMemo}
          value={memoText}
          onChange={(e) => setMemoText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleSaveMemo();
            }
          }}
          placeholder={t("segment.memoPlaceholder")}
          className="w-full rounded-lg border px-2 py-1.5 text-[11px] leading-relaxed outline-none resize-none"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-0.5">
        <button
          onClick={() => {
            onDeleteSegment(segment.id);
            onClose();
          }}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md hover:bg-red-500/10 transition-colors"
          style={{ color: "var(--danger, #f87171)" }}
        >
          <Trash2 className="h-3 w-3" />
          {t("segment.deleteCoding")}
        </button>

        <button
          onClick={handleSaveMemo}
          className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors"
          style={{
            background: "var(--accent)",
            color: "var(--accent-fg, #09090b)",
          }}
        >
          {t("segment.saveMemo")}
        </button>
      </div>
    </motion.div>
  );
}
