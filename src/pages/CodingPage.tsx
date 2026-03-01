import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Tag, X, FileText, ArrowLeft } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { cn, countWords } from "@/lib/utils";
import type { Code } from "@/types";

export function CodingPage() {
  const { activeProjectId, activeDocumentId, setActiveDocument, setActiveView } = useAppStore();
  const { documents, codes, segments, createCode, addSegment, deleteSegment, updateDocument } =
    useProjectStore();

  const doc = documents.find((d) => d.id === activeDocumentId);
  const projectCodes = codes.filter((c) => c.projectId === activeProjectId);
  const docSegments = segments.filter((s) => s.documentId === activeDocumentId);

  const [selectedText, setSelectedText] = useState<{ text: string; start: number; end: number } | null>(null);
  const [codePickerOpen, setCodePickerOpen] = useState(false);
  const [newCodeModal, setNewCodeModal] = useState(false);
  const [newCodeName, setNewCodeName] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [editableContent, setEditableContent] = useState(doc?.content ?? "");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync content changes
  const handleContentChange = useCallback(
    (val: string) => {
      setEditableContent(val);
      if (doc) {
        updateDocument(doc.id, { content: val, wordCount: countWords(val) });
      }
    },
    [doc, updateDocument]
  );

  const handleTextSelect = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      setSelectedText(null);
      return;
    }
    const text = ta.value.slice(start, end);
    setSelectedText({ text, start, end });
    setCodePickerOpen(true);
  };

  const applyCode = (code: Code) => {
    if (!selectedText || !doc || !activeProjectId) return;
    addSegment({
      documentId: doc.id,
      projectId: activeProjectId,
      start: selectedText.start,
      end: selectedText.end,
      text: selectedText.text,
      codeIds: [code.id],
    });
    setSelectedText(null);
    setCodePickerOpen(false);
  };

  const handleCreateCode = () => {
    if (!activeProjectId || !newCodeName.trim()) return;
    const code = createCode(activeProjectId, newCodeName.trim());
    setNewCodeName("");
    setNewCodeModal(false);
    if (selectedText) applyCode(code);
  };

  const filteredCodes = projectCodes.filter((c) =>
    c.name.toLowerCase().includes(codeSearch.toLowerCase())
  );

  if (!doc) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
        <div className="h-16 w-16 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center">
          <Tag className="h-8 w-8 text-[var(--color-text-muted)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">No document open</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Open a document from the Documents view to start coding.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setActiveView("documents")}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Go to documents
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Editor Panel */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-[var(--color-border-subtle)]">
        {/* Doc header */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-5 py-3">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => { setActiveDocument(null); setActiveView("documents"); }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
            <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {doc.name}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span>{countWords(editableContent)} words</span>
            <span>·</span>
            <span>{docSegments.length} segments coded</span>
          </div>
        </div>

        {/* Code picker popup */}
        <AnimatePresence>
          {codePickerOpen && selectedText && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] px-4 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Apply code to: <em className="text-[var(--color-text-primary)]">"{selectedText.text.slice(0, 40)}{selectedText.text.length > 40 ? "…" : ""}"</em>
                </p>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setCodePickerOpen(false); setSelectedText(null); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search codes…"
                  value={codeSearch}
                  onChange={(e) => setCodeSearch(e.target.value)}
                  className="flex-1 h-7 text-xs"
                />
                <Button size="sm" variant="outline" onClick={() => setNewCodeModal(true)}>
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {filteredCodes.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)]">No codes yet</p>
                ) : (
                  filteredCodes.map((code) => (
                    <motion.button
                      key={code.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => applyCode(code)}
                      className="rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: `${code.color}22`,
                        color: code.color,
                        border: `1px solid ${code.color}44`,
                      }}
                    >
                      {code.name}
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text editor */}
        <textarea
          ref={textareaRef}
          value={editableContent}
          onChange={(e) => handleContentChange(e.target.value)}
          onMouseUp={handleTextSelect}
          onKeyUp={handleTextSelect}
          placeholder="Start typing or paste your data here…"
          className={cn(
            "flex-1 resize-none bg-transparent px-8 py-6 text-sm leading-relaxed text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none font-mono overflow-y-auto"
          )}
          style={{ userSelect: "text" }}
          spellCheck={false}
        />
      </div>

      {/* Right Panel — Codes & Segments */}
      <div className="w-64 flex flex-col overflow-hidden bg-[var(--color-bg-secondary)] flex-shrink-0">
        {/* Codes */}
        <div className="border-b border-[var(--color-border-subtle)] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
              Codes
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setNewCodeModal(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {projectCodes.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                No codes yet. Select text to create one.
              </p>
            ) : (
              projectCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: code.color }}
                    />
                    <span className="text-xs text-[var(--color-text-secondary)] truncate">
                      {code.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">
                    {code.usageCount ?? 0}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Segments */}
        <div className="flex-1 overflow-y-auto p-4">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            Coded segments
          </span>
          <div className="mt-3 space-y-2">
            {docSegments.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                Select text and apply a code to create segments.
              </p>
            ) : (
              docSegments.map((seg) => {
                const segCodes = codes.filter((c) => seg.codeIds.includes(c.id));
                return (
                  <motion.div
                    key={seg.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-2.5"
                  >
                    <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-2">
                      "{seg.text}"
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {segCodes.map((code) => (
                        <Badge key={code.id} color={code.color}>
                          {code.name}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1.5 h-5 w-full text-[10px] text-[var(--color-text-muted)] hover:text-[#fca5a5]"
                      onClick={() => deleteSegment(seg.id)}
                    >
                      Remove
                    </Button>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* New Code Modal */}
      <Modal open={newCodeModal} onClose={() => setNewCodeModal(false)} title="New Code">
        <div className="space-y-4">
          <Input
            label="Code name"
            placeholder="e.g. Emotional response"
            value={newCodeName}
            onChange={(e) => setNewCodeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateCode()}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNewCodeModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateCode} disabled={!newCodeName.trim()}>
              Create code
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
