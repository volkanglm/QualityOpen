import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

export function MemosPage() {
  const { activeProjectId } = useAppStore();
  const { memos, createMemo, updateMemo, deleteMemo } = useProjectStore();

  const [activeMemoId, setActiveMemoId] = useState<string | null>(null);
  const [newMemoModal, setNewMemoModal] = useState(false);
  const [newMemoTitle, setNewMemoTitle] = useState("");

  const projectMemos = memos
    .filter((m) => m.projectId === activeProjectId)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const activeMemo = projectMemos.find((m) => m.id === activeMemoId);

  const handleCreate = () => {
    if (!activeProjectId || !newMemoTitle.trim()) return;
    const memo = createMemo(activeProjectId, newMemoTitle.trim());
    setActiveMemoId(memo.id);
    setNewMemoTitle("");
    setNewMemoModal(false);
  };

  if (!activeProjectId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--color-text-muted)]">Select a project to view memos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Memo list */}
      <div className="w-64 flex flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Memos
          </span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setNewMemoModal(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {projectMemos.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] px-4 py-2">No memos yet.</p>
          ) : (
            projectMemos.map((memo) => (
              <motion.button
                key={memo.id}
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={() => setActiveMemoId(memo.id)}
                className={`w-full text-left px-4 py-2.5 transition-colors ${
                  activeMemoId === memo.id
                    ? "bg-[var(--color-accent-subtle)]"
                    : "hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                <p
                  className={`text-xs font-medium truncate ${
                    activeMemoId === memo.id
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-primary)]"
                  }`}
                >
                  {memo.title}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                  {formatDate(memo.updatedAt)}
                </p>
              </motion.button>
            ))
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
            <textarea
              className="flex-1 resize-none bg-transparent px-8 py-6 text-sm leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
              value={activeMemo.content}
              onChange={(e) => updateMemo(activeMemo.id, { content: e.target.value })}
              placeholder="Write your analytical memo here…"
              style={{ userSelect: "text" }}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center flex-col gap-3">
            <BookOpen className="h-8 w-8 text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              {projectMemos.length === 0
                ? "No memos yet. Create one to record analytical insights."
                : "Select a memo to start editing."}
            </p>
            <Button variant="outline" size="sm" onClick={() => setNewMemoModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              New memo
            </Button>
          </div>
        )}
      </div>

      <Modal open={newMemoModal} onClose={() => setNewMemoModal(false)} title="New Memo">
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Emerging themes from P01"
            value={newMemoTitle}
            onChange={(e) => setNewMemoTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNewMemoModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newMemoTitle.trim()}>
              Create memo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
