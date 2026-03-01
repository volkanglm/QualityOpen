import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import type { Code } from "@/types";

interface Props {
  x:            number;
  y:            number;
  codes:        Code[];
  selectedText: string;
  onSelect:     (code: Code) => void;
  onCreate:     (name: string) => void;
  onClose:      () => void;
}

export function ContextCodeMenu({
  x, y, codes, selectedText, onSelect, onCreate, onClose,
}: Props) {
  const [query,    setQuery]    = useState("");
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState("");
  const ref       = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const createRef = useRef<HTMLInputElement>(null);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => window.addEventListener("mousedown", handler), 60);
    return () => { clearTimeout(t); window.removeEventListener("mousedown", handler); };
  }, [onClose]);

  useEffect(() => {
    if (creating) createRef.current?.focus();
    else inputRef.current?.focus();
  }, [creating]);

  const filtered = codes.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  /* Clamp menu to viewport */
  const MENU_W = 228;
  const left   = Math.min(x, window.innerWidth  - MENU_W - 10);
  const top    = Math.min(y, window.innerHeight - 340);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.94, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4 }}
      transition={{ duration: 0.13, ease: [0.2, 0, 0, 1] }}
      style={{
        position:     "fixed",
        top,
        left,
        zIndex:       600,
        width:        MENU_W,
        background:   "var(--bg-secondary)",
        border:       "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        boxShadow:    "var(--float-shadow)",
      }}
    >
      {/* Preview of selected text */}
      <div
        className="px-3 pt-2.5 pb-2 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Kod Ata
        </p>
        <p
          className="text-[11px] mt-0.5 line-clamp-2 italic leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          "{selectedText.slice(0, 70)}{selectedText.length > 70 ? "…" : ""}"
        </p>
      </div>

      {/* Search */}
      <div className="px-2 pt-2 pb-1">
        <input
          ref={inputRef}
          autoFocus={!creating}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
          placeholder="Kod ara…"
          className="w-full h-6 px-2 text-[12px] rounded-[var(--radius-xs)] outline-none border"
          style={{
            color:       "var(--text-primary)",
            borderColor: "var(--border)",
            background:  "var(--surface)",
          }}
        />
      </div>

      {/* Code list */}
      <div className="max-h-[150px] overflow-y-auto py-0.5">
        {filtered.length === 0 ? (
          <p
            className="text-[11px] px-3 py-2"
            style={{ color: "var(--text-muted)" }}
          >
            {query ? `"${query}" bulunamadı` : "Henüz kod yok"}
          </p>
        ) : (
          filtered.map((code) => (
            <button
              key={code.id}
              onClick={() => { onSelect(code); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ background: code.color }}
              />
              <span className="text-[12px] flex-1 truncate">{code.name}</span>
            </button>
          ))
        )}
      </div>

      {/* Create new code */}
      <div
        className="border-t pt-1 pb-1.5 px-2"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {creating ? (
          <div className="flex items-center gap-1">
            <input
              ref={createRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  onCreate(newName.trim());
                  onClose();
                }
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
              placeholder="Kod adı…"
              className="flex-1 h-6 px-2 text-[12px] rounded-[var(--radius-xs)] outline-none border"
              style={{
                color:       "var(--text-primary)",
                borderColor: "var(--accent)",
                background:  "var(--surface)",
              }}
            />
            <button
              onClick={() => {
                if (newName.trim()) { onCreate(newName.trim()); onClose(); }
              }}
              disabled={!newName.trim()}
              className="h-6 w-6 flex items-center justify-center rounded-[var(--radius-xs)] flex-shrink-0 disabled:opacity-40 transition-opacity"
              style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
            >
              <Check className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setCreating(true); setQuery(""); }}
            className="w-full flex items-center gap-2 px-1 py-1 text-left rounded-[var(--radius-xs)] transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--surface-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <Plus className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-[12px]">Yeni Kod Oluştur</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
