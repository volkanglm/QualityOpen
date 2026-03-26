import { memo } from "react";
import { NodeProps, Handle, Position, NodeResizer } from "@xyflow/react";
import { StickyNote } from "lucide-react";
import { useProjectStore } from "@/store/project.store";

export const MemoNodeComponent = memo(({ data, selected }: NodeProps) => {
  const { memos } = useProjectStore();
  const memoObj = memos.find((m) => m.id === data.memoId);

  return (
    <div className="group relative min-w-[200px] min-h-[120px] bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700/50 rounded-lg shadow-sm flex flex-col p-3 text-sm text-foreground">
       <NodeResizer 
        color="#eab308" 
        isVisible={!!selected} 
        minWidth={150} 
        minHeight={100} 
      />
      
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-yellow-200/50 dark:border-yellow-700/30">
        <StickyNote size={14} className="text-yellow-600 dark:text-yellow-400" />
        <span className="font-semibold truncate">
          {String(memoObj?.title || data.label || "Memo")}
        </span>
      </div>

      <div className="flex-1 overflow-auto opacity-80 whitespace-pre-wrap line-clamp-4">
        {memoObj?.content || "No content"}
      </div>

      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-yellow-400" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-yellow-400" />
    </div>
  );
});

MemoNodeComponent.displayName = "MemoNode";
