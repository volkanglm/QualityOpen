import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Search, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Code } from "@/types";

interface CodeAssignPanelProps {
  selectionText: string;
  codes: Code[];
  onApply:  (code: Code) => void;
  onCreate: (name: string) => void;
  onClose:  () => void;
}

export function CodeAssignPanel({
  selectionText,
  codes,
  onApply,
  onCreate,
  onClose,
}: CodeAssignPanelProps) {
  const [search, setSearch]       = useState("");
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState("");

  const filtered = codes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    const name = newName.trim() || search.trim();
    if (!name) return;
    onCreate(name);
    setCreating(false);
    setNewName("");
    setSearch("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="flex-shrink-0 border-b px-4 py-3"
      style={{
        background:   "var(--bg-secondary)",
        borderColor:  "var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 min-w-0">
          <Tag
            className="h-3.5 w-3.5 mt-0.5 flex-shrink-0"
            style={{ color: "var(--accent)" }}
          />
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-muted)" }}>Coding: </span>
            <em style={{ color: "var(--text-primary)", fontStyle: "normal", fontWeight: 500 }}>
              "{selectionText.slice(0, 70)}{selectionText.length > 70 ? "…" : ""}"
            </em>
          </p>
        </div>
        <Button size="icon" variant="ghost" className="h-5 w-5 flex-shrink-0" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Search + create */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            autoFocus
            placeholder="Search codes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length === 0 && search.trim()) {
                setNewName(search.trim());
                setCreating(true);
              }
            }}
            className="w-full h-7 rounded-[var(--radius-sm)] border pl-7 pr-3 text-xs outline-none"
            style={{
              background:   "var(--bg-tertiary)",
              borderColor:  "var(--border)",
              color:        "var(--text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-[11px] flex-shrink-0"
          onClick={() => { setCreating(true); setNewName(search); }}
        >
          <Plus className="h-3 w-3" />
          New
        </Button>
      </div>

      {/* New code input */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mb-2 overflow-hidden"
          >
            <input
              autoFocus
              placeholder="Code name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1 h-7 rounded-[var(--radius-sm)] border px-3 text-xs outline-none"
              style={{
                background:   "var(--bg-tertiary)",
                borderColor:  "var(--accent)",
                color:        "var(--text-primary)",
                boxShadow:    "0 0 0 2px var(--accent-subtle)",
              }}
            />
            <Button
              size="sm"
              variant="primary"
              className="h-7 text-[11px] flex-shrink-0"
              onClick={handleCreate}
              disabled={!newName.trim()}
            >
              Create & apply
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => setCreating(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code chips */}
      <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto">
        {filtered.length === 0 && !creating ? (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {search
              ? `No codes match "${search}" — press Enter or click New`
              : "No codes yet. Click New to create one."}
          </p>
        ) : (
          filtered.map((code) => (
            <motion.button
              key={code.id}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              onClick={() => onApply(code)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                background:  `${code.color}20`,
                color:        code.color,
                border:       `1px solid ${code.color}40`,
              }}
            >
              {code.name}
            </motion.button>
          ))
        )}
      </div>
    </motion.div>
  );
}
