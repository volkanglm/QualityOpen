import { useState, useMemo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { FileText, Plus, Search, Upload, MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FilterBar, type FilterChip } from "@/components/ui/FilterBar";
import { cn, formatDate, countWords, truncate } from "@/lib/utils";
import type { Document } from "@/types";

const DOC_TYPES: { value: Document["type"]; label: string; color: string }[] = [
  { value: "interview", label: "Interview", color: "#a78bfa" },
  { value: "fieldnote", label: "Field Note", color: "#6ee7b7" },
  { value: "document", label: "Document", color: "#93c5fd" },
  { value: "memo", label: "Memo", color: "#fcd34d" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 28 } },
};

export function DocumentsPage() {
  const { activeProjectId, setActiveView, setActiveDocument } = useAppStore();
  const { documents, createDocument, deleteDocument } = useProjectStore();

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [newDocModal, setNewDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState<Document["type"]>("document");
  const [contextMenuDoc, setContextMenuDoc] = useState<string | null>(null);

  const allProjectDocs = documents.filter((d) => d.projectId === activeProjectId);

  // Build filter field definitions from actual data
  const filterFields = useMemo(() => {
    const types = [...new Set(allProjectDocs.map((d) => d.type))];
    const tags = [...new Set(allProjectDocs.flatMap((d) => d.tags))];
    return [
      { key: "type", label: "Tür", values: types },
      ...(tags.length > 0 ? [{ key: "tags", label: "Etiket", values: tags }] : []),
    ];
  }, [allProjectDocs]);

  const projectDocs = allProjectDocs
    .filter(
      (d) =>
        !search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.content.toLowerCase().includes(search.toLowerCase())
    )
    .filter((d) => {
      if (filters.length === 0) return true;
      return filters.every((f) => {
        if (f.field === "type") {
          return f.operator === "equals" ? d.type === f.value
            : f.operator === "not_equals" ? d.type !== f.value
              : d.type.includes(f.value);
        }
        if (f.field === "tags") {
          return f.operator === "equals" ? d.tags.includes(f.value)
            : f.operator === "not_equals" ? !d.tags.includes(f.value)
              : d.tags.some((t) => t.includes(f.value));
        }
        return true;
      });
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const handleCreate = () => {
    if (!activeProjectId || !newDocName.trim()) return;
    createDocument(activeProjectId, newDocName.trim(), newDocType);
    setNewDocName("");
    setNewDocType("document");
    setNewDocModal(false);
  };

  const openDoc = (doc: Document) => {
    setActiveDocument(doc.id);
    setActiveView("coding");
  };

  if (!activeProjectId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
        <div className="h-16 w-16 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center">
          <FileText className="h-8 w-8 text-[var(--color-text-muted)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">No project selected</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Create or select a project from the sidebar to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-[var(--color-text-primary)]">Documents</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {projectDocs.length} document{projectDocs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
          <Button variant="primary" size="sm" onClick={() => setNewDocModal(true)}>
            <Plus className="h-3.5 w-3.5" />
            New document
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="px-6 py-3 border-b border-[var(--color-border-subtle)] space-y-2">
        <Input
          placeholder="Search documents…"
          icon={<Search className="h-3.5 w-3.5" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterBar
          fields={filterFields}
          filters={filters}
          onChange={setFilters}
        />
      </div>

      {/* Document Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {projectDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="h-12 w-12 rounded-xl bg-[var(--color-surface)] flex items-center justify-center">
              <FileText className="h-5 w-5 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {search ? "No documents match your search" : "No documents yet"}
            </p>
            {!search && (
              <Button variant="outline" size="sm" onClick={() => setNewDocModal(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add your first document
              </Button>
            )}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
          >
            {projectDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onOpen={openDoc}
                onDelete={() => deleteDocument(doc.id)}
                isMenuOpen={contextMenuDoc === doc.id}
                onMenuToggle={() =>
                  setContextMenuDoc(contextMenuDoc === doc.id ? null : doc.id)
                }
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* New Document Modal */}
      <Modal open={newDocModal} onClose={() => setNewDocModal(false)} title="New Document">
        <div className="space-y-4">
          <Input
            label="Document name"
            placeholder="e.g. Interview with P01"
            value={newDocName}
            onChange={(e) => setNewDocName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Type</label>
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setNewDocType(t.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                    newDocType === t.value
                      ? "border-transparent"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)] bg-transparent"
                  )}
                  style={
                    newDocType === t.value
                      ? { backgroundColor: `${t.color}22`, color: t.color, borderColor: `${t.color}44` }
                      : {}
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setNewDocModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newDocName.trim()}>
              Create document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DocumentCard({
  doc,
  onOpen,
  onDelete,
  isMenuOpen,
  onMenuToggle,
}: {
  doc: Document;
  onOpen: (doc: Document) => void;
  onDelete: () => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}) {
  const typeInfo = DOC_TYPES.find((t) => t.value === doc.type) ?? DOC_TYPES[2];
  const words = doc.wordCount ?? countWords(doc.content);

  return (
    <motion.div
      variants={itemVariants}
      layout
      className="group relative rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 cursor-pointer hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
      onClick={() => onOpen(doc)}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${typeInfo.color}18` }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: typeInfo.color }} />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{doc.name}</p>
        </div>
        <div className="no-drag relative" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={onMenuToggle}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -4 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 top-8 z-10 rounded-[var(--radius-md)] border p-1 min-w-[140px]"
                style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", boxShadow: "var(--float-shadow)" }}
              >
                <button
                  className="w-full flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  onClick={() => onOpen(doc)}
                >
                  <Edit3 className="h-3 w-3" />
                  Open in editor
                </button>
                <button
                  className="w-full flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-[#fca5a5] hover:bg-[#fca5a510] transition-colors mt-0.5"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Preview */}
      <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 min-h-[2.5rem]">
        {doc.content ? truncate(doc.content, 120) : "No content yet…"}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <Badge color={typeInfo.color}>{typeInfo.label}</Badge>
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
          <span>{words} words</span>
          <span>·</span>
          <span>{formatDate(doc.updatedAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}
