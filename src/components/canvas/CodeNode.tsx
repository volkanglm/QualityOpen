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
        "flex h-full w-full items-center gap-2 rounded-full border px-4 py-2 shadow-sm transition-all group relative min-h-[40px] min-w-[140px]",
        selected ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-background" : ""
      )}
      style={{ 
        backgroundColor: data.color ? `${data.color}15` : 'var(--bg-secondary)', 
        borderColor: data.color || "var(--border)",
        borderWidth: '2px'
      }}
    >
      <NodeResizer
        minWidth={120}
        minHeight={40}
        isVisible={selected}
        lineClassName="border-[var(--accent)]"
        handleClassName="!h-2 !w-2 !bg-[var(--accent)] !rounded-full"
      />
      
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <Hash size={12} style={{ color: data.color }} className="flex-shrink-0" />
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
          className="rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 transition-colors"
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
        <div className="absolute top-full mt-2 left-0 z-[1001] flex flex-wrap gap-1 w-[120px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-2 shadow-xl">
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

      {/* 4-way Universal Handles (Loose Mode enabled in Board) */}
      <Handle
        type="target"
        position={Position.Top}
        id="t-top"
        isConnectable={true}
        className="!bg-blue-500/50 !w-4 !h-4 !-top-2 border-none transition-all hover:!bg-blue-400 opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="s-top"
        isConnectable={true}
        className="!bg-blue-500/50 !w-4 !h-4 !-top-2 border-none transition-all hover:!bg-blue-400 opacity-0 group-hover:opacity-100"
      />
      
      <Handle
        type="target"
        position={Position.Bottom}
        id="t-bottom"
        isConnectable={true}
        className="!bg-blue-500/50 !w-4 !h-4 !-bottom-2 border-none transition-all hover:!bg-blue-400 opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="s-bottom"
        isConnectable={true}
        className="!bg-blue-500/50 !w-4 !h-4 !-bottom-2 border-none transition-all hover:!bg-blue-400 opacity-0 group-hover:opacity-100"
      />
      
      <Handle
        type="target"
        position={Position.Left}
        id="t-left"
        isConnectable={true}
        className="!bg-blue-500/50 !w-4 !h-4 !-left-2 border-none transition-all hover:!bg-blue-400 opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="s-left"
        isConnectable={true}
        className="!bg-blue-500/50 !w-4 !h-4 !-left-2 border-none transition-all hover:!bg-blue-400 opacity-0 group-hover:opacity-100"
      />
      
      <Handle
        type="target"
        position={Position.Right}
        id="t-right"
        isConnectable={true}
        className="!bg-blue-500/50 !w-4 !h-4 !-right-2 border-none transition-all hover:!bg-blue-400 opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="s-right"
        isConnectable={true}
        className="!bg-blue-500/50 !w-4 !h-4 !-right-2 border-none transition-all hover:!bg-blue-400 opacity-0 group-hover:opacity-100"
      />
    </div>
  );
});

CodeNodeComponent.displayName = "CodeNode";
