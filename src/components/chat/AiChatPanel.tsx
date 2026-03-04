import { useLicenseStore } from "@/store/license.store";

// ... inside AiChatPanel component
const { isPro, openModal } = useLicenseStore();

const sendMessage = async () => {
  if (!isPro) {
    openModal();
    return;
  }
  const text = input.trim();
// ...
            <span
              className="text-[12px] font-semibold flex-1"
              style={{ color: "var(--text-primary)" }}
            >
              {t("chat.title")}
              {!isPro && (
                <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-white font-bold tracking-wider">
                  PRO
                </span>
              )}
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
              style={{ color: "var(--text-muted)" }}
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div >

  {/* Messages */ }
  < div className = "flex-1 overflow-y-auto p-3 space-y-3 min-h-0" >
  {
    messages.length === 0 && (
      <p
        className="text-[11px] text-center mt-4 leading-relaxed whitespace-pre-line"
        style={{ color: "var(--text-muted)" }}
      >
        {t("chat.welcome")}
      </p>
    )
  }
{
  messages.map((msg) => (
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
        {msg.content}
      </div>
    </div>
  ))
}
{
  loading && (
    <div className="flex justify-start">
      <div
        className="rounded-[var(--radius-md)] px-3 py-2"
        style={{ background: "var(--surface)" }}
      >
        <Loader2
          className="h-3.5 w-3.5 animate-spin"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
    </div>
  )
}
{
  error && (
    <p
      className="text-[11px] px-2"
      style={{ color: "var(--danger)" }}
    >
      {error}
    </p>
  )
}
<div ref={bottomRef} />
          </div >

  {/* Input */ }
  < div
className = "flex-shrink-0 p-2.5 border-t"
style = {{ borderColor: "var(--border-subtle)" }}
          >
  <div className="flex items-end gap-2">
    <textarea
      ref={inputRef}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          void sendMessage();
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
    <button
      onClick={() => void sendMessage()}
      disabled={!input.trim() || loading}
      className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-sm)] flex-shrink-0 disabled:opacity-40 transition-opacity"
      style={{
        background: "var(--text-primary)",
        color: "var(--bg-primary)",
      }}
    >
      <Send className="h-3.5 w-3.5" />
    </button>
  </div>
          </div >
        </motion.div >
      )}
    </AnimatePresence >
  );
}
