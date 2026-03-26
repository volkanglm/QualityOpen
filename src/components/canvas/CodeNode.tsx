import { memo, useCallback, useState } from "react";
import { Handle, Position, NodeProps, Node, useReactFlow } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { X, Palette } from "lucide-react";
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

  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2 rounded-full border px-3 py-1 shadow-md transition-all group relative",
        selected ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-transparent"
      )}
      style={{ backgroundColor: data.color || (data.background as string) || "var(--surface)" }}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-1.5 !h-1.5 opacity-0" />
      
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-1.5 !h-1.5 opacity-0" />

      <Handle type="target" position={Position.Left} id="left-target" className="!w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-1.5 !h-1.5 opacity-0" />

      <Handle type="target" position={Position.Right} id="right-target" className="!w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-1.5 !h-1.5 opacity-0" />
      
      <div className="flex items-center gap-1.5 overflow-hidden">
        <span className="text-xs font-bold text-black truncate max-w-[120px]">
          {data.label}
        </span>
      </div>

      <div className="flex items-center gap-0.5 ml-1">
        <button
          onClick={() => setShowPalette(!showPalette)}
          className="rounded-full p-0.5 hover:bg-black/10 text-black/40 transition-all opacity-0 group-hover:opacity-100"
        >
          <Palette className="h-3 w-3" />
        </button>
        <button 
          onClick={onDelete}
          className="rounded-full p-0.5 hover:bg-black/10 text-black/40 transition-all opacity-0 group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {showPalette && (
        <div className="absolute top-9 left-0 z-20 flex flex-wrap gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
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

      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5" />
    </div>
  );
});
