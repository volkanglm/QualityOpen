import { memo, useCallback } from "react";
import { Handle, Position, NodeProps, Node, useReactFlow, NodeResizer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Quote, X, FileText } from "lucide-react";
import { useProjectStore } from "@/store/project.store";
import { useAppStore } from "@/store/app.store";

export interface QuoteNodeData extends Record<string, unknown> {
  documentId: string;
  label: string;
  text: string;
}

export type QuoteNode = Node<QuoteNodeData, "quote">;

export const QuoteNodeComponent = memo(({ id, data, selected }: NodeProps<QuoteNode>) => {
  const { setNodes } = useReactFlow();
  const { documents } = useProjectStore();
  const { setActiveDocument } = useAppStore();
  
  const doc = documents.find(d => d.id === data.documentId);

  const onDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== id));
  }, [id, setNodes]);

  const onJumpToDoc = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.documentId) {
        setActiveDocument(data.documentId);
    }
  }, [data.documentId, setActiveDocument]);

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col gap-2 rounded-xl border bg-[var(--bg-secondary)] px-4 py-3 shadow-lg transition-all group relative min-h-[120px] min-w-[220px]",
        selected ? "border-[var(--accent)] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-background" : "border-[var(--border)]"
      )}
    >
      <NodeResizer
        minWidth={200}
        minHeight={100}
        isVisible={selected}
        lineClassName="border-[var(--accent)]"
        handleClassName="!h-2 !w-2 !bg-[var(--accent)] !rounded-full"
      />
      
      <div className="flex items-center justify-between mb-1">
        <Quote size={14} className="text-zinc-400" />
        <button 
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded transition-all"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <p className="text-[13px] italic leading-relaxed text-foreground/90 whitespace-pre-wrap line-clamp-6">
          "{data.text || data.label}"
        </p>
      </div>

      <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
         <button 
            onClick={onJumpToDoc}
            className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-[var(--accent)] transition-colors truncate"
         >
            <FileText size={10} />
            <span className="truncate max-w-[120px]">{doc?.name || "Document"}</span>
         </button>
      </div>

      {/* 4-Way Universal Handles */}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-400 !border-white/20" />
      <Handle type="source" position={Position.Top} style={{ background: 'transparent', border: 'none' }} />

      <Handle type="target" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-400 !border-white/20" />
      <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none' }} />

      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-zinc-400 !border-white/20" />
      <Handle type="source" position={Position.Left} style={{ background: 'transparent', border: 'none' }} />

      <Handle type="target" position={Position.Right} className="!w-2 !h-2 !bg-zinc-400 !border-white/20" />
      <Handle type="source" position={Position.Right} style={{ background: 'transparent', border: 'none' }} />
    </div>
  );
});

QuoteNodeComponent.displayName = "QuoteNode";
