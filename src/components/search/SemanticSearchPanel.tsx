import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Loader2,
  Sparkles,
  ScanSearch,
  Database,
  AlertTriangle,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useSettingsStore } from "@/store/settings.store";
import { useEmbeddingsStore, type SemanticResultItem } from "@/store/embeddings.store";
import { useT } from "@/hooks/useT";
import type { TranslationKey } from "@/lib/i18n";

// Recommended embedding models, best-first. Local models must be pulled first
// (`ollama pull <model>`); OpenAI models use the user's API key. `label` is a
// translation KEY resolved with t() at render (these arrays live outside the
// component, so the raw value cannot be translated here).
const OLLAMA_EMBED_MODELS = [
  { id: "bge-m3", label: "semantic.model.bgeM3" },
  { id: "snowflake-arctic-embed2", label: "semantic.model.arctic2" },
  { id: "mxbai-embed-large", label: "semantic.model.mxbai" },
  { id: "nomic-embed-text", label: "semantic.model.nomic" },
];
const OPENAI_EMBED_MODELS = [
  { id: "text-embedding-3-large", label: "semantic.model.openaiLarge" },
  { id: "text-embedding-3-small", label: "semantic.model.openaiSmall" },
];
const GEMINI_EMBED_MODELS = [
  { id: "text-embedding-004", label: "semantic.model.gemini004" },
  { id: "gemini-embedding-001", label: "semantic.model.geminiNew" },
];

/**
 * Scrolls the document reader to the segment with the given id and briefly
 * highlights it. Segments expose `data-segment-id` in TextHighlighter /
 * SearchHighlighter / PdfRenderer. The element may not be in the DOM yet (a
 * just-switched document, or an async PDF text layer), so we retry the query
 * for up to `maxWaitMs` before giving up.
 */
function scrollToSegment(id: string, maxWaitMs = 800) {
  const start = Date.now();
  const attempt = () => {
    const el = document.querySelector(`[data-segment-id="${id}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const prev = el.style.boxShadow;
      el.style.transition = "box-shadow 0.2s ease";
      el.style.boxShadow = "0 0 0 3px var(--accent)";
      setTimeout(() => {
        el.style.boxShadow = prev;
      }, 1200);
      return;
    }
    if (Date.now() - start < maxWaitMs) setTimeout(attempt, 150);
  };
  attempt();
}

/**
 * Slide-over panel for on-device semantic (vector) search. Lets the user index
 * the active project's segments via Ollama embeddings and run cosine-similarity
 * queries against them, then jump to any matching highlight in the reader.
 */
export function SemanticSearchPanel() {
  const t = useT();
  const semanticOpen = useAppStore((s) => s.semanticOpen);
  const semanticPrefill = useAppStore((s) => s.semanticPrefill);
  const setSemanticOpen = useAppStore((s) => s.setSemanticOpen);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const activeDocumentId = useAppStore((s) => s.activeDocumentId);
  const setActiveDocument = useAppStore((s) => s.setActiveDocument);
  const setActiveView = useAppStore((s) => s.setActiveView);

  // Narrow selectors — re-render only when these arrays change, not on every
  // project-store mutation (the panel is always mounted at the app root).
  const documents = useProjectStore((s) => s.documents);
  const segments = useProjectStore((s) => s.segments);
  const codes = useProjectStore((s) => s.codes);

  const status = useEmbeddingsStore((s) => s.status);
  const total = useEmbeddingsStore((s) => s.total);
  const indexed = useEmbeddingsStore((s) => s.indexed);
  const progress = useEmbeddingsStore((s) => s.progress);
  const lastError = useEmbeddingsStore((s) => s.lastError);
  const refreshCounts = useEmbeddingsStore((s) => s.refreshCounts);
  const indexProject = useEmbeddingsStore((s) => s.indexProject);
  const search = useEmbeddingsStore((s) => s.search);
  const clearIndex = useEmbeddingsStore((s) => s.clear);

  // Semantic-search config (provider, model, chunk size, document indexing).
  const embedProvider = useSettingsStore((s) => s.embedProvider);
  const embedChunkSize = useSettingsStore((s) => s.embedChunkSize);
  const embedIndexDocuments = useSettingsStore((s) => s.embedIndexDocuments);
  const setEmbedProvider = useSettingsStore((s) => s.setEmbedProvider);
  const setEmbedModel = useSettingsStore((s) => s.setEmbedModel);
  const setEmbedChunkSize = useSettingsStore((s) => s.setEmbedChunkSize);
  const setEmbedIndexDocuments = useSettingsStore((s) => s.setEmbedIndexDocuments);
  const getOpenAIKey = useSettingsStore((s) => s.getOpenAIKey);
  const getGeminiKey = useSettingsStore((s) => s.getGeminiKey);
  const embedModel = useSettingsStore((s) => s.embedModel);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SemanticResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  // When on, search / "find similar" exclude the active document so results come
  // from OTHER files (cross-document similarity).
  const [excludeActiveDoc, setExcludeActiveDoc] = useState(false);
  const [clearing, setClearing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // O(1) lookups for result citations.
  const segmentMap = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments]);
  const docMap = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents]);
  const codeMap = useMemo(() => new Map(codes.map((c) => [c.id, c])), [codes]);

  const runSearch = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || !activeProjectId || searching) return;
      setSearching(true);
      setSearched(true);
      try {
        const exclude = excludeActiveDoc ? activeDocumentId ?? undefined : undefined;
        const hits = await search(q, activeProjectId, undefined, exclude);
        setResults(hits);
      } catch {
        // The store sets status:"error" + lastError; surface it via the error row.
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [activeProjectId, activeDocumentId, excludeActiveDoc, search, searching]
  );

  // Recompute counts + focus when the panel opens; consume any prefill query.
  useEffect(() => {
    if (!semanticOpen) return;
    if (activeProjectId) refreshCounts(activeProjectId);
    setTimeout(() => inputRef.current?.focus(), 150);
    if (semanticPrefill) {
      setQuery(semanticPrefill);
      void runSearch(semanticPrefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanticOpen, semanticPrefill, activeProjectId]);

  const handleIndex = useCallback(() => {
    if (!activeProjectId) return;
    void indexProject(activeProjectId);
  }, [activeProjectId, indexProject]);

  // After any config setter fires, recompute counts — toggling document
  // indexing or chunk size changes `total`, so the status row must update.
  const syncCounts = useCallback(() => {
    if (activeProjectId) refreshCounts(activeProjectId);
  }, [activeProjectId, refreshCounts]);

  const handleProvider = useCallback(
    (p: "ollama" | "openai" | "gemini") => {
      setEmbedProvider(p);
      setEmbedModel(
        p === "openai" ? "text-embedding-3-small" : p === "gemini" ? "text-embedding-004" : "nomic-embed-text"
      );
      syncCounts();
    },
    [setEmbedProvider, setEmbedModel, syncCounts]
  );

  const handleIndexDocuments = useCallback(
    (b: boolean) => {
      setEmbedIndexDocuments(b);
      syncCounts();
    },
    [setEmbedIndexDocuments, syncCounts]
  );

  const handleChunkSize = useCallback(
    (n: number) => {
      setEmbedChunkSize(n);
      syncCounts();
    },
    [setEmbedChunkSize, syncCounts]
  );

  const handleModel = useCallback(
    (m: string) => {
      setEmbedModel(m);
      // Counts are model-aware: switching models marks old-model vectors as
      // not-indexed, so the {indexed}/{total} row must refresh here.
      syncCounts();
    },
    [setEmbedModel, syncCounts]
  );

  const handleClearIndex = useCallback(async () => {
    if (!activeProjectId || clearing) return;
    setClearing(true);
    try {
      await clearIndex(activeProjectId);
      refreshCounts(activeProjectId);
      const { useToastStore } = await import("@/store/toast.store");
      useToastStore.getState().push(t("semantic.indexCleared"), "success");
    } finally {
      setClearing(false);
    }
  }, [activeProjectId, clearing, clearIndex, refreshCounts, t]);

  const cloudKeyMissing =
    (embedProvider === "openai" && !getOpenAIKey()) ||
    (embedProvider === "gemini" && !getGeminiKey());

  const isIndexing = status === "indexing";
  const isError = status === "error";
  const hasIndex = indexed > 0;
  const fullyIndexed = total > 0 && indexed >= total;

  const handleResultClick = (item: SemanticResultItem) => {
    const sameDoc = item.documentId === activeDocumentId;
    // Open the source document in the reader if the hit is in another file.
    if (!sameDoc) {
      setActiveView("coding");
      setActiveDocument(item.documentId);
    }
    if (item.kind === "segment" && item.segmentId) {
      // Segments render a `data-segment-id` mark — scroll to it (retry while the
      // doc / PDF text layer renders).
      scrollToSegment(item.segmentId, sameDoc ? 1000 : 4000);
    }
    // Chunk hits have no per-chunk DOM anchor yet — opening the document is the
    // navigation (the main value of cross-file search).
  };

  return (
    <AnimatePresence>
      {semanticOpen && (
        <>
          {/* Drawer (no backdrop — click-through so navigating to a result is
              visible in the reader underneath). Close via the X button. */}
          <motion.div
            key="semantic-panel"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 300,
              width: 420,
              maxWidth: "92vw",
              background: "var(--bg-secondary)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "var(--float-shadow)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <ScanSearch className="h-4 w-4" style={{ color: "var(--accent)" }} />
              <span className="text-[13px] font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
                {t("semantic.title")}
              </span>
              <button
                onClick={() => setConfigOpen((v) => !v)}
                aria-label={t("semantic.settingsAria")}
                aria-expanded={configOpen}
                title={t("semantic.settingsTitle")}
                className="flex items-center gap-1 text-[11px] font-medium px-1.5 py-1 rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: configOpen ? "var(--accent)" : "var(--text-muted)" }}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("semantic.settings")}
              </button>
              <button
                onClick={() => setSemanticOpen(false)}
                aria-label={t("semantic.close")}
                className="hover:text-[var(--text-primary)] transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Collapsible config panel */}
            <AnimatePresence initial={false}>
              {configOpen && (
                <motion.div
                  key="semantic-config"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  className="overflow-hidden flex-shrink-0 border-b"
                  style={{ borderColor: "var(--border-subtle)", background: "var(--surface)" }}
                >
                  <div className="px-4 py-3 space-y-3">
                    {/* Embedding source */}
                    <div>
                      <div className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        {t("semantic.embedSource")}
                      </div>
                      <div
                        className="flex rounded-[var(--radius-sm)] border overflow-hidden"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {([
                          { id: "ollama", label: t("semantic.providerLocal") },
                          { id: "openai", label: "OpenAI" },
                          { id: "gemini", label: "Gemini" },
                        ] as const).map((opt) => {
                          const active = embedProvider === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleProvider(opt.id)}
                              className="flex-1 text-[11px] font-medium py-1.5 transition-colors"
                              style={{
                                background: active ? "var(--accent)" : "transparent",
                                color: active ? "var(--bg-primary)" : "var(--text-secondary)",
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      {cloudKeyMissing && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" style={{ color: "var(--danger)" }} />
                          <span className="text-[10px]" style={{ color: "var(--danger)" }}>
                            {embedProvider === "gemini" ? "Gemini" : "OpenAI"} {t("semantic.keyMissing")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Embedding model — recommended presets (quality labelled). */}
                    {(() => {
                      const models =
                        embedProvider === "openai"
                          ? OPENAI_EMBED_MODELS
                          : embedProvider === "gemini"
                            ? GEMINI_EMBED_MODELS
                            : OLLAMA_EMBED_MODELS;
                      const isKnown = models.some((m) => m.id === embedModel);
                      return (
                        <div>
                          <div className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                            {t("semantic.modelLabel")}
                          </div>
                          <select
                            value={embedModel}
                            onChange={(e) => handleModel(e.target.value)}
                            className="w-full text-[11px] rounded-[var(--radius-sm)] border px-2 py-1.5 outline-none"
                            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                          >
                            {models.map((m) => (
                              <option key={m.id} value={m.id}>{t(m.label as TranslationKey)}</option>
                            ))}
                            {!isKnown && <option value={embedModel}>{embedModel} ({t("semantic.modelCustom")})</option>}
                          </select>
                          <p className="text-[10px] leading-relaxed mt-1" style={{ color: "var(--text-muted)" }}>
                            {embedProvider === "openai"
                              ? t("semantic.modelHelpOpenai")
                              : embedProvider === "gemini"
                                ? t("semantic.modelHelpGemini")
                                : t("semantic.modelHelpLocal")}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Index document content toggle */}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={embedIndexDocuments}
                          onChange={(e) => handleIndexDocuments(e.target.checked)}
                          className="h-3.5 w-3.5 flex-shrink-0"
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                          {t("semantic.indexDocuments")}
                        </span>
                      </label>
                      <p className="text-[10px] leading-relaxed mt-1 ml-5" style={{ color: "var(--text-muted)" }}>
                        {t("semantic.indexDocumentsHelp")}
                      </p>
                    </div>

                    {/* Chunk size — only relevant when document indexing is on */}
                    {embedIndexDocuments && (
                      <div>
                        <div className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                          {t("semantic.chunkSize")}
                        </div>
                        <select
                          value={embedChunkSize}
                          onChange={(e) => handleChunkSize(Number(e.target.value))}
                          className="w-full text-[11px] rounded-[var(--radius-sm)] border px-2 py-1.5 outline-none"
                          style={{
                            background: "var(--bg-secondary)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          <option value={600}>{t("semantic.chunkSmall")} (600)</option>
                          <option value={1200}>{t("semantic.chunkMedium")} (1200)</option>
                          <option value={2000}>{t("semantic.chunkLarge")} (2000)</option>
                        </select>
                        <p className="text-[10px] leading-relaxed mt-1" style={{ color: "var(--text-muted)" }}>
                          {t("semantic.chunkHelp")}
                        </p>
                      </div>
                    )}

                    {/* Cross-document: exclude the active document from results */}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={excludeActiveDoc}
                          onChange={(e) => setExcludeActiveDoc(e.target.checked)}
                          className="h-3.5 w-3.5 flex-shrink-0"
                          style={{ accentColor: "var(--accent)" }}
                        />
                        <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                          {t("semantic.excludeActive")}
                        </span>
                      </label>
                      <p className="text-[10px] leading-relaxed mt-1 ml-5" style={{ color: "var(--text-muted)" }}>
                        {t("semantic.excludeActiveHelp")}
                      </p>
                    </div>

                    {/* Clear index */}
                    <button
                      onClick={() => void handleClearIndex()}
                      disabled={!activeProjectId || clearing}
                      className="w-full text-[11px] font-medium py-1.5 rounded-[var(--radius-sm)] border flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "transparent" }}
                    >
                      {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      {clearing ? t("semantic.clearing") : t("semantic.clearIndex")}
                    </button>

                    <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {t("semantic.changeWarning")}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search input */}
            <div className="px-4 pt-3 pb-2 flex-shrink-0">
              <div
                className="flex items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-2"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                {searching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                ) : (
                  <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                )}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runSearch(query);
                    }
                  }}
                  placeholder={t("semantic.searchPlaceholder")}
                  className="flex-1 bg-transparent text-[12px] outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
            </div>

            {/* Index status row */}
            <div
              className="px-4 py-2 flex items-center gap-2 border-b flex-shrink-0"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <Database className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <span className="text-[11px] flex-1" style={{ color: "var(--text-secondary)" }}>
                {indexed}/{total} {t("semantic.indexed")}
              </span>
              {!fullyIndexed && total > 0 && (
                <button
                  onClick={handleIndex}
                  disabled={isIndexing}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-[var(--radius-sm)] disabled:opacity-50 transition-opacity flex items-center gap-1.5"
                  style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
                >
                  {isIndexing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {t("semantic.indexBtn")}
                </button>
              )}
            </div>

            {/* Progress bar while indexing */}
            {isIndexing && (
              <div className="h-[3px] w-full flex-shrink-0" style={{ background: "var(--surface)" }}>
                <motion.div
                  className="h-full"
                  style={{ background: "var(--accent)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Error state (Ollama unreachable / embedding failure) */}
              {isError && (
                <div className="m-4 rounded-[var(--radius-md)] border p-3" style={{ borderColor: "var(--danger)", background: "var(--surface)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" style={{ color: "var(--danger)" }} />
                    <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                      {t("semantic.embedError")}
                    </span>
                  </div>
                  {lastError && (
                    <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      {lastError}
                    </p>
                  )}
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {t("semantic.ollamaHint")}
                  </p>
                </div>
              )}

              {/* Empty: no indexable segments */}
              {!isError && total === 0 && (
                <p className="text-[12px] text-center px-6 mt-12 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {t("semantic.noContent")}
                </p>
              )}

              {/* Not yet indexed — REQUIRED before search / "find similar" can
                  return anything. Shown even after a search so the user isn't
                  misled by an empty "no results". */}
              {!isError && total > 0 && !hasIndex && (
                <div
                  className="m-4 rounded-[var(--radius-md)] border p-4 text-center"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-subtle)" }}
                >
                  <Database className="h-5 w-5 mx-auto mb-2" style={{ color: "var(--accent)" }} />
                  <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                    {t("semantic.indexRequiredTitle")}
                  </p>
                  <p className="text-[11px] leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                    {t("semantic.indexRequiredBody")} ({total} {t("semantic.itemsSuffix")})
                  </p>
                  <button
                    onClick={handleIndex}
                    disabled={isIndexing}
                    className="text-[12px] font-medium px-3 py-1.5 rounded-[var(--radius-sm)] disabled:opacity-50 inline-flex items-center gap-1.5"
                    style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
                  >
                    {isIndexing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {t("semantic.indexBtn")} ({total})
                  </button>
                </div>
              )}

              {/* Partially indexed — results may be incomplete. */}
              {!isError && hasIndex && indexed < total && !isIndexing && (
                <div
                  className="mx-3 mt-3 rounded-[var(--radius-sm)] border p-2.5 flex items-center gap-2"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                  <span className="text-[11px] flex-1" style={{ color: "var(--text-secondary)" }}>
                    {total - indexed} {t("semantic.partialNotIndexed")}
                  </span>
                  <button
                    onClick={handleIndex}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-[var(--radius-xs)] flex-shrink-0"
                    style={{ background: "var(--accent)", color: "var(--bg-primary)" }}
                  >
                    {t("semantic.indexAll")}
                  </button>
                </div>
              )}

              {/* Searched but no results — only meaningful once something is
                  indexed (otherwise the "index required" callout above shows). */}
              {!isError && searched && !searching && results.length === 0 && hasIndex && (
                <p className="text-[12px] text-center px-6 mt-12 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {t("semantic.noResults")}
                </p>
              )}

              {/* Results list */}
              {!isError && results.length > 0 && (
                <div className="p-3 space-y-2">
                  {results.map((item) => {
                    const doc = docMap.get(item.documentId);
                    const pct = Math.round(item.score * 100);
                    const seg = item.segmentId ? segmentMap.get(item.segmentId) : undefined;
                    const segCodes = (seg?.codeIds ?? [])
                      .map((id) => codeMap.get(id))
                      .filter((c): c is NonNullable<typeof c> => !!c);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleResultClick(item)}
                        className="w-full text-left rounded-[var(--radius-md)] border p-2.5 transition-colors hover:border-[var(--accent)]"
                        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-xs)]"
                            style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
                          >
                            🎯 {pct}%
                          </span>
                          <span
                            className="text-[9px] uppercase tracking-wide px-1 py-0.5 rounded-[var(--radius-xs)] flex-shrink-0"
                            style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                          >
                            {item.kind === "segment" ? t("semantic.badgeSegment") : t("semantic.badgeDocument")}
                          </span>
                          {doc && (
                            <span className="text-[11px] font-medium truncate" style={{ color: "var(--text-secondary)" }}>
                              {doc.name}
                            </span>
                          )}
                        </div>
                        <p
                          className="text-[12px] leading-relaxed"
                          style={{
                            color: "var(--text-primary)",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.text}
                        </p>
                        {segCodes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {segCodes.map((c) => (
                              <span
                                key={c.id}
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: `${c.color}22`, color: c.color, border: `1px solid ${c.color}44` }}
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
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
