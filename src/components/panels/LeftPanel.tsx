import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Settings,
  BarChart2,
  Upload,
  Download,
  Palette,
  FileUp,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useAuthStore } from "@/store/auth.store";
import { useSettingsStore } from "@/store/settings.store";
import { useToastStore } from "@/store/toast.store";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { importFile, getFileCategory, ACCEPTED_EXTENSIONS } from "@/lib/fileImport";
import type { Document } from "@/types";

const DOC_COLORS = {
  interview: "var(--code-1)",
  fieldnote: "var(--code-2)",
  document: "var(--code-4)",
  memo: "var(--code-5)",
  video: "var(--code-3)",
  image: "var(--code-6)",
} as const;

/** Colors available in the document color picker */
const DOC_COLOR_PALETTE = [
  "#a78bfa", "#6ee7b7", "#fca5a5", "#93c5fd", "#fcd34d", "#f9a8d4",
  "#86efac", "#7dd3fc", "#c4b5fd", "#a5f3fc", "#fed7aa", "#bbf7d0",
];

export function LeftPanel() {
  const {
    activeProjectId,
    activeDocumentId,
    activeView,
    setActiveProject,
    setActiveDocument,
    setActiveView,
  } = useAppStore();
  const t = useT();
  const { getProvider } = useSettingsStore();

  const { projects, documents, segments, createProject, createDocument, deleteDocument, updateDocument, updateProject } =
    useProjectStore();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [newProjectModal, setNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newDocModal, setNewDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState<Document["type"]>("interview");
  const [contextMenu, setContextMenu] = useState<{ id: string; type: "project" | "doc" } | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [renameId, setRenameId] = useState<{ id: string; type: "project" | "doc" } | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [colorPickerDoc, setColorPickerDoc] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pushToast = useToastStore((s) => s.push);

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
      const msg = err instanceof Error ? err.message : "Import failed";
      pushToast(msg, "error");
    } finally {
      setImporting(false);
      setIsDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!activeProjectId || importing) return;

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Trigger the same logic as handleImportFile but with a mock event-like approach
    // or just call a helper. Let's just pass the file to a helper.
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setImporting(true);
    try {
      const cat = getFileCategory(file);
      const docType = cat === "video" ? "video" : cat === "image" ? "image" : "document";
      const imported = await importFile(file);
      const newDoc = createDocument(activeProjectId!, imported.name || file.name, docType);

      const { localFolderPath } = useAuthStore.getState();
      if (localFolderPath) {
        try {
          const { copyDocumentToLocal } = await import("@/lib/localSync");
          await copyDocumentToLocal(localFolderPath, file.name, imported.content, docType);
        } catch (err) {
          console.warn("[LocalSync] Failed to copy source to local:", err);
        }
      }

      updateDocument(newDoc.id, {
        content: imported.content,
        format: imported.format,
        wordCount: imported.wordCount,
      });
      setActiveDocument(newDoc.id);
      setActiveView("coding");
      setExpandedProjects((s) => new Set(s).add(activeProjectId!));
    } catch (err) {
      console.error("Import failed:", err);
      const msg = err instanceof Error ? err.message : "Import failed";
      pushToast(msg, "error");
    } finally {
      setImporting(false);
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
          {t("left.explorer")}
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
          <Tooltip content={t('left.newProject')} side="bottom">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewProjectModal(true)}
              className="h-8 w-8 p-0"
              title={t('left.newProject')}
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
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ id: project.id, type: "project" });
                    setContextMenuPos({ x: e.clientX, y: e.clientY });
                  }}
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <ChevronRight
                      className="h-3 w-3 flex-shrink-0"
                      style={{ color: "var(--text-muted)" }}
                    />
                  </motion.div>

                  {isExpanded ? (
                    <FolderOpen className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <Folder className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                  )}

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

                <AnimatePresence>
                  {contextMenu?.id === project.id && contextMenu?.type === "project" && contextMenuPos && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.1 }}
                      className="fixed z-[999] rounded-lg border p-1.5 min-w-[180px] shadow-xl"
                      style={{
                        left: contextMenuPos.x,
                        top: contextMenuPos.y,
                        background: "#1c1c1e",
                        borderColor: "#333",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
                      }}
                    >
                      <ContextItem
                        icon={<Pencil className="h-3 w-3" />}
                        label={t('left.rename')}
                        onClick={() => {
                          setRenameId({ id: project.id, type: "project" });
                          setRenameVal(project.name);
                          setContextMenu(null);
                          setContextMenuPos(null);
                        }}
                      />
                      <div className="h-px my-1" style={{ background: "#333" }} />
                      <ContextItem
                        icon={<Trash2 className="h-3 w-3" />}
                        label={t('left.deleteProject')}
                        danger
                        onClick={() => {
                          const { deleteProject } = useProjectStore.getState();
                          deleteProject(project.id);
                          setContextMenu(null);
                          setContextMenuPos(null);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Document list */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="docs"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                    >
                      {docs.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                          className="mx-2 mt-1 mb-2 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-4 px-3 cursor-pointer transition-all text-center"
                          style={{
                            borderColor: "var(--border)",
                            background: "var(--bg-primary)",
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-active, var(--text-muted))";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                          }}
                        >
                          <FileUp className="h-5 w-5" style={{ color: "var(--text-muted)", opacity: 0.7 }} />
                          <p className="text-[11px] leading-tight" style={{ color: "var(--text-muted)" }}>
                            {t("left.dropFiles")}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--text-disabled)" }}>
                            {t("left.orClick")}
                          </p>
                        </motion.div>
                      ) : (
                        docs.map((doc) => {
                          const isDocActive = doc.id === activeDocumentId;
                          const docSegmentCount = segments.filter((s) => s.documentId === doc.id).length;

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
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ id: doc.id, type: "doc" });
                                setContextMenuPos({ x: e.clientX, y: e.clientY });
                              }}
                            >
                              <FileText
                                className="h-4 w-4 flex-shrink-0"
                                style={{ color: "var(--text-muted)" }}
                              />
                              <span
                                className="flex-1 text-[12px] truncate"
                                style={{
                                  color: isDocActive ? "var(--accent)" : "var(--text-secondary)",
                                }}
                              >
                                {doc.name}
                              </span>
                              {docSegmentCount > 0 && (
                                <span
                                  className="text-[10px] tabular-nums flex-shrink-0"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  {docSegmentCount}
                                </span>
                              )}

                              {/* Context menu trigger */}
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                  className={cn(
                                    "h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover/doc:opacity-100 transition-opacity",
                                    contextMenu?.id === doc.id && contextMenu?.type === "doc" && "opacity-100"
                                  )}
                                  style={{ color: "var(--text-muted)" }}
                                  onClick={() =>
                                    setContextMenu(contextMenu?.id === doc.id ? null : { id: doc.id, type: "doc" })
                                  }
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </button>
                                <AnimatePresence>
                                  {contextMenu?.id === doc.id && contextMenu?.type === "doc" && contextMenuPos && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.9 }}
                                      transition={{ duration: 0.1 }}
                                      className="fixed z-[999] rounded-lg border p-1.5 min-w-[180px] shadow-xl"
                                      style={{
                                        left: contextMenuPos.x,
                                        top: contextMenuPos.y,
                                        background: "#1c1c1e",
                                        borderColor: "#333",
                                        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
                                      }}
                                    >
                                      <ContextItem
                                        icon={<Pencil className="h-3 w-3" />}
                                        label={t('left.rename')}
                                        onClick={() => {
                                          setRenameDocId(doc.id);
                                          setRenameVal(doc.name);
                                          setContextMenu(null);
                                          setContextMenuPos(null);
                                        }}
                                      />
                                      <ContextItem
                                        icon={<Download className="h-3 w-3" />}
                                        label="Dışa Aktar"
                                        onClick={() => {
                                          const blob = new Blob([doc.content], { type: "text/plain" });
                                          const a = document.createElement("a");
                                          a.href = URL.createObjectURL(blob);
                                          a.download = `${doc.name}.txt`;
                                          a.click();
                                          URL.revokeObjectURL(a.href);
                                          setContextMenu(null);
                                          setContextMenuPos(null);
                                        }}
                                      />
                                      <div className="h-px my-1" style={{ background: "#333" }} />
                                      <ContextItem
                                        icon={<Palette className="h-3 w-3" />}
                                        label="Belge Rengi Ata"
                                        onClick={() => {
                                          setColorPickerDoc(doc.id);
                                          setContextMenu(null);
                                          setContextMenuPos(null);
                                        }}
                                      />
                                      <div className="h-px my-1" style={{ background: "#333" }} />
                                      <ContextItem
                                        icon={<Trash2 className="h-3 w-3" />}
                                        label={t('left.deleteDocument')}
                                        danger
                                        onClick={() => {
                                          deleteDocument(doc.id);
                                          setContextMenu(null);
                                          setContextMenuPos(null);
                                        }}
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
          <div
            className={cn(
              "w-full mt-1 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-all duration-200",
              isDragging
                ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60",
              (!activeProjectId || importing) && "opacity-50 cursor-not-allowed"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              if (activeProjectId && !importing) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => activeProjectId && !importing && fileInputRef.current?.click()}
          >
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed rounded-xl m-4 transition-colors hover:border-blue-500/50 hover:bg-blue-500/5 bg-white/5 border-white/10 group cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileUp className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-white mb-1">{t('welcome.dragDrop')}</p>
              <p className="text-xs text-neutral-500">{t('welcome.selectDoc')}</p>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {t("left.supportedFiles")}
            </p>
          </div>
        </div>
        {!activeProjectId && (
          <p className="text-[10px] mt-2 text-center text-zinc-600">
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

      <Modal open={newProjectModal} onClose={() => setNewProjectModal(false)} title={t("common.newProject")}>
        <div className="space-y-4">
          <Input
            label={t("common.projectName")}
            placeholder="e.g. Interview Study 2025"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setNewProjectModal(false)}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              {t("common.create")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Document Modal */}
      <Modal open={newDocModal} onClose={() => setNewDocModal(false)} title={t("common.newDocument")}>
        <div className="space-y-4">
          <Input
            label={t("common.docName")}
            placeholder="e.g. Interview with P01"
            value={newDocName}
            onChange={(e) => setNewDocName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateDoc()}
            autoFocus
          />
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {t("common.type")}
            </label>
            <div className="flex flex-wrap gap-2">
              {(["interview", "fieldnote", "document", "memo", "video", "image"] as Document["type"][]).map((type) => {
                const color = DOC_COLORS[type as keyof typeof DOC_COLORS] ?? "var(--text-muted)";
                return (
                  <button
                    key={type}
                    onClick={() => setNewDocType(type)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs capitalize font-medium transition-all border",
                      newDocType === type ? "border-transparent" : "border-[var(--border)]"
                    )}
                    style={
                      newDocType === type
                        ? {
                          background: `${color}22`,
                          color: color,
                          borderColor: `${color}44`,
                        }
                        : { color: "var(--text-secondary)" }
                    }
                  >
                    {t(`left.type.${type}`)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setNewDocModal(false)}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={handleCreateDoc} disabled={!newDocName.trim()}>
              {t("common.create")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal open={!!renameId} onClose={() => setRenameId(null)} title={t("common.rename")}>
        <div className="space-y-4">
          <Input
            label={renameId?.type === "project" ? t("common.projectName") : t("common.docName")}
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameId && renameVal.trim()) {
                if (renameId.type === "project") {
                  updateProject(renameId.id, { name: renameVal.trim() });
                } else {
                  updateDocument(renameId.id, { name: renameVal.trim() });
                }
                setRenameId(null);
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenameId(null)}>{t("common.cancel")}</Button>
            <Button
              variant="primary"
              disabled={!renameVal.trim()}
              onClick={() => {
                if (renameId && renameVal.trim()) {
                  if (renameId.type === "project") {
                    updateProject(renameId.id, { name: renameVal.trim() });
                  } else {
                    updateDocument(renameId.id, { name: renameVal.trim() });
                  }
                  setRenameId(null);
                }
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Color Picker Modal */}
      <Modal open={!!colorPickerDoc} onClose={() => setColorPickerDoc(null)} title={t("common.color")}>
        <div className="space-y-3">
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {t("left.selectColor")}
          </p>
          <div className="grid grid-cols-6 gap-2">
            {DOC_COLOR_PALETTE.map((c) => (
              <motion.button
                key={c}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="h-7 w-7 rounded-full mx-auto"
                style={{
                  backgroundColor: c,
                  outline: documents.find((d) => d.id === colorPickerDoc)?.color === c
                    ? `2px solid ${c}`
                    : "2px solid transparent",
                  outlineOffset: "2px",
                }}
                onClick={() => {
                  if (colorPickerDoc) {
                    updateDocument(colorPickerDoc, { color: c });
                    setColorPickerDoc(null);
                  }
                }}
              />
            ))}
            {/* Clear color */}
            <button
              className="h-7 w-7 rounded-full mx-auto border-2 border-dashed flex items-center justify-center text-[10px]"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              onClick={() => {
                if (colorPickerDoc) {
                  updateDocument(colorPickerDoc, { color: undefined });
                  setColorPickerDoc(null);
                }
              }}
            >
              ✕
            </button>
          </div>
        </div>
      </Modal>

      {
        contextMenu && contextMenuPos && (
          <div
            className="fixed inset-0 z-[998]"
            onClick={() => { setContextMenu(null); setContextMenuPos(null); }}
          />
        )
      }
    </div >
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
