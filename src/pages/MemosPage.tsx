import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Trash2, Tag, Quote, X } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { useT } from "@/hooks/useT";

type MemoFilter = "all" | "codes" | "segments" | "general";

export function MemosPage() {
  const t = useT();
  const { activeProjectId } = useAppStore();
  const { memos, codes, segments, createMemo, updateMemo, deleteMemo } = useProjectStore();

  const [activeMemoId, setActiveMemoId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MemoFilter>("all");
  const [newMemoModal, setNewMemoModal] = useState(false);
  const [newMemoTitle, setNewMemoTitle] = useState("");
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [showSegPicker, setShowSegPicker] = useState(false);

  const projectCodes = useMemo(
    () => codes.filter((c) => c.projectId === activeProjectId),
    [codes, activeProjectId]
  );
  const projectSegments = useMemo(
    () => segments.filter((s) => s.projectId === activeProjectId && s.text.trim().length > 0),
    [segments, activeProjectId]
  );

  const projectMemos = useMemo(() => {
    return memos
      .filter((m) => m.projectId === activeProjectId)
      .filter((m) => {
        const hasCodes = Boolean(m.linkedCodes?.length);
        const hasSegs = Boolean(m.linkedSegments?.length);
        if (filter === "codes") return hasCodes;
        if (filter === "segments") return hasSegs;
        if (filter === "general") return !hasCodes && !hasSegs;
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [memos, activeProjectId, filter]);

  const activeMemo = memos.find((m) => m.id === activeMemoId && m.projectId === activeProjectId);

  const handleCreate = () => {
    if (!activeProjectId || !newMemoTitle.trim()) return;
    const memo = createMemo(activeProjectId, newMemoTitle.trim());
    setActiveMemoId(memo.id);
    setNewMemoTitle("");
    setNewMemoModal(false);
  };

  const toggleLinkedCode = (codeId: string) => {
    if (!activeMemo) return;
    const current = activeMemo.linkedCodes ?? [];
    const next = current.includes(codeId)
      ? current.filter((id) => id !== codeId)
      : [...current, codeId];
    updateMemo(activeMemo.id, { linkedCodes: next });
  };

  const toggleLinkedSegment = (segId: string) => {
    if (!activeMemo) return;
    const current = activeMemo.linkedSegments ?? [];
    const next = current.includes(segId)
      ? current.filter((id) => id !== segId)
      : [...current, segId];
    updateMemo(activeMemo.id, { linkedSegments: next });
  };

  if (!activeProjectId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-text-muted)]">{t("memos.selectProject")}</p>
      </div>
    );
  }

  const filterTabs: { id: MemoFilter; label: string }[] = [
    { id: "all", label: t("memos.filterAll") },
    { id: "codes", label: t("memos.filterCodes") },
    { id: "segments", label: t("memos.filterSegments") },
    { id: "general", label: t("memos.filterGeneral") },
  ];

  const linkedCodesList = activeMemo
    ? projectCodes.filter((c) => activeMemo.linkedCodes?.includes(c.id))
    : [];
  const unlinkedCodesList = activeMemo
    ? projectCodes.filter((c) => !activeMemo.linkedCodes?.includes(c.id))
    : [];
  const linkedSegmentsList = activeMemo
    ? projectSegments.filter((s) => activeMemo.linkedSegments?.includes(s.id))
    : [];
  const unlinkedSegmentsList = activeMemo
    ? projectSegments.filter((s) => !activeMemo.linkedSegments?.includes(s.id))
    : [];

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Memo list */}
      <div className="w-64 flex flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            {t("nav.memos")}
          </span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setNewMemoModal(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-[var(--color-border-subtle)]">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors"
              style={{
                background: filter === tab.id ? "var(--accent-subtle)" : "transparent",
                color: filter === tab.id ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {projectMemos.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] px-4 py-2">{t("memos.empty")}</p>
          ) : (
            projectMemos.map((memo) => {
              const memoCodes = projectCodes.filter((c) => memo.linkedCodes?.includes(c.id));
              const segCount = memo.linkedSegments?.length ?? 0;
              return (
                <motion.button
                  key={memo.id}
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  onClick={() => {
                    setActiveMemoId(memo.id);
                    setShowCodePicker(false);
                    setShowSegPicker(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 transition-colors ${activeMemoId === memo.id
                    ? "bg-[var(--color-accent-subtle)]"
                    : "hover:bg-[var(--color-surface-hover)]"
                    }`}
                >
                  <p
                    className={`text-xs font-medium truncate ${activeMemoId === memo.id
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-primary)]"
                      }`}
                  >
                    {memo.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {formatDate(memo.updatedAt)}
                    </span>
                    {memoCodes.slice(0, 3).map((c) => (
                      <span
                        key={c.id}
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                    {segCount > 0 && (
                      <span
                        className="text-[9px] px-1 rounded"
                        style={{ background: "var(--surface)", color: "var(--text-muted)" }}
                      >
                        {segCount} ¶
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Memo editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeMemo ? (
          <>
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-6 py-3">
              <input
                className="text-sm font-semibold text-[var(--color-text-primary)] bg-transparent outline-none flex-1"
                value={activeMemo.title}
                onChange={(e) => updateMemo(activeMemo.id, { title: e.target.value })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[var(--color-text-muted)] hover:text-[#fca5a5]"
                onClick={() => {
                  deleteMemo(activeMemo.id);
                  setActiveMemoId(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Linked codes/themes & narratives bar */}
            <div
              className="px-6 py-2.5 border-b flex flex-col gap-2 text-xs"
              style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}
            >
              {/* Linked codes */}
              <div className="flex items-center flex-wrap gap-1.5 relative">
                <span
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider mr-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Tag className="h-3 w-3" />
                  {t("memos.linkedCodes")}
                </span>
                {linkedCodesList.map((code) => (
                  <span
                    key={code.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border"
                    style={{
                      background: `${code.color}18`,
                      borderColor: `${code.color}50`,
                      color: "var(--text-primary)",
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: code.color }}
                    />
                    {code.name}
                    <button
                      onClick={() => toggleLinkedCode(code.id)}
                      className="ml-0.5 opacity-60 hover:opacity-100"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => {
                    setShowCodePicker((v) => !v);
                    setShowSegPicker(false);
                  }}
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full border hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  <Plus className="h-2.5 w-2.5" />
                  {t("memos.linkCode")}
                </button>

                {showCodePicker && (
                  <div
                    className="absolute left-0 top-full mt-1 z-30 w-60 max-h-48 overflow-y-auto custom-scrollbar rounded-lg border p-1.5 shadow-xl space-y-0.5"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                  >
                    {unlinkedCodesList.length === 0 ? (
                      <p className="text-[11px] px-2 py-1" style={{ color: "var(--text-muted)" }}>
                        {t("segment.noAvailableCodes")}
                      </p>
                    ) : (
                      unlinkedCodesList.map((code) => (
                        <button
                          key={code.id}
                          onClick={() => {
                            toggleLinkedCode(code.id);
                            setShowCodePicker(false);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1 rounded text-left text-[11px] hover:bg-[var(--surface-hover)]"
                          style={{ color: "var(--text-primary)" }}
                        >
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: code.color }}
                          />
                          <span className="truncate">{code.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Linked segments / narratives */}
              <div className="flex items-center flex-wrap gap-1.5 relative">
                <span
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider mr-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Quote className="h-3 w-3" />
                  {t("memos.linkedSegments")}
                </span>
                {linkedSegmentsList.map((seg) => (
                  <span
                    key={seg.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border max-w-[240px]"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span className="truncate">“{seg.text}”</span>
                    <button
                      onClick={() => toggleLinkedSegment(seg.id)}
                      className="ml-0.5 opacity-60 hover:opacity-100 flex-shrink-0"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => {
                    setShowSegPicker((v) => !v);
                    setShowCodePicker(false);
                  }}
                  className="inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full border hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  <Plus className="h-2.5 w-2.5" />
                  {t("memos.linkSegment")}
                </button>

                {showSegPicker && (
                  <div
                    className="absolute left-0 top-full mt-1 z-30 w-80 max-h-56 overflow-y-auto custom-scrollbar rounded-lg border p-1.5 shadow-xl space-y-0.5"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                  >
                    {unlinkedSegmentsList.length === 0 ? (
                      <p className="text-[11px] px-2 py-1" style={{ color: "var(--text-muted)" }}>
                        {t("memos.noSegments")}
                      </p>
                    ) : (
                      unlinkedSegmentsList.slice(0, 40).map((seg) => (
                        <button
                          key={seg.id}
                          onClick={() => {
                            toggleLinkedSegment(seg.id);
                            setShowSegPicker(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded text-[11px] hover:bg-[var(--surface-hover)] line-clamp-2"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          “{seg.text}”
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <textarea
              className="flex-1 resize-none bg-transparent px-8 py-6 text-sm leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
              value={activeMemo.content}
              onChange={(e) => updateMemo(activeMemo.id, { content: e.target.value })}
              placeholder={t("memos.placeholder")}
              style={{ userSelect: "text" }}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center flex-col gap-3">
            <BookOpen className="h-8 w-8 text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              {projectMemos.length === 0 ? t("memos.emptyHint") : t("memos.selectMemo")}
            </p>
            <Button variant="outline" size="sm" onClick={() => setNewMemoModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              {t("memos.new")}
            </Button>
          </div>
        )}
      </div>

      <Modal open={newMemoModal} onClose={() => setNewMemoModal(false)} title={t("memos.new")}>
        <div className="space-y-4">
          <Input
            label={t("memos.titleLabel")}
            placeholder={t("memos.titlePlaceholder")}
            value={newMemoTitle}
            onChange={(e) => setNewMemoTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNewMemoModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newMemoTitle.trim()}>
              {t("memos.create")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
