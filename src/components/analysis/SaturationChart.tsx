import { useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useProjectStore } from "@/store/project.store";
import { useAppStore } from "@/store/app.store";
import { Info, TrendingDown } from "lucide-react";

export function SaturationChart() {
  const { activeProjectId } = useAppStore();
  const { documents, segments } = useProjectStore();

  const chartData = useMemo(() => {
    if (!activeProjectId) return [];

    // 1. Get project documents sorted by creation date
    const projectDocs = documents
      .filter((d) => d.projectId === activeProjectId)
      .sort((a, b) => a.createdAt - b.createdAt);

    const data: { name: string; newCodes: number; totalCodes: number }[] = [];
    const seenCodes = new Set<string>();

    // 2. Iterate and track new code discovery
    projectDocs.forEach((doc) => {
      const docSegments = segments.filter((s) => s.documentId === doc.id);
      const docCodes = new Set<string>();
      
      docSegments.forEach(seg => {
        seg.codeIds.forEach(cId => docCodes.add(cId));
      });

      let newCount = 0;
      docCodes.forEach(cId => {
        if (!seenCodes.has(cId)) {
          newCount++;
          seenCodes.add(cId);
        }
      });

      data.push({
        name: doc.name.length > 12 ? doc.name.slice(0, 10) + "..." : doc.name,
        newCodes: newCount,
        totalCodes: seenCodes.size,
      });
    });

    return data;
  }, [activeProjectId, documents, segments]);

  const isSaturated = useMemo(() => {
    if (chartData.length < 3) return false;
    const lastThree = chartData.slice(-3);
    return lastThree.every(d => d.newCodes <= 1);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-xl">
        <TrendingDown className="h-8 w-8 mb-3 text-[var(--text-disabled)]" />
        <p className="text-xs text-[var(--text-muted)] max-w-xs">
          Veri doygunluğunu izlemek için önce belgelerinizi kodlamaya başlayın.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            Veri Doygunluğu Radarı (Saturation Tracker)
            {isSaturated && (
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                Doygunluğa Yakın
              </span>
            )}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Yeni kod keşif hızını belgelere göre takip edin. (APA JARS-Qual)
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Yeni Kodlar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Kümülatif</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-subtle)]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis 
              dataKey="name" 
              fontSize={10} 
              tick={{ fill: 'var(--text-muted)' }} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              fontSize={10} 
              tick={{ fill: 'var(--text-muted)' }} 
              axisLine={false} 
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                background: 'var(--bg-tertiary)', 
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '11px'
              }}
              itemStyle={{ color: 'var(--text-primary)' }}
            />
            <Area 
              type="monotone" 
              dataKey="totalCodes" 
              stroke="#3f3f46" 
              fill="transparent" 
              strokeWidth={2}
              dot={false}
            />
            <Area 
              type="monotone" 
              dataKey="newCodes" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorNew)" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4, stroke: 'var(--bg-secondary)' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Toplam Kod</span>
          <p className="text-2xl font-bold mt-1">{chartData[chartData.length - 1]?.totalCodes || 0}</p>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Son Belge Yeni Kod</span>
          <p className="text-2xl font-bold mt-1 text-blue-500">{chartData[chartData.length - 1]?.newCodes || 0}</p>
        </div>
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <strong>Analiz Notu:</strong> Yeni kod keşif oranı %10'un altına düştüğünde genellikle "teorik doygunluğa" ulaşıldığı kabul edilir.
          </p>
        </div>
      </div>
    </div>
  );
}
