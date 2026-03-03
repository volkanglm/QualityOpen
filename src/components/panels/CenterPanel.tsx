import {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlignLeft,
  Upload,
  FileText,
  Lock,
  Unlock,
  X,
  Search,
  MessageSquare,
  ChevronDown,
  StickyNote,
  ArrowLeft,
  List,
} from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";
import { SettingsPage } from "@/pages/SettingsPage";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { Badge } from "@/components/ui/Badge";
import { SearchHighlighter } from "@/components/editor/SearchHighlighter";
import { FloatingMenu, type FloatingMenuPos } from "@/components/editor/FloatingMenu";
import { ContextCodeMenu } from "@/components/editor/ContextCodeMenu";
import { CodeAssignPanel } from "@/components/editor/CodeAssignPanel";
import { CodingStripes } from "@/components/editor/CodingStripes";
import { MarginMemos } from "@/components/editor/MarginMemos";
import { LineNumbers } from "@/components/editor/LineNumbers";
import { PdfRenderer } from "@/components/editor/PdfRenderer";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { ImageViewer } from "@/components/media/ImageViewer";
import { DatabaseView } from "@/components/panels/DatabaseView";
import { importFile, getFileCategory, ACCEPTED_EXTENSIONS } from "@/lib/fileImport";
import { countWords, formatVideoTime } from "@/lib/utils";

const HIGHLIGHT_COLOR = "#fcd34d";

// ─── Reading typography ───────────────────────────────────────────────────────
const PROSE_STYLE: React.CSSProperties = {
  fontFamily: '"Charter", "Georgia", "Times New Roman", serif',
  fontSize: "16px",
  lineHeight: "1.90",
  letterSpacing: "0.01em",
  color: "var(--text-primary)",
  maxWidth: "68ch",
  margin: "0 auto",
  userSelect: "text",
  cursor: "text",
};

const PROSE_CLASS = "px-8 py-10 w-full outline-none";

// ─── Component ────────────────────────────────────────────────────────────────

export function CenterPanel() {
  const {
    activeDocumentId,
    activeProjectId,
    activeView,
    activeCodeFilter,
    searchQuery,
    chatOpen,
    showLineNumbers,
    setActiveSelection,
    setActiveDocument,
    setActiveCodeFilter,
    setChatOpen,
    setSearchQuery,
    toggleLineNumbers,
  } = useAppStore();

  const {
    documents,
    codes,
    segments,
    createCode,
    createDocument,
    addSegment,
    addSegments,
    deleteSegment,
    updateDocument,
  } = useProjectStore();

  const doc = documents.find((d) => d.id === activeDocumentId);
  const format = doc?.format ?? "text";
  const projectCodes = codes.filter((c) => c.projectId === activeProjectId);
  const docSegments = segments.filter((s) => s.documentId === activeDocumentId);

  // ── UI state ──
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(doc?.content ?? "");
  const [floatPos, setFloatPos] = useState<FloatingMenuPos | null>(null);
  const [codePanelSel, setCodePanelSel] = useState<FloatingMenuPos | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; pos: FloatingMenuPos } | null>(null);
  const [importing, setImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pdfTextLength, setPdfTextLength] = useState(0);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [noteVal, setNoteVal] = useState(doc?.note ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [isAutoCoding, setIsAutoCoding] = useState(false);

  const autoCodeMatches = useMemo(() => {
    if (!searchOpen || !searchQuery.trim() || !doc?.content) return [];
    let pattern = searchQuery;
    if (!useRegex) pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape regex
    if (wholeWord) pattern = `\\b${pattern}\\b`;
    const flags = matchCase ? "g" : "gi";
    try {
      const regex = new RegExp(pattern, flags);
      const matches = Array.from(doc.content.matchAll(regex));
      return matches.map((m) => ({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
      }));
    } catch { return []; }
  }, [searchOpen, searchQuery, doc?.content, useRegex, matchCase, wholeWord]);

  const readerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const noteSaveTimer = useRef<number | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [readerHeight, setReaderHeight] = useState(600);

  // Keep editContent in sync when doc changes
  useEffect(() => {
    setEditContent(doc?.content ?? "");
    setNoteVal(doc?.note ?? "");
    setEditMode(false);
    setNoteExpanded(false);
    setPdfTextLength(0);
  }, [doc?.id]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 80);
    else setSearchQuery("");
  }, [searchOpen, setSearchQuery]);

  // ── Save content (debounced 400ms) ────────────────────────────────────────
  const saveContent = useCallback(
    (val: string) => {
      if (!doc) return;
      if (saveTimer.current !== undefined) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        updateDocument(doc.id, { content: val, wordCount: countWords(val), format: "text" });
      }, 400) as unknown as number;
    },
    [doc, updateDocument]
  );

  // ── Save note (debounced 600ms) ───────────────────────────────────────────
  const saveNote = useCallback(
    (val: string) => {
      if (!doc) return;
      if (noteSaveTimer.current !== undefined) window.clearTimeout(noteSaveTimer.current);
      noteSaveTimer.current = window.setTimeout(() => {
        updateDocument(doc.id, { note: val });
      }, 600) as unknown as number;
    },
    [doc, updateDocument]
  );

  // ── Video timestamp ───────────────────────────────────────────────────────
  const handleVideoTimestamp = useCallback((seconds: number) => {
    if (!doc || !activeProjectId) return;
    const label = formatVideoTime(seconds);
    setCodePanelSel({
      centerX: 0,
      topY: 0,
      text: `[${label}]`,
      start: seconds,
      end: seconds,
    });
  }, [doc, activeProjectId]);

  const handleOcrComplete = (text: string) => {
    if (doc) {
      updateDocument(doc.id, {
        content: text,
        format: "text",
        wordCount: countWords(text),
      });
    }
  };

  // ── Text selection → floating menu ───────────────────────────────────────
  const handleMouseUp = useCallback(() => {
    if (editMode || format === "video" || format === "image") return;
    if (ctxMenu) return; // don't interfere with context menu
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setFloatPos(null);
      setActiveSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (!text) { setFloatPos(null); setActiveSelection(null); return; }

    const rect = range.getBoundingClientRect();
    const { start, end } = getOffsets(range, readerRef.current);

    setFloatPos({
      centerX: rect.left + rect.width / 2,
      topY: rect.top,
      text,
      start,
      end,
    });

    if (doc) setActiveSelection({ text, start, end, documentId: doc.id });
  }, [editMode, doc, setActiveSelection, ctxMenu, format]);

  // ── Right-click → context code menu ──────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (editMode || format === "video" || format === "image") return;
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!text || !doc || !activeProjectId) return;

    e.preventDefault();
    setFloatPos(null);  // hide floating menu

    const range = sel!.getRangeAt(0);
    const { start, end } = getOffsets(range, readerRef.current);
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      pos: { centerX: e.clientX, topY: e.clientY, text, start, end },
    });

    if (doc) setActiveSelection({ text, start, end, documentId: doc.id });
  }, [editMode, format, doc, activeProjectId, setActiveSelection]);

  // ── Floating menu actions ────────────────────────────────────────────────
  const handleAssignCode = (pos: FloatingMenuPos) => { setCodePanelSel(pos); };

  const handleAskAI = (pos: FloatingMenuPos) => {
    // Open chat with pre-filled question
    setChatOpen(true);
    void pos; // used by chat context
  };

  const handleHighlight = (pos: FloatingMenuPos) => {
    if (!doc || !activeProjectId) return;
    addSegment({
      documentId: doc.id,
      projectId: activeProjectId,
      start: pos.start,
      end: pos.end,
      text: pos.text,
      codeIds: [],
      isHighlight: true,
      highlightColor: HIGHLIGHT_COLOR,
    });
    window.getSelection()?.removeAllRanges();
  };

  const handleSummarize = async (pos: FloatingMenuPos) => {
    if (!doc || !activeProjectId) return;
    const { useSettingsStore } = await import("@/store/settings.store");
    const key = useSettingsStore.getState().getActiveKey();
    if (!key) { alert("Ayarlar > API Anahtarları'ndan bir AI anahtarı ekleyin."); return; }

    setSummarizing(true);
    try {
      const { analyzeThematicCodes } = await import("@/lib/ai");
      const result = await analyzeThematicCodes(key, pos.text);
      const summary = result.codes.map((c) => `${c.name}: ${c.rationale}`).join("\n");
      // Add as a highlight segment with memo
      addSegment({
        documentId: doc.id,
        projectId: activeProjectId,
        start: pos.start,
        end: pos.end,
        text: pos.text,
        codeIds: [],
        isHighlight: true,
        highlightColor: "#86efac",
        memo: summary,
      });
    } catch (err) {
      console.error("Summarize failed:", err);
    } finally {
      setSummarizing(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleApplyCode = (code: { id: string; name: string; color: string }) => {
    if (!codePanelSel || !doc || !activeProjectId) return;
    addSegment({
      documentId: doc.id,
      projectId: activeProjectId,
      start: codePanelSel.start,
      end: codePanelSel.end,
      text: codePanelSel.text,
      codeIds: [code.id],
    });
    window.getSelection()?.removeAllRanges();
    setCodePanelSel(null);
  };

  const handleCreateAndApplyCode = (name: string) => {
    if (!activeProjectId) return;
    const newCode = createCode(activeProjectId, name);
    handleApplyCode(newCode);
  };

  // ── Global Custom Events (Shortcuts) ──────────────────────────────────────
  useEffect(() => {
    const handleOpenSearch = () => {
      if (!searchOpen) {
        setSearchOpen(true);
      } else {
        searchInputRef.current?.focus();
      }
    };

    const handleOpenCodeMenu = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number, y: number, pos: FloatingMenuPos }>;
      if (customEvent.detail) {
        setCtxMenu(customEvent.detail);
      }
    };

    window.addEventListener("open-local-search", handleOpenSearch);
    window.addEventListener("open-code-menu", handleOpenCodeMenu);

    return () => {
      window.removeEventListener("open-local-search", handleOpenSearch);
      window.removeEventListener("open-code-menu", handleOpenCodeMenu);
    };
  }, [searchOpen]);

  // ── Context menu handlers ─────────────────────────────────────────────────
  const handleCtxSelect = (code: { id: string; name: string; color: string }) => {
    if (!ctxMenu || !doc || !activeProjectId) return;
    addSegment({
      documentId: doc.id,
      projectId: activeProjectId,
      start: ctxMenu.pos.start,
      end: ctxMenu.pos.end,
      text: ctxMenu.pos.text,
      codeIds: [code.id],
    });
    window.getSelection()?.removeAllRanges();
    setCtxMenu(null);
  };

  const handleCtxCreate = (name: string) => {
    if (!ctxMenu || !activeProjectId) return;
    const newCode = createCode(activeProjectId, name);
    handleCtxSelect(newCode);
  };

  // ── File import ───────────────────────────────────────────────────────────
  const applyImport = useCallback(async (file: File, targetDocId?: string) => {
    setImporting(true);
    try {
      const imported = await importFile(file);
      const resolvedId = targetDocId ?? doc?.id;
      if (resolvedId) {
        updateDocument(resolvedId, {
          name: imported.name || file.name,
          content: imported.content,
          format: imported.format,
          wordCount: imported.wordCount,
        });
        if (imported.format === "text") setEditContent(imported.content);
      }
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setImporting(false);
    }
  }, [doc, updateDocument]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!doc && activeProjectId) {
      const cat = getFileCategory(file);
      const docType = cat === "video" ? "video" : cat === "image" ? "image" : "document";
      const newDoc = createDocument(activeProjectId, file.name.replace(/\.[^.]+$/, ""), docType);
      setActiveDocument(newDoc.id);
      await applyImport(file, newDoc.id);
    } else {
      await applyImport(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!doc && activeProjectId) {
      const cat = getFileCategory(file);
      const docType = cat === "video" ? "video" : cat === "image" ? "image" : "document";
      const newDoc = createDocument(activeProjectId, file.name.replace(/\.[^.]+$/, ""), docType);
      setActiveDocument(newDoc.id);
      await applyImport(file, newDoc.id);
    } else {
      await applyImport(file);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SETTINGS / ANALYSIS VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (activeView === "settings") return <SettingsPage />;
  if (activeView === "analysis" || activeView === "dashboard") return <AnalysisPage />;

  // ─────────────────────────────────────────────────────────────────────────
  // CODE FILTER / RETRIEVAL VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (activeCodeFilter) {
    return (
      <RetrievalView
        codeId={activeCodeFilter}
        codes={projectCodes}
        segments={segments.filter((s) => s.projectId === activeProjectId && s.codeIds.includes(activeCodeFilter))}
        documents={documents}
        onClose={() => setActiveCodeFilter(null)}
        onSelectDoc={(docId) => {
          setActiveCodeFilter(null);
          setActiveDocument(docId);
        }}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EMPTY STATE / DATABASE VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (!doc) {
    if (documents.filter(d => d.projectId === activeProjectId).length > 0 && activeProjectId) {
      return (
        <div
          className="flex h-full flex-col overflow-hidden relative"
          style={{ background: "var(--bg-primary)" }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={async (e) => {
            setIsDragOver(false);
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (!file || !activeProjectId) return;
            const cat = getFileCategory(file);
            const docType = cat === "video" ? "video" : cat === "image" ? "image" : "document";
            const newDoc = createDocument(activeProjectId, file.name.replace(/\.[^.]+$/, ""), docType);
            setActiveDocument(newDoc.id);
            await applyImport(file, newDoc.id);
          }}
        >
          {isDragOver && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-[var(--surface)] p-8 shadow-2xl scale-105 transition-transform">
                <div className="rounded-full bg-[var(--accent-subtle)] p-4 text-[var(--accent)]">
                  <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Bırakın yüklensin</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Dosya projeye eklenecek</p>
              </div>
            </div>
          )}
          <DatabaseView />
        </div>
      );
    }

    return (
      <EmptyState
        isDragOver={isDragOver}
        hasProject={!!activeProjectId}
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files[0];
          if (!file || !activeProjectId) return;
          const cat = getFileCategory(file);
          const docType = cat === "video" ? "video" : cat === "image" ? "image" : "document";
          const newDoc = createDocument(activeProjectId, file.name.replace(/\.[^.]+$/, ""), docType);
          setActiveDocument(newDoc.id);
          await applyImport(file, newDoc.id);
        }}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-full flex-col overflow-hidden relative"
      style={{ background: "var(--bg-primary)" }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); handleDrop(e); }}
    >
      {/* ── Header ── */}
      <DocHeader
        doc={doc}
        wordCount={countWords(doc.content)}
        segmentCount={docSegments.length}
        editMode={editMode}
        importing={importing}
        searchOpen={searchOpen}
        chatOpen={chatOpen}
        summarizing={summarizing}
        showLineNumbers={showLineNumbers}
        onToggleEdit={() => {
          if (editMode) {
            updateDocument(doc.id, { content: editContent, wordCount: countWords(editContent), format: "text" });
          } else {
            setEditContent(doc.content);
          }
          setEditMode((m) => !m);
          setFloatPos(null);
          setCodePanelSel(null);
        }}
        onImport={() => fileInputRef.current?.click()}
        onToggleSearch={() => setSearchOpen((v) => !v)}
        onToggleChat={() => setChatOpen(!chatOpen)}
        onToggleLineNumbers={toggleLineNumbers}
      />

      {/* ── Search bar ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden flex-shrink-0"
          >
            <div
              className="flex items-center gap-2 px-4 py-2 border-b"
              style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}
            >
              <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setSearchOpen(false); }}
                placeholder="Metin içinde ara… (Enter: Regex aç/kapat)"
                className="flex-1 text-[13px] bg-transparent outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setMatchCase((v) => !v)}
                  className="flex-shrink-0 h-5 px-1.5 rounded text-[11px] font-mono transition-colors"
                  style={{
                    background: matchCase ? "var(--accent-border)" : "var(--surface)",
                    color: matchCase ? "var(--accent)" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                  title="Büyük/Küçük Harf (Match Case)"
                >
                  Aa
                </button>
                <button
                  onClick={() => setWholeWord((v) => !v)}
                  className="flex-shrink-0 h-5 px-1.5 rounded text-[11px] font-mono transition-colors"
                  style={{
                    background: wholeWord ? "var(--accent-border)" : "var(--surface)",
                    color: wholeWord ? "var(--accent)" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                  title="Tam Kelime (Whole Word)"
                >
                  \b
                </button>
                <button
                  onClick={() => setUseRegex((v) => !v)}
                  className="flex-shrink-0 h-5 px-1.5 rounded text-[11px] font-mono transition-colors"
                  style={{
                    background: useRegex ? "var(--accent-border)" : "var(--surface)",
                    color: useRegex ? "var(--accent)" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                  title="Düzenli İfade (Regex)"
                >
                  .*
                </button>
              </div>
              {searchQuery && autoCodeMatches.length > 0 && (
                <button
                  onClick={() => setIsAutoCoding(true)}
                  className="flex-shrink-0 h-5 px-2 rounded text-[11px] font-medium transition-colors"
                  style={{
                    background: "var(--accent)",
                    color: "white",
                  }}
                  title="Tüm sonuçlara aynı kodu ata"
                >
                  Tüm {autoCodeMatches.length} Sonucu Kodla
                </button>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ color: "var(--text-muted)" }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Code assign panel ── */}
      <AnimatePresence>
        {codePanelSel && (
          <CodeAssignPanel
            key="code-panel"
            selectionText={codePanelSel.text}
            codes={projectCodes}
            onApply={handleApplyCode}
            onCreate={handleCreateAndApplyCode}
            onClose={() => setCodePanelSel(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Auto code assign panel ── */}
      <AnimatePresence>
        {isAutoCoding && autoCodeMatches.length > 0 && doc && activeProjectId && (
          <CodeAssignPanel
            key="autocode-panel"
            selectionText={`${autoCodeMatches.length} adet sonuca kod ata:`}
            codes={projectCodes}
            onApply={(code) => {
              addSegments(autoCodeMatches.map(m => ({
                documentId: doc.id,
                projectId: activeProjectId,
                start: m.start,
                end: m.end,
                text: m.text,
                codeIds: [code.id]
              })));
              setIsAutoCoding(false);
              setSearchOpen(false);
            }}
            onCreate={(name) => {
              const newCode = createCode(activeProjectId, name);
              addSegments(autoCodeMatches.map(m => ({
                documentId: doc.id,
                projectId: activeProjectId,
                start: m.start,
                end: m.end,
                text: m.text,
                codeIds: [newCode.id]
              })));
              setIsAutoCoding(false);
              setSearchOpen(false);
            }}
            onClose={() => setIsAutoCoding(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Document note ── */}
      {format !== "video" && format !== "image" && (
        <AnimatePresence>
          {noteExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="overflow-hidden flex-shrink-0"
            >
              <div
                className="px-8 pt-3 pb-2 border-b"
                style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Belge Notu
                </p>
                <textarea
                  value={noteVal}
                  onChange={(e) => {
                    setNoteVal(e.target.value);
                    saveNote(e.target.value);
                  }}
                  placeholder="Bu belge hakkında araştırmacı notunuzu buraya yazın…"
                  rows={3}
                  className="w-full bg-transparent outline-none resize-none text-[13px] leading-relaxed"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Note toggle button (bottom edge of header area) ── */}
      {format !== "video" && format !== "image" && (
        <button
          onClick={() => setNoteExpanded((v) => !v)}
          className="flex items-center gap-1 px-4 py-1 border-b text-[10px] transition-colors w-full text-left flex-shrink-0"
          style={{
            borderColor: "var(--border-subtle)",
            background: "var(--bg-secondary)",
            color: doc.note ? "var(--text-secondary)" : "var(--text-disabled)",
          }}
        >
          <StickyNote className="h-3 w-3 flex-shrink-0" />
          <span className="flex-1 truncate">
            {doc.note ? doc.note.slice(0, 60) + (doc.note.length > 60 ? "…" : "") : "Belge notu ekle…"}
          </span>
          <ChevronDown
            className="h-3 w-3 flex-shrink-0 transition-transform"
            style={{ transform: noteExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      )}

      {/* ── Content area ── */}

      {/* VIDEO */}
      {format === "video" && (
        <div className="flex-1 overflow-hidden">
          <VideoPlayer
            src={doc.content}
            segments={docSegments}
            codes={projectCodes}
            onAddTimestamp={handleVideoTimestamp}
            onDurationChange={(secs) =>
              updateDocument(doc.id, { mediaDuration: secs })
            }
          />
        </div>
      )}

      {/* IMAGE */}
      {format === "image" && (
        <div className="flex-1 overflow-hidden">
          <ImageViewer src={doc.content} />
        </div>
      )}

      {/* TEXT / HTML / PDF */}
      {format !== "video" && format !== "image" && (
        <div
          className="flex-1 overflow-y-auto doc-reader"
          ref={readerRef}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
        >
          {editMode ? (
            <textarea
              autoFocus
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                saveContent(e.target.value);
              }}
              placeholder="Paste or type your research data here…"
              className={PROSE_CLASS}
              style={{
                ...PROSE_STYLE,
                display: "block",
                resize: "none",
                width: "100%",
                height: "100%",
                minHeight: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                caretColor: "var(--accent)",
                fontFamily: '"Inter", system-ui, sans-serif',
                fontSize: "14px",
                lineHeight: "1.75",
              }}
              spellCheck={false}
            />
          ) : (
            <div className="flex w-full min-h-full">
              {/* Left margin: Line Numbers (Text only) */}
              {showLineNumbers && format === "text" && (
                <LineNumbers content={doc.content} every={5} />
              )}

              {/* Left margin: Coding Stripes */}
              <CodingStripes
                segments={docSegments}
                codes={codes}
                contentLength={format === "pdf" ? pdfTextLength : doc.content.length}
                containerHeight={readerHeight}
              />

              {/* Center: Main Content Workspace */}
              <div
                className="flex-1 min-w-0"
                ref={(el) => {
                  if (el && el.scrollHeight !== readerHeight) {
                    setReaderHeight(el.scrollHeight);
                  }
                }}
              >
                {format === "pdf" ? (
                  <PdfRenderer
                    base64={doc.content}
                    onOcrComplete={handleOcrComplete}
                    onLoadComplete={setPdfTextLength}
                  />
                ) : format === "html" ? (
                  <div
                    className={PROSE_CLASS}
                    style={PROSE_STYLE}
                    dangerouslySetInnerHTML={{ __html: doc.content }}
                  />
                ) : (
                  <div className={PROSE_CLASS} style={PROSE_STYLE}>
                    {doc.content ? (
                      <SearchHighlighter
                        content={doc.content}
                        segments={docSegments}
                        codes={codes}
                        searchQuery={searchOpen ? searchQuery : ""}
                        useRegex={useRegex}
                        matchCase={matchCase}
                        wholeWord={wholeWord}
                      />
                    ) : (
                      <span style={{ color: "var(--text-disabled)" }}>
                        Empty document — click the pencil icon to start writing, or import a file.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right margin: Margin Memos */}
              <MarginMemos
                segments={docSegments}
                codes={codes}
                contentLength={format === "pdf" ? pdfTextLength : doc.content.length}
                containerHeight={readerHeight}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Floating selection menu ── */}
      <FloatingMenu
        pos={floatPos}
        onAssignCode={handleAssignCode}
        onAskAI={handleAskAI}
        onHighlight={handleHighlight}
        onSummarize={(pos) => void handleSummarize(pos)}
        onDismiss={() => setFloatPos(null)}
      />

      {/* ── Right-click context code menu ── */}
      <AnimatePresence>
        {ctxMenu && (
          <ContextCodeMenu
            key="ctx-menu"
            x={ctxMenu.x}
            y={ctxMenu.y}
            codes={projectCodes}
            selectedText={ctxMenu.pos.text}
            onSelect={handleCtxSelect}
            onCreate={handleCtxCreate}
            onClose={() => setCtxMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Segments footer strip ── */}
      <AnimatePresence>
        {docSegments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex-shrink-0 border-t px-5 py-2 flex items-center gap-2 overflow-x-auto"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-secondary)",
            }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              Segments
            </span>
            {docSegments.map((seg) => {
              const segCodes = codes.filter((c) => seg.codeIds.includes(c.id));
              const color = seg.isHighlight
                ? seg.highlightColor ?? HIGHLIGHT_COLOR
                : segCodes[0]?.color ?? "var(--accent)";

              return (
                <motion.div
                  key={seg.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1 flex-shrink-0 border cursor-default"
                  style={{ background: `${color}10`, borderColor: `${color}40` }}
                  title={seg.memo ?? undefined}
                >
                  <span
                    className="text-[11px] max-w-[90px] truncate"
                    style={{ color: "var(--text-muted)" }}
                    title={seg.text}
                  >
                    "{seg.text}"
                  </span>
                  {seg.isHighlight ? (
                    <Badge color={HIGHLIGHT_COLOR}>{seg.memo ? "Note" : "Highlight"}</Badge>
                  ) : (
                    segCodes.map((c) => (
                      <Badge key={c.id} color={c.color}>{c.name}</Badge>
                    ))
                  )}
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                    style={{ color: "var(--danger)" }}
                    onClick={() => deleteSegment(seg.id)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Importing overlay */}
      <AnimatePresence>
        {importing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            <div
              className="rounded-[var(--radius-md)] border px-6 py-5 flex items-center gap-3"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-5 w-5 rounded-full border-2 border-t-transparent"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
              />
              <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                Importing file…
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summarizing overlay */}
      <AnimatePresence>
        {summarizing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-2.5"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", boxShadow: "var(--float-shadow)" }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-3.5 w-3.5 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
            <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
              AI özetleniyor…
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Retrieval View ───────────────────────────────────────────────────────────

const feedContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const feedCardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
};

function RetrievalView({
  codeId,
  codes,
  segments,
  documents,
  onClose,
  onSelectDoc,
}: {
  codeId: string;
  codes: import("@/types").Code[];
  segments: import("@/types").Segment[];
  documents: import("@/types").Document[];
  onClose: () => void;
  onSelectDoc: (docId: string) => void;
}) {
  const code = codes.find((c) => c.id === codeId);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[12px] font-medium transition-colors rounded-md px-2 py-1 hover:bg-[var(--surface-hover)]"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Geri
        </button>

        <div className="h-4 w-px mx-1" style={{ background: "var(--border)" }} />

        {code && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: code.color }} />
            <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {code.name}
            </span>
          </div>
        )}

        <span
          className="text-[11px] tabular-nums rounded-full px-2.5 py-0.5 flex-shrink-0"
          style={{
            color: "var(--text-muted)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {segments.length} alıntı
        </span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center"
              style={{ background: "var(--surface)" }}
            >
              <FileText className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Bu koda atanmış segment yok.
            </p>
          </div>
        ) : (
          <motion.div
            variants={feedContainerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {segments.map((seg) => {
              const doc = documents.find((d) => d.id === seg.documentId);
              const segCodes = codes.filter((c) => seg.codeIds.includes(c.id));

              return (
                <motion.article
                  key={seg.id}
                  variants={feedCardVariants}
                  className="rounded-lg border p-5 cursor-pointer transition-all group"
                  style={{
                    background: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                  }}
                  whileHover={{
                    y: -2,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  }}
                  onClick={() => { if (doc) onSelectDoc(doc.id); }}
                >
                  {/* Card Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    <span className="text-[12px] font-medium truncate" style={{ color: "var(--text-muted)" }}>
                      {doc?.name ?? "Bilinmeyen belge"}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-disabled)" }}>·</span>
                    <span className="text-[10px] flex-shrink-0" style={{ color: "var(--text-disabled)" }}>
                      {formatDate(seg.createdAt)}
                    </span>
                  </div>

                  {/* Card Body — Quoted text */}
                  <div
                    className="pl-4 mb-3"
                    style={{ borderLeft: `3px solid ${code?.color ?? "var(--border)"}60` }}
                  >
                    <p
                      className="text-[13px] leading-relaxed"
                      style={{
                        color: "var(--text-primary)",
                        fontFamily: '"Georgia", "Times New Roman", serif',
                      }}
                    >
                      "{seg.text}"
                    </p>
                  </div>

                  {/* Memo */}
                  {seg.memo && (
                    <p
                      className="text-[11px] italic mb-3 pl-4"
                      style={{ color: "var(--text-muted)" }}
                    >
                      💬 {seg.memo}
                    </p>
                  )}

                  {/* Card Footer — Code badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {segCodes.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background: `${c.color}15`,
                          color: c.color,
                          border: `1px solid ${c.color}30`,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: c.color }}
                        />
                        {c.name}
                      </span>
                    ))}
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Doc header ───────────────────────────────────────────────────────────────

function DocHeader({
  doc,
  wordCount,
  segmentCount,
  editMode,
  importing,
  searchOpen,
  chatOpen,
  summarizing,
  showLineNumbers,
  onToggleEdit,
  onImport,
  onToggleSearch,
  onToggleChat,
  onToggleLineNumbers,
}: {
  doc: import("@/types").Document;
  wordCount: number;
  segmentCount: number;
  editMode: boolean;
  importing: boolean;
  searchOpen: boolean;
  chatOpen: boolean;
  summarizing: boolean;
  showLineNumbers: boolean;
  onToggleEdit: () => void;
  onImport: () => void;
  onToggleSearch: () => void;
  onToggleChat: () => void;
  onToggleLineNumbers: () => void;
}) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-6 p-4 border-b overflow-x-auto custom-scrollbar gap-8"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
    >
      <div className="flex items-center gap-4 min-w-max">
        <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
        <span
          className="flex-1 text-sm font-medium truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {doc.name}
        </span>

        {/* Stats */}
        <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {wordCount > 0 && <span>{wordCount.toLocaleString()} words</span>}
          {segmentCount > 0 && (
            <>
              <span style={{ color: "var(--border)" }}>·</span>
              <span>{segmentCount} coded</span>
            </>
          )}
          {doc.format && doc.format !== "text" && (
            <>
              <span style={{ color: "var(--border)" }}>·</span>
              <span className="uppercase font-semibold" style={{ color: "var(--text-disabled)" }}>
                {doc.format}
              </span>
            </>
          )}
          {summarizing && (
            <span style={{ color: "var(--code-8)" }}>AI…</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 min-w-max flex-shrink-0">
        {!editMode && doc.format === "text" && (
          <Button
            size="sm"
            variant={showLineNumbers ? "primary" : "ghost"}
            className="h-6 gap-1 text-[11px]"
            onClick={onToggleLineNumbers}
            title="Satır Numaraları"
          >
            <List className="h-3 w-3" />
          </Button>
        )}

        <Button
          size="sm"
          variant={searchOpen ? "primary" : "ghost"}
          className="h-6 gap-1 text-[11px]"
          onClick={onToggleSearch}
        >
          <Search className="h-3 w-3" />
        </Button>

        {/* Chat toggle */}
        <Button
          size="sm"
          variant={chatOpen ? "primary" : "ghost"}
          className="h-6 gap-1 text-[11px]"
          onClick={onToggleChat}
          title="Belgelerle Sohbet"
        >
          <MessageSquare className="h-3 w-3" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 text-[11px]"
          onClick={onImport}
          loading={importing}
        >
          <Upload className="h-3 w-3" />
          Import
        </Button>

        {/* Line numbers toggle */}
        {doc.format !== "pdf" && doc.format !== "video" && doc.format !== "image" && (
          <Button
            size="sm"
            variant={showLineNumbers ? "primary" : "ghost"}
            className="h-6 gap-1 text-[11px]"
            onClick={onToggleLineNumbers}
            title="Satır Numaraları"
          >
            <List className="h-3 w-3" />
          </Button>
        )}

        {doc.format !== "pdf" && doc.format !== "video" && doc.format !== "image" && (
          <Button
            size="sm"
            variant={editMode ? "primary" : "ghost"}
            className="h-6 gap-1 text-[11px]"
            onClick={onToggleEdit}
            title={editMode ? "Kilitle (Salt Okuma)" : "Kilidi Aç (Düzenle)"}
          >
            {editMode ? (
              <Unlock className="h-3 w-3" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  onDrop,
  onDragEnter,
  onDragLeave,
  isDragOver,
  hasProject,
}: {
  onDrop: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  isDragOver: boolean;
  hasProject: boolean;
}) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-5 text-center p-8 transition-colors"
      style={{
        background: isDragOver ? "var(--accent-subtle)" : "var(--bg-primary)",
        outline: isDragOver ? "2px dashed var(--accent)" : "none",
        outlineOffset: "-2px",
      }}
      onDragOver={(e) => { e.preventDefault(); onDragEnter(); }}
      onDragEnter={() => onDragEnter()}
      onDragLeave={() => onDragLeave()}
      onDrop={onDrop}
    >
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center transition-colors"
        style={{ background: isDragOver ? "var(--accent-border)" : "var(--surface)" }}
      >
        {isDragOver
          ? <Upload className="h-7 w-7" style={{ color: "var(--accent)" }} />
          : <AlignLeft className="h-7 w-7" style={{ color: "var(--text-muted)" }} />
        }
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {isDragOver ? "Dosyayı bırakın" : "No document open"}
        </p>
        <p className="text-xs mt-1.5 leading-relaxed max-w-xs" style={{ color: "var(--text-muted)" }}>
          {isDragOver
            ? hasProject ? "Belge olarak içe aktarılacak" : "Önce sol panelden bir proje seçin"
            : <>Select a document from the Explorer, or drag a <strong>.txt, .docx, .pdf</strong> file here.</>
          }
        </p>
      </div>
      {!isDragOver && (
        <div
          className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-[var(--radius-md)] border border-dashed"
          style={{ borderColor: "var(--border)", color: "var(--text-disabled)" }}
        >
          <Upload className="h-3.5 w-3.5" />
          Drop file to import
        </div>
      )}
    </div>
  );
}

// ─── Offset calculation ───────────────────────────────────────────────────────
// Uses Range.toString() to count plain-text characters from the container start
// to the selection boundaries — works correctly even when the content is split
// into multiple DOM nodes by SearchHighlighter or any other renderer.

function getOffsets(range: Range, container: HTMLElement | null): { start: number; end: number } {
  if (!container) return { start: 0, end: 0 };
  try {
    const pre = range.cloneRange();
    pre.selectNodeContents(container);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const end = start + range.toString().length;
    return { start, end };
  } catch {
    return { start: 0, end: 0 };
  }
}
