import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps, Node, useReactFlow } from "@xyflow/react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { X, Palette } from "lucide-react";
import { CODE_COLORS } from "@/lib/constants";

export interface MemoNodeData extends Record<string, unknown> {
  label: string;
  color?: string;
}

export type MemoNode = Node<MemoNodeData, "memo">;

export const MemoNodeComponent = memo(({ id, data, selected }: NodeProps<MemoNode>) => {
  const t = useT();
  const { setNodes } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [text, setText] = useState(data.label as string || "");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
  }, [id, setNodes]);

  const onDoubleClick = useCallback(() => {
    setEditing(true);
  }, []);

  const onBlur = useCallback(() => {
    setEditing(false);
    setNodes((nds) => 
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: text } } : n)
    );
  }, [id, text, setNodes]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  return (
    <div
      className={cn(
        "min-w-[180px] max-w-[280px] rounded-lg border p-3 shadow-xl transition-all",
        selected ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)]",
        "group relative"
      )}
      style={{ 
        backgroundColor: data.color || "var(--surface)",
        color: data.color ? "#000" : "var(--text-primary)" 
      }}
      onDoubleClick={onDoubleClick}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!bg-[var(--accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Top} id="top-source" className="!bg-[var(--accent)] !w-2 !h-2 opacity-0" />
      
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!bg-[var(--accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!bg-[var(--accent)] !w-2 !h-2 opacity-0" />

      <Handle type="target" position={Position.Left} id="left-target" className="!bg-[var(--accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Left} id="left-source" className="!bg-[var(--accent)] !w-2 !h-2 opacity-0" />

      <Handle type="target" position={Position.Right} id="right-target" className="!bg-[var(--accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right-source" className="!bg-[var(--accent)] !w-2 !h-2 opacity-0" />
      
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between opacity-50">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            data.color ? "opacity-70" : "text-[var(--text-secondary)] opacity-50"
          )}>
            {t("canvas.memo")}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPalette(!showPalette)}
              className={cn(
                "rounded-full p-0.5 transition-all opacity-0 group-hover:opacity-100",
                data.color ? "hover:bg-black/10 text-black/40" : "hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
              )}
            >
              <Palette className="h-3 w-3" />
            </button>
            <button 
              onClick={onDelete}
              className={cn(
                "rounded-full p-0.5 transition-all opacity-0 group-hover:opacity-100",
                data.color ? "hover:bg-black/10 text-black/40" : "hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--danger)]"
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {showPalette && (
          <div className="absolute top-10 right-0 z-20 flex flex-wrap gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
            <button
              className="h-4 w-4 rounded-full border border-[var(--border)] bg-transparent"
              onClick={() => {
                setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, color: undefined } } : n));
                setShowPalette(false);
              }}
            />
            {CODE_COLORS.map((c) => (
              <button
                key={c}
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: c }}
                onClick={() => {
                  setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, color: c } } : n));
                  setShowPalette(false);
                }}
              />
            ))}
          </div>
        )}

        {editing ? (
          <textarea
            ref={inputRef}
            className={cn(
              "w-full bg-transparent p-0 text-sm leading-relaxed outline-none resize-none overflow-hidden",
              data.color ? "text-black placeholder:text-black/40" : "text-[var(--text-primary)]"
            )}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onBlur={onBlur}
            rows={2}
          />
        ) : (
          <div className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap break-words",
            data.color ? "text-black" : "text-[var(--text-primary)]"
          )}>
            {text || <span className={data.color ? "text-black/40 italic" : "text-[var(--text-tertiary)] italic"}>{t("memos.placeholder")}</span>}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--accent)] !w-2 !h-2" />
    </div>
  );
});
