import { memo, useCallback } from "react";
import { Handle, Position, NodeProps, Node, useReactFlow, NodeResizer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Quote, X } from "lucide-react";
import { useT } from "@/lib/i18n";

export interface QuoteNodeData extends Record<string, unknown> {
  label: string;
  docName: string;
}

export type QuoteNode = Node<QuoteNodeData, "quote">;

export const QuoteNodeComponent = memo(({ id, data, selected }: NodeProps<QuoteNode>) => {
  const { label, docName } = data;
  const { setNodes } = useReactFlow();
  const t = useT();

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
  }, [id, setNodes]);

  return (
    <div
      className={cn(
        "h-full w-full rounded-lg border bg-[var(--bg-secondary)] p-4 shadow-lg transition-all group relative min-w-[150px] min-h-[100px]",
        selected ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border-subtle)]"
      )}
    >
      <NodeResizer 
        minWidth={150} 
        minHeight={100} 
        isVisible={selected} 
        lineClassName="border-[var(--accent)]" 
        handleClassName="!h-2 !w-2 !bg-[var(--accent)] !rounded-full"
      />
      <Handle type="target" position={Position.Top} id="top-target" className="!bg-[var(--accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Top} id="top-source" className="!bg-[var(--accent)] !w-2 !h-2 opacity-0" />
      
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!bg-[var(--accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!bg-[var(--accent)] !w-2 !h-2 opacity-0" />

      <Handle type="target" position={Position.Left} id="left-target" className="!bg-[var(--accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Left} id="left-source" className="!bg-[var(--accent)] !w-2 !h-2 opacity-0" />

      <Handle type="target" position={Position.Right} id="right-target" className="!bg-[var(--accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right-source" className="!bg-[var(--accent)] !w-2 !h-2 opacity-0" />
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[var(--accent)] opacity-80">
            <Quote className="h-3.5 w-3.5 fill-current" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
              {docName || t("canvas.sourceLabel")}
            </span>
          </div>
          <button 
            onClick={onDelete}
            className="rounded-full p-0.5 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        
        <blockquote className="text-[13px] italic leading-relaxed text-[var(--text-primary)] tracking-tight">
          "{label as string}"
        </blockquote>
      </div>
    </div>
  );
});
