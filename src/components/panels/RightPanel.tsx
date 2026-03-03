import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Tag,
  Plus,
  ChevronRight,
  Hash,
  Trash2,
  GripVertical,
  Pencil,
  Check,
  X,
  Palette,
  Info,
  FileText,
} from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { CODE_COLORS } from "@/lib/constants";
import type { Code, Segment } from "@/types";
import { flattenCodes, FlatCode } from "@/lib/tree";

// ─── Constants ────────────────────────────────────────────────────────────────
const INDENT_W = 16; // px per depth level
const MAX_DEPTH = 3;  // 0-indexed → max L4
const LEVEL_LABELS = ["L1", "L2", "L3", "L4"] as const;


/** Compute where the dragged code would land given cursor x-offset. */
function getProjection(
  items: FlatCode[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
  position: "before" | "after",
): { parentId: string | undefined; depth: number; position: "before" | "after" } {
  const overIdx = items.findIndex((i) => i.id === overId);
  const activeIdx = items.findIndex((i) => i.id === activeId);
  const activeItem = items[activeIdx];
  if (!activeItem || overIdx === -1) return { parentId: undefined, depth: 0, position };

  // Stable depth calculation
  const depthChange = Math.round(dragOffsetX / INDENT_W);
  const rawDepth = activeItem.depth + depthChange;

  // Max allowed depth calculation
  let prevIdx = position === "before" ? overIdx - 1 : overIdx;
  while (prevIdx >= 0 && items[prevIdx].id === activeId) prevIdx--;

  const maxAllowed = prevIdx >= 0 ? items[prevIdx].depth + 1 : 0;
  const projDepth = Math.min(Math.min(maxAllowed, MAX_DEPTH), Math.max(0, rawDepth));

  // Parent identification
  let parentId: string | undefined = undefined;
  if (projDepth > 0) {
    const searchIdx = position === "before" ? overIdx - 1 : overIdx;
    for (let i = searchIdx; i >= 0; i--) {
      if (items[i].id === activeId) continue;
      if (items[i].depth === projDepth - 1) {
        parentId = items[i].id;
        break;
      }
    }
  }
  return { parentId, depth: projDepth, position };
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPickerPopover({
  currentColor, anchorRect, onPick, onClose,
}: {
  currentColor: string; anchorRect: DOMRect;
  onPick: (c: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const t = setTimeout(() => window.addEventListener("mousedown", h), 60);
    return () => { clearTimeout(t); window.removeEventListener("mousedown", h); };
  }, [onClose]);

  const top = anchorRect.bottom + 6;
  const left = Math.min(anchorRect.left - 4, window.innerWidth - 160);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -4 }} transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
      style={{ position: "fixed", top, left, zIndex: 400 }}
      className="rounded-[var(--radius-md)] border p-2.5"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        background: "var(--bg-secondary)", border: "1px solid var(--border)",
        boxShadow: "var(--float-shadow)", zIndex: -1,
      }} />
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Renk seç</p>
      <div className="grid grid-cols-4 gap-1.5">
        {CODE_COLORS.map((c) => (
          <motion.button key={c} whileHover={{ scale: 1.25 }} whileTap={{ scale: 0.88 }}
            onClick={() => { onPick(c); onClose(); }}
            className="h-5 w-5 rounded-full flex-shrink-0"
            style={{ backgroundColor: c, outline: c === currentColor ? `2px solid ${c}` : "2px solid transparent", outlineOffset: "2px" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Single code row (used both in list and in DragOverlay) ───────────────────

interface CodeRowProps {
  code: FlatCode;
  allCodes: Code[];
  segments: Segment[];
  activeDocId: string | null;
  expandedCode: string | null;
  editingId: string | null;
  editingName: string;
  isDragOverlay?: boolean;
  /** override depth for projection indicator */
  projDepth?: number;
  // handlers
  onToggleExpand: (id: string) => void;
  onToggleParent: (id: string) => void;
  onStartEdit: (id: string, name: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onEditName: (v: string) => void;
  onDelete: (id: string) => void;
  onColorClick: (id: string, rect: DOMRect) => void;
  onAddSubCode: (parentId: string) => void;
  onFilterClick: (id: string) => void;
  onMoveCode: (id: string) => void;
  isPotentialParent?: boolean;
}

function CodeRow(props: CodeRowProps) {
  const {
    code, allCodes, segments, activeDocId,
    expandedCode, editingId, editingName,
    isDragOverlay = false, projDepth,
    onToggleExpand, onToggleParent,
    onStartEdit, onCommitEdit, onCancelEdit, onEditName,
    onDelete, onColorClick, onAddSubCode, onFilterClick, onMoveCode,
    isPotentialParent = false,
  } = props;
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const depth = projDepth ?? code.depth;
  const hasChildren = allCodes.some((c) => c.parentId === code.id);
  const isExpanded = !hasChildren && expandedCode === code.id;
  const isEditing = editingId === code.id;
  const usageCount = segments.filter((s) => s.codeIds.includes(code.id)).length;
  const docUsage: Segment[] = activeDocId
    ? segments.filter((s) => s.documentId === activeDocId && s.codeIds.includes(code.id))
    : [];

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-1 py-1.5 pr-2 rounded-[var(--radius-sm)] mx-1 transition-all cursor-default relative",
          isDragOverlay
            ? "shadow-lg opacity-90 bg-[var(--surface)]"
            : isExpanded
              ? "bg-[var(--surface)]"
              : isPotentialParent
                ? "bg-[var(--accent-subtle)] ring-1 ring-[var(--accent)] ring-inset"
                : "hover:bg-[var(--surface-hover)]",
        )}
        style={{ paddingLeft: `${8 + depth * INDENT_W}px` }}
      >
        {/* Chevron */}
        <button
          className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center"
          onClick={() => hasChildren ? onToggleParent(code.id) : onToggleExpand(code.id)}
        >
          <motion.div animate={{ rotate: (hasChildren ? !code.depth : isExpanded) ? 90 : 0 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}>
            <ChevronRight className="h-2.5 w-2.5" style={{
              color: "var(--text-muted)",
              opacity: (hasChildren || docUsage.length > 0) ? 1 : 0.2,
            }} />
          </motion.div>
        </button>

        {/* Level badge */}
        <span className="text-[9px] font-mono flex-shrink-0 w-5 text-center" style={{ color: "var(--text-disabled)" }}>
          {LEVEL_LABELS[depth] ?? `L${depth + 1}`}
        </span>

        {/* Color dot */}
        <Tooltip content="Renk değiştir" side="top">
          <button ref={colorBtnRef} className="flex-shrink-0 transition-transform hover:scale-110"
            onClick={() => { const r = colorBtnRef.current?.getBoundingClientRect(); if (r) onColorClick(code.id, r); }}
          >
            <span className="h-2.5 w-2.5 rounded-full block"
              style={{ backgroundColor: code.color, outline: `2px solid ${code.color}55`, outlineOffset: "1px" }} />
          </button>
        </Tooltip>

        {/* Name */}
        {isEditing ? (
          <input autoFocus value={editingName}
            onChange={(e) => onEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onCommitEdit(); if (e.key === "Escape") onCancelEdit(); }}
            className="flex-1 h-5 text-[12px] bg-transparent outline-none border-b"
            style={{ color: "var(--text-primary)", borderColor: "var(--accent)" }}
          />
        ) : (
          <span className="flex-1 text-[12px] truncate select-none"
            style={{ color: "var(--text-primary)", fontWeight: hasChildren ? 500 : 400 }}
            onDoubleClick={() => onStartEdit(code.id, code.name)}
            onClick={() => onFilterClick(code.id)}
            title="Tıkla: segment görünümü · Çift tıkla: yeniden adlandır"
          >
            {code.name}
          </span>
        )}

        {/* Usage */}
        <span className="text-[10px] font-mono flex-shrink-0 min-w-[14px] text-right"
          style={{ color: usageCount > 0 ? code.color : "var(--text-disabled)" }}>
          {usageCount || ""}
        </span>

        {/* Actions */}
        {isEditing ? (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={onCommitEdit} style={{ color: "var(--code-2)" }}><Check className="h-3 w-3" /></button>
            <button onClick={onCancelEdit} style={{ color: "var(--text-muted)" }}><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {depth < MAX_DEPTH && (
              <Tooltip content={`Alt-kod ekle (L${depth + 2})`} side="top">
                <button onClick={() => onAddSubCode(code.id)} style={{ color: "var(--text-muted)" }}
                  className="hover:text-[var(--text-primary)] transition-colors">
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Üst kodu değiştir" side="top">
              <button onClick={() => onMoveCode(code.id)} style={{ color: "var(--text-muted)" }}
                className="hover:text-[var(--text-primary)] transition-colors">
                <ChevronRight className="h-3 w-3 -rotate-90" />
              </button>
            </Tooltip>
            <Tooltip content="Yeniden adlandır" side="top">
              <button onClick={() => onStartEdit(code.id, code.name)} style={{ color: "var(--text-muted)" }}
                className="hover:text-[var(--text-primary)] transition-colors">
                <Pencil className="h-3 w-3" />
              </button>
            </Tooltip>
            <Tooltip content="Sil" side="top">
              <button onClick={() => onDelete(code.id)} style={{ color: "var(--text-muted)" }}
                className="hover:text-[var(--danger)] transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Inline segment preview (leaf only, when chevron clicked) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div key="preview"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="pb-1">
              {docUsage.length === 0 ? (
                <p className="text-[11px] py-1" style={{ color: "var(--text-disabled)", paddingLeft: `${depth * INDENT_W + 36}px` }}>
                  Bu belgede kullanılmadı
                </p>
              ) : docUsage.map((seg) => (
                <div key={seg.id} className="pr-2 py-1 mx-1 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ paddingLeft: `${depth * INDENT_W + 36}px` }}>
                  <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: code.color }}>"</span>{seg.text}<span style={{ color: code.color }}>"</span>
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableCodeItem(props: CodeRowProps & { isActive: boolean; overId: string | null; projection: any; id: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: props.code.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: props.isActive ? 0.25 : 1,
        position: "relative",
      }}
    >
      <div className="group relative">
        {/* Drag handle */}
        <button
          ref={setActivatorNodeRef} {...listeners} {...attributes}
          className="absolute left-1 top-1/2 -translate-y-1/2 flex-shrink-0 touch-none cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity z-10"
          style={{ color: "var(--text-muted)" }} tabIndex={-1}
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <CodeRow {...props} />
      </div>

      {/* Projection line inside item if being dragged over */}
      <AnimatePresence>
        {props.isActive === false && props.id === props.overId && props.projection && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            className="absolute left-0 right-0 h-[2px] z-20 pointer-events-none"
            style={{
              background: "var(--accent)",
              marginLeft: `${8 + props.projection.depth * INDENT_W}px`,
              marginRight: 8,
              transformOrigin: "left",
              top: props.projection.position === "before" ? "-1px" : "auto",
              bottom: props.projection.position === "after" ? "-1px" : "auto",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Tree line overlay (shows vertical connection between parent and children) ─

function TreeLines({ flatCodes }: { flatCodes: FlatCode[] }) {
  return (
    <>
      {flatCodes.map((item, idx) => {
        if (item.depth === 0) return null;
        // Find if there are more siblings after this at the same depth under the same parent
        const hasSiblingBelow = flatCodes.slice(idx + 1).some(
          (c) => c.parentId === item.parentId
        );
        const lineX = 15 + (item.depth - 1) * INDENT_W;
        return (
          <div key={`line-${item.id}`} aria-hidden
            style={{
              position: "absolute", left: `${lineX}px`,
              top: 0, bottom: hasSiblingBelow ? 0 : "50%",
              width: 1, background: "var(--border-subtle)", pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RightPanel() {
  const { activeProjectId, activeDocumentId, setActiveCodeFilter } = useAppStore();
  const { codes, segments, documents, createCode, updateCode, deleteCode, moveCode } = useProjectStore();

  const projectCodes = codes.filter((c) => c.projectId === activeProjectId);
  const activeDoc = documents.find((d) => d.id === activeDocumentId);

  // Tab state
  const [activeTab, setActiveTab] = useState<"codes" | "info">("codes");

  // ── UI state ──
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newCodeModal, setNewCodeModal] = useState(false);
  const [newCodeName, setNewCodeName] = useState("");
  const [newCodeParentId, setNewCodeParentId] = useState<string | null>(null);
  const [subCodeParent, setSubCodeParent] = useState<string | null>(null);
  const [subCodeName, setSubCodeName] = useState("");
  const [moveCodeId, setMoveCodeId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [colorPicker, setColorPicker] = useState<{ codeId: string; rect: DOMRect } | null>(null);

  // ── DnD state ──
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [position, setPosition] = useState<"before" | "after">("before");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Safety net: if pointer is released outside DndContext, reset stuck state
  useEffect(() => {
    const reset = () => {
      if (activeId) { setActiveId(null); setOverId(null); setOffsetX(0); }
    };
    window.addEventListener("pointerup", reset);
    window.addEventListener("pointercancel", reset);
    return () => {
      window.removeEventListener("pointerup", reset);
      window.removeEventListener("pointercancel", reset);
    };
  }, [activeId]);

  // ── Flat tree ──
  const flatCodes = useMemo(
    () => flattenCodes(projectCodes, undefined, 0, collapsedParents),
    [projectCodes, collapsedParents]
  );

  // Projection during drag
  const projection = useMemo(() => {
    if (!activeId || !overId) return null;
    return getProjection(flatCodes, activeId, overId, offsetX, position);
  }, [activeId, overId, offsetX, position, flatCodes]);

  // ── DnD handlers ──
  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOffsetX(0);
    setPosition("before");
  }, []);

  const handleDragMove = useCallback((e: DragMoveEvent) => {
    setOffsetX(e.delta.x);

    if (e.over) {
      const overRect = e.over.rect;
      const mouseY = (e.activatorEvent as MouseEvent).clientY + e.delta.y;
      const relativeY = mouseY - overRect.top;
      setPosition(relativeY > overRect.height / 2 ? "after" : "before");
    }
  }, []);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    setOverId(e.over ? String(e.over.id) : null);
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (over && activeId && projection) {
      if (active.id !== over.id || projection.position === "after") {
        // Guard: don't allow moving a code into its own descendant (circular ref)
        const wouldBeCircular = (() => {
          if (!projection.parentId) return false;
          let cur = projectCodes.find((c) => c.id === projection.parentId);
          const seen = new Set<string>();
          while (cur?.parentId) {
            if (seen.has(cur.id)) return true; // existing cycle
            if (cur.parentId === active.id) return true; // would create cycle
            seen.add(cur.id);
            cur = projectCodes.find((c) => c.id === cur!.parentId);
          }
          return false;
        })();

        if (!wouldBeCircular) {
          moveCode(String(active.id), projection.parentId, String(over.id), projection.position);
          if (projection.parentId) {
            setCollapsedParents((prev) => {
              const next = new Set(prev);
              next.delete(projection.parentId!);
              return next;
            });
          }
        }
      }
    }
    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
    setPosition("before");
  }, [activeId, projectCodes, projection, moveCode]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null); setOverId(null); setOffsetX(0);
  }, []);

  // ── Toggle helpers ──
  const handleToggleParent = useCallback((id: string) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedCode((prev) => (prev === id ? null : id));
  }, []);

  const handleFilterClick = useCallback((id: string) => {
    setActiveCodeFilter(id);
  }, [setActiveCodeFilter]);

  // ── CRUD helpers ──
  const handleCreate = () => {
    if (!activeProjectId || !newCodeName.trim()) return;
    createCode(activeProjectId, newCodeName.trim(), newCodeParentId ?? undefined);
    if (newCodeParentId) {
      setCollapsedParents((prev) => { const n = new Set(prev); n.delete(newCodeParentId); return n; });
    }
    setNewCodeName(""); setNewCodeParentId(null); setNewCodeModal(false);
  };

  const handleCreateSubCode = () => {
    if (!activeProjectId || !subCodeParent || !subCodeName.trim()) return;
    createCode(activeProjectId, subCodeName.trim(), subCodeParent);
    setCollapsedParents((prev) => { const n = new Set(prev); n.delete(subCodeParent); return n; });
    setSubCodeName(""); setSubCodeParent(null);
  };

  const startEdit = (id: string, name: string) => { setEditingId(id); setEditingName(name); };
  const commitEdit = () => {
    if (editingId && editingName.trim()) updateCode(editingId, { name: editingName.trim() });
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  // Shared row props
  const rowProps = {
    allCodes: projectCodes,
    segments,
    activeDocId: activeDocumentId,
    expandedCode,
    editingId,
    editingName,
    onToggleExpand: handleToggleExpand,
    onToggleParent: handleToggleParent,
    onStartEdit: startEdit,
    onCommitEdit: commitEdit,
    onCancelEdit: cancelEdit,
    onEditName: setEditingName,
    onDelete: deleteCode,
    onColorClick: (id: string, rect: DOMRect) => setColorPicker({ codeId: id, rect }),
    onAddSubCode: (pid: string) => { setSubCodeParent(pid); setSubCodeName(""); },
    onFilterClick: handleFilterClick,
    onMoveCode: (id: string) => {
      setMoveCodeId(id);
      setMoveTargetId(projectCodes.find((c) => c.id === id)?.parentId ?? null);
    },
  };

  const activeCode = activeId ? flatCodes.find((c) => c.id === activeId) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
      {/* Tab Header */}
      <div className="flex items-center border-b flex-shrink-0"
        style={{ borderColor: "var(--border-subtle)" }}>
        <button
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest transition-colors"
          style={{
            color: activeTab === "codes" ? "var(--accent)" : "var(--text-muted)",
            borderBottom: activeTab === "codes" ? "2px solid var(--accent)" : "2px solid transparent",
          }}
          onClick={() => setActiveTab("codes")}
        >
          <Tag className="h-3.5 w-3.5" />
          Kodlar
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-widest transition-colors"
          style={{
            color: activeTab === "info" ? "var(--accent)" : "var(--text-muted)",
            borderBottom: activeTab === "info" ? "2px solid var(--accent)" : "2px solid transparent",
          }}
          onClick={() => setActiveTab("info")}
        >
          <Info className="h-3.5 w-3.5" />
          Bilgi
        </button>
        {activeTab === "codes" && (
          <Tooltip content="Yeni kod" side="left">
            <Button size="icon" variant="ghost" className="h-6 w-6 mr-2"
              disabled={!activeProjectId} onClick={() => setNewCodeModal(true)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "codes" ? (
          <motion.div
            key="codes"
            className="flex-1 flex flex-col overflow-hidden"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Hint */}
            {projectCodes.length > 0 && (
              <p className="text-[10px] px-3 py-1" style={{ color: "var(--text-disabled)" }}>
                Sürükle: taşı / yeniden sırala · Sol-sağ: seviye değiştir
              </p>
            )}

            {/* Code tree (flat sortable list) */}
            <div className="flex-1 overflow-y-auto py-1">
              {!activeProjectId ? (
                <p className="text-[11px] px-4 py-3" style={{ color: "var(--text-muted)" }}>
                  Kodları görmek için bir proje açın.
                </p>
              ) : flatCodes.length === 0 ? (
                <EmptyCodeState onNew={() => setNewCodeModal(true)} />
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext
                    items={flatCodes.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div style={{ position: "relative" }}>
                      {/* Tree lines */}
                      <TreeLines flatCodes={flatCodes} />

                      {flatCodes.map((code) => {
                        const isPotentialParent = projection?.parentId === code.id;
                        return (
                          <SortableCodeItem
                            key={code.id}
                            id={code.id}
                            {...rowProps}
                            code={code}
                            isActive={code.id === activeId}
                            overId={overId}
                            projection={projection}
                            isPotentialParent={isPotentialParent}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>

                  <DragOverlay dropAnimation={null}>
                    {activeCode && (
                      <div style={{ pointerEvents: "none" }}>
                        <CodeRow
                          {...rowProps}
                          code={activeCode}
                          projDepth={projection?.depth ?? activeCode.depth}
                          isDragOverlay
                        />
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              )}
            </div>

            {/* Palette strip */}
            <div className="flex-shrink-0 border-t px-3 py-2.5" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Palette className="h-3 w-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Palet</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CODE_COLORS.map((color) => (
                  <Tooltip key={color} content={color} side="top">
                    <motion.div whileHover={{ scale: 1.25 }} whileTap={{ scale: 0.9 }}
                      className="h-3.5 w-3.5 rounded-full cursor-default"
                      style={{ backgroundColor: color, outline: `2px solid ${color}50`, outlineOffset: "1px" }}
                    />
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Stats footer */}
            <div className="flex-shrink-0 border-t px-3 py-2 flex items-center gap-3" style={{ borderColor: "var(--border-subtle)" }}>
              <StatChip icon={<Hash className="h-3 w-3" />} value={projectCodes.length} label="kod" />
              <StatChip icon={<Tag className="h-3 w-3" />}
                value={segments.filter((s) => s.projectId === activeProjectId).length} label="segment" />
              {activeDocumentId && segments.filter(s => s.documentId === activeDocumentId).length > 0 && (
                <StatChip icon={<Tag className="h-3 w-3" />}
                  value={segments.filter(s => s.documentId === activeDocumentId).length} label="belgede" />
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="info"
            className="flex-1 overflow-y-auto p-5 space-y-6"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
          >
            {!activeDoc ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-8 w-8 mb-3" style={{ color: "var(--border)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Bilgileri görmek için bir belge seçin.
                </p>
              </div>
            ) : (
              <>
                <section className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Genel Bilgiler
                  </h3>
                  <div className="space-y-3">
                    <InfoRow
                      label="Belge Adı"
                      value={activeDoc.name}
                      icon={<FileText className="h-3 w-3" />}
                    />
                    <InfoRow
                      label="Format"
                      value={activeDoc.format?.toUpperCase() ?? "TEXT"}
                    />
                    <InfoRow
                      label="Tür"
                      value={activeDoc.type}
                      capitalize
                    />
                    <InfoRow
                      label="Kelime Sayısı"
                      value={activeDoc.wordCount?.toLocaleString() ?? "0"}
                    />
                    <InfoRow
                      label="Oluşturulma"
                      value={new Date(activeDoc.createdAt).toLocaleDateString()}
                    />
                  </div>
                </section>

                {activeDoc.color && (
                  <section className="space-y-4 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      Görünüm
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: activeDoc.color }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        Özel belge rengi atandı
                      </span>
                    </div>
                  </section>
                )}

                <section className="space-y-4 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    İstatistikler
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3 flex flex-col gap-1" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
                      <span className="text-[10px] uppercase font-bold" style={{ color: "var(--text-disabled)" }}>Kodlama</span>
                      <span className="text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {segments.filter(s => s.documentId === activeDoc.id).length}
                      </span>
                    </div>
                    <div className="rounded-lg border p-3 flex flex-col gap-1" style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}>
                      <span className="text-[10px] uppercase font-bold" style={{ color: "var(--text-disabled)" }}>Karakter</span>
                      <span className="text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {activeDoc.content.length.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </section>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals ── */}

      {/* New Code */}
      <Modal open={newCodeModal} onClose={() => { setNewCodeModal(false); setNewCodeParentId(null); }} title="Yeni Kod">
        <div className="space-y-4">
          <Input label="Kod adı" placeholder="örn. Duygusal tepki"
            value={newCodeName} onChange={(e) => setNewCodeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()} autoFocus />
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Üst kod (isteğe bağlı)</label>
            <select value={newCodeParentId ?? ""} onChange={(e) => setNewCodeParentId(e.target.value || null)}
              className="w-full rounded-[var(--radius-sm)] border px-2 py-1.5 text-[12px] outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
              <option value="">— Kök seviyesi (L1)</option>
              {projectCodes.filter((c) => {
                let d = 0, cur = c;
                while (cur.parentId && d < 4) { const p = projectCodes.find((x) => x.id === cur.parentId); if (!p) break; d++; cur = p; }
                return d < MAX_DEPTH;
              }).map((c) => {
                let d = 0, cur = c;
                while (cur.parentId && d < 4) { const p = projectCodes.find((x) => x.id === cur.parentId); if (!p) break; d++; cur = p; }
                return <option key={c.id} value={c.id}>{"\u00a0\u00a0".repeat(d)}L{d + 1} — {c.name}</option>;
              })}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => { setNewCodeModal(false); setNewCodeParentId(null); }}>İptal</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newCodeName.trim()}>Kod oluştur</Button>
          </div>
        </div>
      </Modal>

      {/* Sub-code */}
      <Modal open={!!subCodeParent} onClose={() => setSubCodeParent(null)} title="Alt-kod Ekle">
        <div className="space-y-4">
          {subCodeParent && (
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              Üst kod: <strong style={{ color: "var(--text-primary)" }}>{projectCodes.find((c) => c.id === subCodeParent)?.name}</strong>
            </p>
          )}
          <Input label="Alt-kod adı" placeholder="örn. Pozitif duygu"
            value={subCodeName} onChange={(e) => setSubCodeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateSubCode()} autoFocus />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setSubCodeParent(null)}>İptal</Button>
            <Button variant="primary" onClick={handleCreateSubCode} disabled={!subCodeName.trim()}>Alt-kod oluştur</Button>
          </div>
        </div>
      </Modal>

      {/* Move Code */}
      <Modal open={!!moveCodeId} onClose={() => setMoveCodeId(null)} title="Üst Kodu Değiştir">
        <div className="space-y-4">
          {moveCodeId && (
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              Kod: <strong style={{ color: "var(--text-primary)" }}>{projectCodes.find((c) => c.id === moveCodeId)?.name}</strong>
            </p>
          )}
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Yeni üst kod</label>
            <select value={moveTargetId ?? ""} onChange={(e) => setMoveTargetId(e.target.value || null)}
              className="w-full rounded-[var(--radius-sm)] border px-2 py-1.5 text-[12px] outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
              <option value="">— Kök seviyesi (L1)</option>
              {projectCodes.filter((c) => {
                if (c.id === moveCodeId) return false;
                let cur = c;
                while (cur.parentId) { if (cur.parentId === moveCodeId) return false; const p = projectCodes.find((x) => x.id === cur.parentId); if (!p) break; cur = p; }
                let d = 0; cur = c;
                while (cur.parentId && d < 4) { const p = projectCodes.find((x) => x.id === cur.parentId); if (!p) break; d++; cur = p; }
                return d < MAX_DEPTH;
              }).map((c) => {
                let d = 0, cur = c;
                while (cur.parentId && d < 4) { const p = projectCodes.find((x) => x.id === cur.parentId); if (!p) break; d++; cur = p; }
                return <option key={c.id} value={c.id}>{"\u00a0\u00a0".repeat(d)}L{d + 1} — {c.name}</option>;
              })}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setMoveCodeId(null)}>İptal</Button>
            <Button variant="primary" onClick={() => {
              if (moveCodeId) {
                updateCode(moveCodeId, { parentId: moveTargetId ?? undefined });
                if (moveTargetId) setCollapsedParents((prev) => { const n = new Set(prev); n.delete(moveTargetId); return n; });
              }
              setMoveCodeId(null);
            }}>Taşı</Button>
          </div>
        </div>
      </Modal>

      {/* Color Picker */}
      <AnimatePresence>
        {colorPicker && (
          <ColorPickerPopover key="cp"
            currentColor={codes.find((c) => c.id === colorPicker.codeId)?.color ?? ""}
            anchorRect={colorPicker.rect}
            onPick={(color) => updateCode(colorPicker.codeId, { color })}
            onClose={() => setColorPicker(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon,
  capitalize
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-left">
      <div className="flex items-center gap-2 text-[11px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
        {icon}
        {label}
      </div>
      <div
        className={cn("text-[12px] font-medium truncate", capitalize && "capitalize")}
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

function StatChip({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
      {icon}
      <span className="text-[11px]">
        <strong style={{ color: "var(--text-secondary)" }}>{value}</strong> {label}
      </span>
    </div>
  );
}

function EmptyCodeState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
      <div className="h-9 w-9 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: "var(--surface)" }}>
        <Tag className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Henüz kod yok</p>
      <Button variant="outline" size="sm" onClick={onNew}>
        <Plus className="h-3.5 w-3.5" />Yeni kod
      </Button>
    </div>
  );
}
