import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  BarChart2,
  Cloud,
  Grid3X3,
  Network,
  FileText,
  Tag,
  Hash,
  TrendingUp,
  Download,
} from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { BubbleCloud } from "@/components/charts/BubbleCloud";
import { HeatmapMatrix } from "@/components/charts/HeatmapMatrix";
import { CoOccurrenceGraph } from "@/components/charts/CoOccurrenceGraph";
import type { Code, Document as QODocument, Segment } from "@/types";
import { flattenCodes, calculateHierarchicalCounts, FlatCode } from "@/lib/tree";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "overview" | "cloud" | "matrix" | "network";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Genel Bakış", icon: BarChart2 },
  { id: "cloud", label: "Kod Bulutu", icon: Cloud },
  { id: "matrix", label: "Matris", icon: Grid3X3 },
  { id: "network", label: "Ağ Haritası", icon: Network },
];

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.2, 0, 0, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.14 } },
};

// ─── Main AnalysisPage ────────────────────────────────────────────────────────

export function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { activeProjectId } = useAppStore();
  const { documents, codes, segments } = useProjectStore();

  const projectDocs = documents.filter((d) => d.projectId === activeProjectId);
  const projectCodes = codes.filter((c) => c.projectId === activeProjectId);
  const projectSegments = segments.filter((s) => s.projectId === activeProjectId);

  if (!activeProjectId) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Analiz için bir proje seçin.
        </p>
      </div>
    );
  }

  const segmentsCountMap = new Map<string, number>();
  projectCodes.forEach(c => {
    const count = projectSegments.filter(s => s.codeIds.includes(c.id)).length;
    segmentsCountMap.set(c.id, count);
  });

  const hierarchicalCounts = calculateHierarchicalCounts(projectCodes, segmentsCountMap);

  // For visualizations, we want a flattened list that respects hierarchy
  const flatProjectCodes = flattenCodes(projectCodes, undefined, 0);

  const codeFrequency = flatProjectCodes.map((c) => ({
    code: c,
    count: hierarchicalCounts.get(c.id) || 0,
    ownCount: segmentsCountMap.get(c.id) || 0,
    depth: c.depth,
  }));

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-6 py-2.5 border-b"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Analiz
          </h1>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {projectCodes.length} kod · {projectSegments.length} segment · {projectDocs.length} belge
          </p>
        </div>

        {/* Tab switcher */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-[var(--radius-md)]"
          style={{ background: "var(--surface)" }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors"
                style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)", background: "transparent" }}
              >
                {isActive && (
                  <motion.span
                    layoutId="analysis-tab-bg"
                    className="absolute inset-0 rounded-[var(--radius-sm)]"
                    style={{ background: "var(--surface-active)" }}
                    transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                  />
                )}
                <Icon className="h-3.5 w-3.5 relative z-10 flex-shrink-0" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Export hint */}
        <button
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--radius-sm)] text-[11px] transition-colors"
          style={{ color: "var(--text-muted)", background: "transparent" }}
          title="Dışa aktar (yakında)"
          disabled
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="h-full overflow-y-auto"
            >
              <OverviewTab
                docs={projectDocs}
                codes={projectCodes}
                segments={projectSegments}
                codeFrequency={codeFrequency}
              />
            </motion.div>
          )}

          {activeTab === "cloud" && (
            <motion.div
              key="cloud"
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="h-full overflow-hidden p-5"
            >
              <ChartCard
                title="Kod Bulutu"
                subtitle="Kodların segment sayısına göre boyutlandırılmış görünümü"
              >
                <BubbleCloud items={codeFrequency} />
              </ChartCard>
            </motion.div>
          )}

          {activeTab === "matrix" && (
            <motion.div
              key="matrix"
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="h-full overflow-hidden p-5"
            >
              <ChartCard
                title="Kod Matrisi"
                subtitle="Her belgede hangi kodların ne sıklıkla kullanıldığı"
              >
                <HeatmapMatrix
                  codes={projectCodes}
                  docs={projectDocs}
                  segments={projectSegments}
                />
              </ChartCard>
            </motion.div>
          )}

          {activeTab === "network" && (
            <motion.div
              key="network"
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="h-full overflow-hidden p-5"
            >
              <ChartCard
                title="Ko-Occurrence Ağı"
                subtitle="Birlikte kullanılan kodlar arasındaki ilişki haritası"
              >
                <CoOccurrenceGraph
                  codes={projectCodes}
                  segments={projectSegments}
                />
              </ChartCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Chart card wrapper ───────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col h-full rounded-[var(--radius-lg)] border overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
    >
      <div
        className="flex-shrink-0 px-5 py-3 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      </div>
      {/* analysis-chart-area: used by ExportMenu PNG/JPEG capture */}
      <div className="flex-1 overflow-hidden analysis-chart-area">
        {children}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  docs,
  codes,
  segments,
  codeFrequency,
}: {
  docs: QODocument[];
  codes: Code[];
  segments: Segment[];
  codeFrequency: { code: FlatCode; count: number; ownCount: number; depth: number }[];
}) {
  const stats = [
    { label: "Belgeler", value: docs.length, color: "var(--text-muted)", icon: FileText },
    { label: "Kodlar", value: codes.length, color: "var(--text-muted)", icon: Tag },
    { label: "Segmentler", value: segments.length, color: "var(--text-muted)", icon: Hash },
    {
      label: "Seg./Belge",
      value: docs.length ? (segments.length / docs.length).toFixed(1) : "0",
      color: "var(--text-muted)",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="p-5 space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.18, ease: [0.2, 0, 0, 1] }}
              className="rounded-[var(--radius-md)] border p-4"
              style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
            >
              <div
                className="h-8 w-8 rounded-[var(--radius-sm)] flex items-center justify-center mb-3"
                style={{ background: "var(--surface)" }}
              >
                <Icon className="h-4 w-4" style={{ color: stat.color }} />
              </div>
              <AnimatedCounter
                value={typeof stat.value === "number" ? stat.value : parseFloat(stat.value as string) || 0}
                className="text-2xl font-bold block"
                style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}
              />
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-5 gap-4">
        {/* Code frequency bar chart */}
        <div
          className="col-span-3 rounded-[var(--radius-lg)] border p-5"
          style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart2
              className="h-3.5 w-3.5"
              style={{ color: "var(--text-muted)" }}
            />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Kod Frekansı
            </h2>
            <span
              className="ml-auto text-[10px]"
              style={{ color: "var(--text-disabled)" }}
            >
              segment sayısına göre sıralı
            </span>
          </div>
          <CodeBarChart items={codeFrequency} />
        </div>

        {/* Donut + document list */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Donut chart */}
          <div
            className="rounded-[var(--radius-lg)] border p-4 flex flex-col items-center"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
          >
            <p
              className="text-xs font-semibold mb-3 self-start"
              style={{ color: "var(--text-primary)" }}
            >
              Kod Dağılımı
            </p>
            <DonutChart items={codeFrequency} />
          </div>

          {/* Document coverage */}
          <div
            className="rounded-[var(--radius-lg)] border p-4 flex-1 overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
          >
            <p
              className="text-xs font-semibold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Belge Kapsamı
            </p>
            <div className="space-y-1.5 overflow-y-auto max-h-44">
              {docs.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Henüz belge yok.
                </p>
              ) : (
                docs.map((doc, i) => {
                  const segs = segments.filter((s) => s.documentId === doc.id);
                  const maxSeg = Math.max(...docs.map((d) =>
                    segments.filter((s) => s.documentId === d.id).length
                  ), 1);
                  const pct = segs.length / maxSeg;
                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.15, ease: [0.2, 0, 0, 1] }}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{
                          background: segs.length > 0 ? "var(--code-2)" : "var(--text-disabled)",
                        }}
                      />
                      <span
                        className="text-[11px] truncate flex-1 min-w-0"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {doc.name}
                      </span>
                      <div
                        className="h-1 rounded-full overflow-hidden flex-shrink-0"
                        style={{ width: 44, background: "var(--surface)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct * 100}%` }}
                          transition={{ delay: i * 0.03 + 0.12, duration: 0.22, ease: [0.2, 0, 0, 1] }}
                          className="h-full rounded-[var(--radius-xs)]"
                          style={{ background: "var(--border-strong)" }}
                        />
                      </div>
                      <span
                        className="text-[10px] flex-shrink-0 font-mono"
                        style={{ color: "var(--text-muted)", width: 20, textAlign: "right" }}
                      >
                        {segs.length}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedCounter({
  value,
  className,
  style,
}: {
  value: number;
  className: string;
  style: React.CSSProperties;
}) {
  const [displayed, setDisplayed] = useState(0);
  const start = useRef(0);

  useEffect(() => {
    const target = value;
    const duration = 600;
    const from = start.current;
    const startAt = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startAt;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayed(from + (target - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
      else start.current = target;
    };
    requestAnimationFrame(tick);
  }, [value]);

  const isFloat = !Number.isInteger(value);
  return (
    <span className={className} style={style}>
      {isFloat ? displayed.toFixed(1) : Math.round(displayed)}
    </span>
  );
}

// ─── Code bar chart ───────────────────────────────────────────────────────────

function CodeBarChart({ items }: { items: { code: FlatCode; count: number; ownCount: number; depth: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setW] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((e) => setW(e[0].contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (items.length === 0) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
        Henüz kod uygulanmadı.
      </p>
    );
  }

  const maxCount = Math.max(...items.map((i) => i.count), 1);
  const BAR_H = 22;
  const GAP = 6;
  const LABEL_W = 110;
  const NUM_W = 28;
  const BAR_W = Math.max(100, width - LABEL_W - NUM_W - 16);
  const svgH = items.length * (BAR_H + GAP) + 4;

  return (
    <div ref={containerRef} className="w-full">
      <svg width={width} height={svgH} style={{ overflow: "visible" }}>
        {items.map(({ code, count, ownCount }, i) => {
          const y = i * (BAR_H + GAP);
          const barLen = BAR_W * (count / maxCount);
          const label = code.name.length > 14 ? code.name.slice(0, 13) + "…" : code.name;
          return (
            <g key={code.id}>
              {/* Color dot */}
              <circle
                cx={6}
                cy={y + BAR_H / 2}
                r={4}
                fill={code.color}
                opacity={0.85}
              />

              {/* Code name with indentation */}
              <text
                x={18 + code.depth * 12}
                y={y + BAR_H / 2}
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={code.depth === 0 ? "600" : "500"}
                fill={code.depth === 0 ? "var(--text-primary)" : "var(--text-secondary)"}
                fontFamily="Inter, system-ui, sans-serif"
                style={{ userSelect: "none" }}
              >
                {label}
              </text>

              {/* Bar track */}
              <rect
                x={LABEL_W}
                y={y + 3}
                width={BAR_W}
                height={BAR_H - 6}
                rx={4}
                fill="var(--surface)"
              />

              {/* Animated bar */}
              <motion.rect
                x={LABEL_W}
                y={y + 3}
                height={BAR_H - 6}
                rx={4}
                fill={code.color}
                fillOpacity={0.75}
                initial={{ width: 0 }}
                animate={{ width: Math.max(barLen, count > 0 ? 6 : 0) }}
                transition={{
                  delay: i * 0.04 + 0.1,
                  duration: 0.22,
                  ease: [0.2, 0, 0, 1],
                }}
              />

              {/* Count label */}
              <motion.text
                x={LABEL_W + BAR_W + 8}
                y={y + BAR_H / 2}
                dominantBaseline="middle"
                fontSize={10}
                fontWeight="600"
                fill="var(--text-muted)"
                fontFamily="'SF Mono','Fira Code',monospace"
                style={{ userSelect: "none" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 + 0.2 }}
              >
                {count} {count !== ownCount && `(${ownCount})`}
              </motion.text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

function DonutChart({ items }: { items: { code: FlatCode; count: number; ownCount: number }[] }) {
  const [hov, setHov] = useState<string | null>(null);

  // For donut, we only want to show top-level codes to avoid double counting segments, 
  // OR we show only bottom-level codes. Let's show only top-level codes for the "Distribution".
  const filtered = items.filter((i) => i.code.depth === 0 && i.count > 0);
  const total = filtered.reduce((s, i) => s + i.count, 0);

  const SIZE = 110;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 40;
  const INNER = 22;

  if (filtered.length === 0) {
    return (
      <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>
        Veri yok
      </p>
    );
  }

  // Build arc paths
  let currentAngle = -Math.PI / 2;

  const arcs = filtered.map(({ code, count }) => {
    const pct = count / total;
    const angle = pct * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startOuter = polar(CX, CY, R, startAngle);
    const endOuter = polar(CX, CY, R, endAngle);
    const startInner = polar(CX, CY, INNER, startAngle);
    const endInner = polar(CX, CY, INNER, endAngle);
    const large = angle > Math.PI ? 1 : 0;

    const path =
      `M ${startOuter.x} ${startOuter.y} ` +
      `A ${R} ${R} 0 ${large} 1 ${endOuter.x} ${endOuter.y} ` +
      `L ${endInner.x} ${endInner.y} ` +
      `A ${INNER} ${INNER} 0 ${large} 0 ${startInner.x} ${startInner.y} Z`;

    return { code, count, pct, path, startAngle, endAngle };
  });

  const hovData = hov ? arcs.find((a) => a.code.id === hov) : null;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div style={{ position: "relative" }}>
        <svg width={SIZE} height={SIZE}>
          {arcs.map(({ code, path }, i) => (
            <motion.path
              key={code.id}
              d={path}
              fill={code.color}
              fillOpacity={hov === code.id ? 0.95 : hov ? 0.35 : 0.80}
              stroke="var(--bg-secondary)"
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity: 1,
                scale: hov === code.id ? 1.06 : 1,
              }}
              transition={{ delay: i * 0.04, duration: 0.18, ease: [0.2, 0, 0, 1] }}
              style={{ transformOrigin: `${CX}px ${CY}px`, cursor: "default" }}
              onHoverStart={() => setHov(code.id)}
              onHoverEnd={() => setHov(null)}
            />
          ))}

          {/* Center text */}
          <text
            x={CX}
            y={CY - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={hovData ? 11 : 14}
            fontWeight="700"
            fill="var(--text-primary)"
            style={{ pointerEvents: "none", userSelect: "none", transition: "font-size 0.15s" }}
          >
            {hovData ? hovData.count : total}
          </text>
          <text
            x={CX}
            y={CY + 10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="var(--text-muted)"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {hovData ? `${(hovData.pct * 100).toFixed(0)}%` : "toplam"}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="w-full space-y-1 max-h-28 overflow-y-auto">
        {arcs.map(({ code, pct }) => (
          <div
            key={code.id}
            className="flex items-center gap-1.5 cursor-default"
            onMouseEnter={() => setHov(code.id)}
            onMouseLeave={() => setHov(null)}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: code.color,
                flexShrink: 0,
                opacity: hov && hov !== code.id ? 0.4 : 1,
              }}
            />
            <span
              className="text-[10px] truncate flex-1"
              style={{
                color: hov === code.id ? "var(--text-primary)" : "var(--text-secondary)",
                opacity: hov && hov !== code.id ? 0.5 : 1,
              }}
            >
              {code.name}
            </span>
            <span
              className="text-[10px] font-mono flex-shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              {(pct * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}
