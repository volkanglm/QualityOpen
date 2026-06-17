import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, MessageSquare, Square } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useSettingsStore } from "@/store/settings.store";
import { useT } from "@/hooks/useT";
import { streamAi, isActiveProviderLocal } from "@/lib/ai";
import { useToastStore } from "@/store/toast.store";
import { PrivacyBadge } from "@/components/common/PrivacyBadge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function uuid() { return crypto.randomUUID(); }

export function AiChatPanel() {
  const { chatOpen, setChatOpen, activeDocumentId, activeProjectId } = useAppStore();
  const { documents, segments, codes } = useProjectStore();
  // Subscribe to provider-selection fields so the privacy badge recomputes
  // whenever the user switches providers in Settings.
  const defaultProvider = useSettingsStore((s) => s.defaultProvider);
  const t = useT();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Recomputed each render; `defaultProvider` dep above forces re-eval on switch.
  const providerIsLocal = useMemo(
    () => isActiveProviderLocal(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultProvider]
  );

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [chatOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Memoized context builder — only re-computes when docs/segments/codes/project changes
  const buildContext = useMemo(() => {
    const docs = activeDocumentId
      ? documents.filter((d) => d.id === activeDocumentId)
      : documents.filter((d) => d.projectId === activeProjectId).slice(0, 3);

    const projectCodes = codes.filter((c) => c.projectId === activeProjectId);
    // Build a Map for O(1) code lookups instead of repeated .filter()
    const codeMap = new Map(projectCodes.map((c) => [c.id, c.name]));

    const docContext = docs
      // Include any doc that has extracted text content (PDFs included), not just text/html.
      .filter((d) => typeof d.content === "string" && d.content.trim().length > 0)
      .map((d) => {
        const docSegs = segments
          .filter((s) => s.documentId === d.id && s.codeIds.length > 0)
          .map((s) => {
            const codeNames = s.codeIds.map((id) => codeMap.get(id) ?? id).join(", ");
            return `  [${codeNames}]: "${s.text}"`;
          });
        return `### ${t("chat.docLabel")} ${d.name}\n${d.content.slice(0, 3000)}${d.content.length > 3000 ? "\n…" : ""}${docSegs.length > 0 ? `\n\n${t("chat.segsLabel")}\n${docSegs.join("\n")}` : ""}`;
      })
      .join("\n\n---\n\n");

    return { docContext };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, segments, codes, activeDocumentId, activeProjectId]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const ctx = buildContext;

    setError(null);
    setInput("");
    const userMsg: Message = { id: uuid(), role: "user", content: text };
    const history = [...messages, userMsg];
    // `streamHistory` is the wire history (role/content only) the model sees.
    const streamHistory = history.map((m) => ({ role: m.role, content: m.content }));
    const assistantId = uuid();
    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setLoading(true);

    // The current document selection is the highest-priority context — the user
    // usually highlights a passage and then asks about it.
    const selText = useAppStore.getState().activeSelection?.text?.trim();
    const selPart = selText ? `Seçili metin / Selected excerpt:\n"${selText}"` : "";
    const docPart = ctx.docContext ? `${t("chat.contextLabel")}\n${ctx.docContext}` : "";
    const contextBlock = [selPart, docPart].filter(Boolean).join("\n\n") || t("chat.noContext");
    const systemPrompt = `${t("chat.systemPrompt")}

${contextBlock}`;

    const controller = new AbortController();
    abortRef.current = controller;

    const appendToken = (chunk: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: m.content + chunk } : m
        )
      );
    };

    try {
      const full = await streamAi(streamHistory, systemPrompt, appendToken, controller.signal);
      // Reconcile the final message with the resolved full text (covers
      // single-chunk cloud fallbacks and any partial/final mismatch).
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m))
      );
    } catch (err) {
      // Aborted via the Stop button: keep whatever partial text we streamed.
      if (err instanceof DOMException && err.name === "AbortError") {
        // no-op — partial assistant text stays as-is
      } else if (err instanceof Error && err.name === "AbortError") {
        // some providers throw a plain Error named AbortError
      } else {
        const msg = err instanceof Error ? err.message : t("chat.errorGeneric");
        setError(msg);
        useToastStore.getState().push(msg, "error");
        // Drop the empty placeholder so the user isn't left with a blank bubble.
        setMessages((prev) =>
          prev.filter((m) => !(m.id === assistantId && m.content === ""))
        );
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }, [input, loading, buildContext, messages, t]);

  const handleSend = useCallback(() => { sendMessage().catch(console.error); }, [sendMessage]);

  const handleStop = useCallback(() => { abortRef.current?.abort(); }, []);

  // Abort any in-flight stream when the panel unmounts.
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return (
    <AnimatePresence>
      {chatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          style={{
            position: "fixed",
            bottom: 0,
            right: 16,
            zIndex: 300,
            width: 380,
            maxHeight: "60vh",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderBottom: "none",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            boxShadow: "var(--float-shadow)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 border-b flex-shrink-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <MessageSquare className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
            <span
              className="text-[12px] font-semibold flex-1 flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}
            >
              {t("chat.title")}
              <PrivacyBadge isLocal={providerIsLocal} variant="compact" />
            </span>
            <button
              onClick={() => setMessages([])}
              className="text-[11px] transition-colors px-1.5"
              style={{ color: "var(--text-muted)" }}
              title={t("chat.clearTitle")}
            >
              {t("chat.clear")}
            </button>
            <button
              onClick={() => setChatOpen(false)}
              aria-label={t("common.close")}
              style={{ color: "var(--text-muted)" }}
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <p
                className="text-[11px] text-center mt-4 leading-relaxed whitespace-pre-line"
                style={{ color: "var(--text-muted)" }}
              >
                {t("chat.welcome")}
              </p>
            )}
            {messages.map((msg) => {
              // While streaming, the active assistant message is empty until the
              // first token arrives — show a spinner inside its bubble instead.
              const isEmptyAssistant = msg.role === "assistant" && msg.content === "";
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] rounded-[var(--radius-md)] px-3 py-2 text-[12px] leading-relaxed"
                    style={
                      msg.role === "user"
                        ? {
                          background: "var(--text-primary)",
                          color: "var(--bg-primary)",
                        }
                        : {
                          background: "var(--surface)",
                          color: "var(--text-primary)",
                          borderColor: "var(--border)",
                        }
                    }
                  >
                    {isEmptyAssistant ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        style={{ color: "var(--text-muted)" }}
                      />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              );
            })}
            {error && (
              <p
                className="text-[11px] px-2"
                style={{ color: "var(--danger)" }}
              >
                {error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="flex-shrink-0 p-2.5 border-t"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t("chat.placeholder")}
                rows={1}
                className="flex-1 text-[12px] rounded-[var(--radius-sm)] border px-2.5 py-2 outline-none resize-none"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                  minHeight: 32,
                  maxHeight: 96,
                }}
              />
              {loading ? (
                <button
                  onClick={handleStop}
                  aria-label="Stop"
                  title="Stop"
                  className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-sm)] flex-shrink-0 transition-opacity"
                  style={{
                    background: "var(--danger)",
                    color: "var(--bg-primary)",
                  }}
                >
                  <Square className="h-3 w-3" fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  aria-label={t("chat.sendLabel")}
                  className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-sm)] flex-shrink-0 disabled:opacity-40 transition-opacity"
                  style={{
                    background: "var(--text-primary)",
                    color: "var(--bg-primary)",
                  }}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
