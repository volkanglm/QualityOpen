import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import {
  FolderOpen,
  FileText,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Mic,
  FileImage,
  Film,
  Image,
  Trash2,
  Pencil,
  Settings,
  BarChart2,
  Upload,
} from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useAuthStore } from "@/store/auth.store";
import { useSettingsStore } from "@/store/settings.store";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { importFile, getFileCategory, ACCEPTED_EXTENSIONS } from "@/lib/fileImport";
import { useT } from "@/hooks/useT";
import type { Document } from "@/types";

const DOC_ICONS = {
  interview: Mic,
  fieldnote: FileText,
  document: FileText,
  memo: FileImage,
  video: Film,
  image: Image,
} as const;

const DOC_COLORS = {
  interview: "var(--code-1)",
  fieldnote: "var(--code-2)",
  document: "var(--code-4)",
  memo: "var(--code-5)",
  video: "var(--code-3)",
  image: "var(--code-6)",
} as const;

export function LeftPanel() {
  const {
    activeProjectId,
    activeDocumentId,
    activeView,
    setActiveProject,
    setActiveDocument,
    setActiveView,
  } = useAppStore();
  const { getProvider } = useSettingsStore();

  const { projects, documents, createProject, createDocument, deleteDocument } =
    useProjectStore();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [newProjectModal, setNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newDocModal, setNewDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState<Document["type"]>("interview");
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useT();

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setActiveProject(id);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const p = createProject(newProjectName.trim());
    setExpandedProjects((s) => new Set(s).add(p.id));
    setActiveProject(p.id);
    setNewProjectName("");
    setNewProjectModal(false);
  };

  const handleCreateDoc = () => {
    if (!activeProjectId || !newDocName.trim()) return;
    const doc = createDocument(activeProjectId, newDocName.trim(), newDocType);
    setActiveDocument(doc.id);
    setActiveView("coding");
    setNewDocName("");
    setNewDocModal(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;
    setImporting(true);
    try {
      const cat = getFileCategory(file);
      const docType = cat === "video" ? "video" : cat === "image" ? "image" : "document";
      const imported = await importFile(file);
      const newDoc = createDocument(activeProjectId, imported.name || file.name, docType);

      // Local Sync: Copy original file to local folder if configured
      const { localFolderPath } = useAuthStore.getState();
      if (localFolderPath) {
        try {
          const { copyDocumentToLocal } = await import("@/lib/localSync");
          const category = cat === "video" ? "video" : cat === "image" ? "image" : "document";
          await copyDocumentToLocal(localFolderPath, file.name, imported.content, category);
        } catch (err) {
          console.warn("[LocalSync] Failed to copy source to local:", err);
        }
      }

      // Update the new doc with the imported content
      const { updateDocument } = useProjectStore.getState();
      updateDocument(newDoc.id, {
        content: imported.content,
        format: imported.format,
        wordCount: imported.wordCount,
      });
      setActiveDocument(newDoc.id);
      setActiveView("coding");
      // Expand the project in explorer
      setExpandedProjects((s) => new Set(s).add(activeProjectId));
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openDoc = (doc: Document) => {
    setActiveDocument(doc.id);
    setActiveView("coding");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Panel header ── */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <Tooltip content="New document" side="bottom">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              disabled={!activeProjectId}
              onClick={() => setNewDocModal(true)}
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
          <Tooltip content="New project" side="bottom">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setNewProjectModal(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── Tree body ── */}
      <div className="flex-1 overflow-y-auto py-1">
        {projects.length === 0 ? (
          <EmptyState onNew={() => setNewProjectModal(true)} />
        ) : (
          projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const isActive = project.id === activeProjectId;
            const docs = documents.filter((d) => d.projectId === project.id);

            return (
              <div key={project.id}>
                {/* Project row */}
                <div
                  className={cn(
                    "group flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] mx-1 cursor-pointer transition-colors",
                    isActive
                      ? "bg-[var(--accent-subtle)]"
                      : "hover:bg-[var(--surface-hover)]"
                  )}
                  onClick={() => toggleProject(project.id)}
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                  >
                    <ChevronRight
                      className="h-3 w-3 flex-shrink-0"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </motion.div>

                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color ?? "var(--accent)" }}
                  />

                  <span
                    className="flex-1 text-xs font-medium truncate"
                    style={{ color: isActive ? "var(--accent)" : "var(--text-primary)" }}
                  >
                    {project.name}
                  </span>

                  <span
                    className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {docs.length}
                  </span>
                </div>

                {/* Document list */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="docs"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      {docs.length === 0 ? (
                        <div className="pl-7 pr-2 py-1">
                          <button
                            className="text-[11px] transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            onClick={() => setNewDocModal(true)}
                          >
                            + Add document
                          </button>
                        </div>
                      ) : (
                        docs.map((doc) => {
                          const Icon = DOC_ICONS[doc.type as keyof typeof DOC_ICONS] ?? FileText;
                          const color = DOC_COLORS[doc.type as keyof typeof DOC_COLORS] ?? "var(--text-muted)";
                          const isDocActive = doc.id === activeDocumentId;

                          return (
                            <div
                              key={doc.id}
                              className={cn(
                                "group/doc flex items-center gap-2 pl-7 pr-2 py-1.5 mx-1 rounded-[var(--radius-sm)] cursor-pointer transition-colors",
                                isDocActive
                                  ? "bg-[var(--accent-subtle)]"
                                  : "hover:bg-[var(--surface-hover)]"
                              )}
                              onClick={() => openDoc(doc)}
                            >
                              <Icon
                                className="h-3 w-3 flex-shrink-0"
                                style={{ color }}
                              />
                              <span
                                className="flex-1 text-[12px] truncate"
                                style={{
                                  color: isDocActive ? "var(--accent)" : "var(--text-secondary)",
                                }}
                              >
                                {doc.name}
                              </span>

                              {/* Context menu trigger */}
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                  className={cn(
                                    "h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover/doc:opacity-100 transition-opacity",
                                    contextMenu === doc.id && "opacity-100"
                                  )}
                                  style={{ color: "var(--text-muted)" }}
                                  onClick={() =>
                                    setContextMenu(contextMenu === doc.id ? null : doc.id)
                                  }
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </button>
                                <AnimatePresence>
                                  {contextMenu === doc.id && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.9 }}
                                      transition={{ duration: 0.1 }}
                                      className="absolute right-0 top-5 z-50 rounded-[var(--radius-md)] border p-1 min-w-[140px] shadow-lg"
                                      style={{
                                        background: "var(--bg-secondary)",
                                        borderColor: "var(--border)",
                                        boxShadow: "var(--float-shadow)",
                                      }}
                                    >
                                      <ContextItem
                                        icon={<Pencil className="h-3 w-3" />}
                                        label="Open"
                                        onClick={() => { openDoc(doc); setContextMenu(null); }}
                                      />
                                      <ContextItem
                                        icon={<Trash2 className="h-3 w-3" />}
                                        label="Delete"
                                        danger
                                        onClick={() => { deleteDocument(doc.id); setContextMenu(null); }}
                                      />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}

        {/* Import section */}
        <div className="mt-3 px-3">
          <div
            className="flex items-center justify-between py-1"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-widest">
              {t("center.import")}
            </span>
            <Tooltip content={t("center.import")} side="right">
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                disabled={!activeProjectId || importing}
                onClick={() => fileInputRef.current?.click()}
              >
                {importing
                  ? <Upload className="h-3 w-3 animate-pulse" />
                  : <Plus className="h-3 w-3" />
                }
              </Button>
            </Tooltip>
          </div>
          <button
            className="w-full mt-1 flex items-center gap-2 rounded-[var(--radius-sm)] border border-dashed px-2 py-1.5 text-[11px] transition-colors"
            style={{
              borderColor: "var(--border)",
              color: activeProjectId ? "var(--text-muted)" : "var(--text-disabled)",
              cursor: activeProjectId ? "pointer" : "not-allowed",
            }}
            disabled={!activeProjectId || importing}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={(e) => {
              if (activeProjectId)
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
          >
            <Upload className="h-3 w-3 flex-shrink-0" />
            <span>.txt · .docx · .pdf · video · görsel</span>
          </button>
          {!activeProjectId && (
            <p className="text-[10px] mt-1 pl-1" style={{ color: "var(--text-disabled)" }}>
              {t("left.noProjects")}
            </p>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      {/* ── Settings / API nav footer ── */}
      <div
        className="flex-shrink-0 border-t px-2 py-1.5 flex flex-col gap-0.5"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <NavFooterItem
          icon={<BarChart2 className="h-3.5 w-3.5" />}
          label={t("nav.analysis")}
          active={activeView === "analysis"}
          onClick={() => setActiveView("analysis")}
        />
        <NavFooterItem
          icon={<Settings className="h-3.5 w-3.5" />}
          label={t("nav.settings")}
          active={activeView === "settings"}
          hasIndicator={!!getProvider()}
          onClick={() => setActiveView("settings")}
        />
      </div>

      {/* New Project Modal */}
      <Modal open={newProjectModal} onClose={() => setNewProjectModal(false)} title="New Project">
        <div className="space-y-4">
          <Input
            label="Project name"
            placeholder="e.g. Interview Study 2025"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setNewProjectModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Document Modal */}
      <Modal open={newDocModal} onClose={() => setNewDocModal(false)} title="New Document">
        <div className="space-y-4">
          <Input
            label="Document name"
            placeholder="e.g. Interview with P01"
            value={newDocName}
            onChange={(e) => setNewDocName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateDoc()}
            autoFocus
          />
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Type
            </label>
            <div className="flex flex-wrap gap-2">
              {(["interview", "fieldnote", "document", "memo", "video", "image"] as Document["type"][]).map((t) => {
                const color = DOC_COLORS[t as keyof typeof DOC_COLORS] ?? "var(--text-muted)";
                return (
                  <button
                    key={t}
                    onClick={() => setNewDocType(t)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs capitalize font-medium transition-all border",
                      newDocType === t ? "border-transparent" : "border-[var(--border)]"
                    )}
                    style={
                      newDocType === t
                        ? {
                          background: `${color}22`,
                          color: color,
                          borderColor: `${color}44`,
                        }
                        : { color: "var(--text-secondary)" }
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setNewDocModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateDoc} disabled={!newDocName.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ContextItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-[12px] transition-colors"
      style={{
        color: danger ? "var(--danger)" : "var(--text-secondary)",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = danger
          ? "var(--danger-subtle)"
          : "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function NavFooterItem({
  icon,
  label,
  active,
  hasIndicator,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  hasIndicator?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] transition-colors text-left"
      style={{
        background: active ? "var(--accent-subtle)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {icon}
      <span className="flex-1 text-[12px] font-medium truncate">{label}</span>
      {hasIndicator && (
        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "var(--code-2)" }} />
      )}
    </button>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
      <div
        className="h-10 w-10 rounded-[var(--radius-sm)] flex items-center justify-center"
        style={{ background: "var(--surface)" }}
      >
        <FolderOpen className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        No projects yet
      </p>
      <Button variant="outline" size="sm" onClick={onNew}>
        <Plus className="h-3.5 w-3.5" />
        New project
      </Button>
    </div>
  );
}
