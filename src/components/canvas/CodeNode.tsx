import { memo, useCallback, useState } from "react";
import { Handle, Position, NodeProps, Node, useReactFlow, NodeResizer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { X, Palette, Hash } from "lucide-react";
import { CODE_COLORS } from "@/lib/constants";

export interface CodeNodeData extends Record<string, unknown> {
  codeId: string;
  label: string;
  color?: string;
  usageCount?: number;
}

export type CodeNode = Node<CodeNodeData, "code">;

export const CodeNodeComponent = memo(({ id, data, selected }: NodeProps<CodeNode>) => {
  const { setNodes } = useReactFlow();
  const [showPalette, setShowPalette] = useState(false);

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
  }, [id, setNodes]);

  const onColorChange = (color: string) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, color } } : n));
    setShowPalette(false);
  };

  return (
    <div
      className={cn(
        "flex h-full w-full items-center gap-2 rounded-full border px-4 py-2 shadow-md transition-all group relative min-h-[38px] min-w-[120px] bg-white dark:bg-zinc-900",
        selected ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-zinc-200 dark:border-zinc-800"
      )}
      style={{ borderLeftWidth: '6px', borderLeftColor: data.color || "var(--accent)" }}
    >
      <NodeResizer
        minWidth={120}
        minHeight={38}
        isVisible={selected}
        lineClassName="border-[var(--accent)]"
        handleClassName="!h-2 !w-2 !bg-[var(--accent)] !rounded-full"
      />
      
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <Hash size={12} className="text-zinc-500 flex-shrink-0" />
        <span className="text-[13px] font-bold text-foreground truncate">
          {data.label}
        </span>
        {data.usageCount !== undefined && (
             <span className="text-[10px] text-zinc-500 font-mono">({data.usageCount})</span>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        <button
          onClick={() => setShowPalette(!showPalette)}
          className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          <Palette className="h-3 w-3" />
        </button>
        <button 
          onClick={onDelete}
          className="rounded-full p-1 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {showPalette && (
        <div className="absolute top-full mt-2 left-0 z-[100] flex flex-wrap gap-1 w-[120px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl">
          {CODE_COLORS.map((c) => (
            <button
              key={c}
              className="h-4 w-4 rounded-full border border-black/5 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              onClick={() => onColorChange(c)}
            />
          ))}
        </div>
      )}

      {/* 4-Way Universal Handles */}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-400 !border-white/20" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-400 !border-white/20" />
      <Handle type="source" position={Position.Left} className="!w-2 !h-2 !bg-zinc-400 !border-white/20" />
      <Handle type="target" position={Position.Right} className="!w-2 !h-2 !bg-zinc-400 !border-white/20" />
      
      {/* Invisible complementary handles for flexibility */}
      <Handle type="source" position={Position.Top} className="!opacity-0" />
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
});

CodeNodeComponent.displayName = "CodeNode";
