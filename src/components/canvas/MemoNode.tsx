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

  const scheme = MEMO_COLORS[data.colorIndex as number ?? 0];

  return (
    <div className={cn(
        "group relative min-w-[200px] min-h-[120px] border-2 rounded-lg shadow-sm flex flex-col p-3 text-sm text-foreground",
        scheme.bg,
        scheme.border
    )}>
       <NodeResizer 
        color="#eab308" 
        isVisible={!!selected} 
        minWidth={150} 
        minHeight={100} 
      />
      
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
        <StickyNote size={14} className="opacity-70" />
        <span className="font-semibold truncate">
          {String(memoObj?.title || data.label || "Memo")}
        </span>
      </div>

      <div className="flex-1 overflow-auto opacity-80 whitespace-pre-wrap line-clamp-4">
        {memoObj?.content || "No content"}
      </div>

      {selected && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
            {MEMO_COLORS.map((c, i) => (
                <button
                    key={i}
                    onClick={() => onColorChange(i)}
                    className={cn(
                        "w-4 h-4 rounded-full border border-white/10 hover:scale-110 transition-transform",
                        c.bg
                    )}
                />
            ))}
        </div>
      )}

      {/* 4-Way Universal Handles */}
      <Handle type="target" position={Position.Top} className={cn("!w-2.5 !h-2.5 !border-white/20", scheme.dot)} />
      <Handle type="source" position={Position.Bottom} className={cn("!w-2.5 !h-2.5 !border-white/20", scheme.dot)} />
      <Handle type="source" position={Position.Left} className={cn("!w-2.5 !h-2.5 !border-white/20", scheme.dot)} />
      <Handle type="source" position={Position.Right} className={cn("!w-2.5 !h-2.5 !border-white/20", scheme.dot)} />
      
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="target" position={Position.Right} className="!opacity-0" />
    </div>
  );
});

MemoNodeComponent.displayName = "MemoNode";
