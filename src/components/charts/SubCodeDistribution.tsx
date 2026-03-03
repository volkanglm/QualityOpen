import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Code, Segment } from '@/types';

interface SubCodeDistributionProps {
    codes: Code[];
    segments: Segment[];
}

export function SubCodeDistribution({ codes, segments }: SubCodeDistributionProps) {
    const { data, activeChildNames, childColors } = useMemo(() => {
        // 1. Calculate frequencies for all codes
        const codeFreqs = new Map<string, number>();
        for (const seg of segments) {
            for (const cid of seg.codeIds) {
                codeFreqs.set(cid, (codeFreqs.get(cid) || 0) + 1);
            }
        }

        // 2. Identify parents and children
        const parents = codes.filter(c => !c.parentId);

        const chartData = [];
        const childColors: Record<string, string> = {};
        const activeChildNames = new Set<string>();

        for (const parent of parents) {
            const children = codes.filter(c => c.parentId === parent.id);
            if (children.length === 0) continue;

            let parentHasData = false;
            const dataRow: any = { name: parent.name };

            for (const child of children) {
                const freq = codeFreqs.get(child.id) || 0;
                if (freq > 0) {
                    dataRow[child.name] = freq;
                    childColors[child.name] = child.color;
                    activeChildNames.add(child.name);
                    parentHasData = true;
                }
            }

            if (parentHasData) {
                chartData.push(dataRow);
            }
        }

        return {
            data: chartData,
            activeChildNames: Array.from(activeChildNames),
            childColors
        };
    }, [codes, segments]);

    if (data.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-[11px] text-[var(--text-muted)] p-6 text-center">
                Alt kod hiyerarşisi bulunamadı. İçeriğe kod grupları atamaya başlayın.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
            >
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}
                    width={120}
                />
                <Tooltip
                    cursor={{ fill: 'var(--surface-active)' }}
                    contentStyle={{
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        boxShadow: 'var(--float-shadow)'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                    labelStyle={{ marginBottom: '6px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                {activeChildNames.map(name => (
                    <Bar
                        key={name}
                        dataKey={name}
                        stackId="a"
                        fill={childColors[name]}
                        radius={[0, 4, 4, 0]}
                        barSize={24}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
