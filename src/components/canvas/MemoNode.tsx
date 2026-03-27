import { memo } from "react";
import { NodeProps, Handle, Position, NodeResizer, useReactFlow } from "@xyflow/react";
import { StickyNote } from "lucide-react";
import { useProjectStore } from "@/store/project.store";
import { cn } from "@/lib/utils";

const MEMO_COLORS = [
    { bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-700/50", dot: "bg-yellow-400" },
    { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-700/50", dot: "bg-blue-400" },
    { bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-700/50", dot: "bg-green-400" },
    { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-700/50", dot: "bg-red-400" },
    { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-700/50", dot: "bg-purple-400" },
];

export const MemoNodeComponent = memo(({ id, data, selected }: NodeProps) => {
  const { memos } = useProjectStore();
  const { setNodes } = useReactFlow();
  const memoObj = memos.find((m) => m.id === data.memoId);

  const onColorChange = (colorIndex: number) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, colorIndex } } : n));
  };

  const onTextChange = (content: string) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, content } } : n));
  };

  const onTitleChange = (label: string) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label } } : n));
  };

  const scheme = MEMO_COLORS[data.colorIndex as number ?? 0];
  const title = String(memoObj?.title || data.label || "Memo");
  const content = String(memoObj?.content || data.content || "");

  return (
    <div className={cn(
        "group relative min-w-[200px] min-h-[140px] border-2 rounded-lg shadow-sm flex flex-col p-3 text-sm text-foreground transition-all duration-300",
        scheme.bg,
        scheme.border,
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background"
    )}>
       <NodeResizer 
        color="#eab308" 
        isVisible={!!selected} 
        minWidth={150} 
        minHeight={120} 
      />
      
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-black/10 dark:border-white/10">
        <StickyNote size={14} className="opacity-70" />
        <input 
          className="bg-transparent border-none outline-none font-semibold truncate w-full p-0 h-auto focus:ring-0"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Memo Title"
        />
      </div>

      <textarea 
        className="flex-1 bg-transparent border-none outline-none resize-none opacity-90 text-[13px] leading-relaxed p-0 h-auto focus:ring-0 scrollbar-thin overflow-y-auto"
        value={content}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Type something..."
      />

      {selected && (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-[1001]">
            {MEMO_COLORS.map((c, i) => (
                <button
                    key={i}
                    onClick={() => onColorChange(i)}
                    className={cn(
                        "w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform",
                        c.bg
                    )}
                />
            ))}
        </div>
      )}

      {/* 4-Way Universal Handles — Loose Mode enabled in Board */}
      {/* 4-way Universal Handles (Loose Mode enabled in Board) */}
      <Handle
        type="target"
        position={Position.Top}
        id="t-top"
        isConnectable={true}
        className="!bg-amber-500/50 !w-4 !h-4 !-top-2 border-none transition-all hover:!bg-amber-400 opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="s-top"
        isConnectable={true}
        className="!bg-amber-500/50 !w-4 !h-4 !-top-2 border-none transition-all hover:!bg-amber-400 opacity-0 group-hover:opacity-100"
      />
      
      <Handle
        type="target"
        position={Position.Bottom}
        id="t-bottom"
        isConnectable={true}
        className="!bg-amber-500/50 !w-4 !h-4 !-bottom-2 border-none transition-all hover:!bg-amber-400 opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="s-bottom"
        isConnectable={true}
        className="!bg-amber-500/50 !w-4 !h-4 !-bottom-2 border-none transition-all hover:!bg-amber-400 opacity-0 group-hover:opacity-100"
      />
      
      <Handle
        type="target"
        position={Position.Left}
        id="t-left"
        isConnectable={true}
        className="!bg-amber-500/50 !w-4 !h-4 !-left-2 border-none transition-all hover:!bg-amber-400 opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="s-left"
        isConnectable={true}
        className="!bg-amber-500/50 !w-4 !h-4 !-left-2 border-none transition-all hover:!bg-amber-400 opacity-0 group-hover:opacity-100"
      />
      
      <Handle
        type="target"
        position={Position.Right}
        id="t-right"
        isConnectable={true}
        className="!bg-amber-500/50 !w-4 !h-4 !-right-2 border-none transition-all hover:!bg-amber-400 opacity-0 group-hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="s-right"
        isConnectable={true}
        className="!bg-amber-500/50 !w-4 !h-4 !-right-2 border-none transition-all hover:!bg-amber-400 opacity-0 group-hover:opacity-100"
      />
    </div>
  );
});

MemoNodeComponent.displayName = "MemoNode";
