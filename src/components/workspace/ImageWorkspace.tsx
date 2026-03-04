import React, { useRef, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Trash2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { Document, Code } from "@/types";
import { useProjectStore } from "@/store/project.store";
import { useSettingsStore } from "@/store/settings.store";
import { convertFileSrc } from "@tauri-apps/api/core";

interface ImageWorkspaceProps {
    doc: Document;
}

interface RegionRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export function ImageWorkspace({ doc }: ImageWorkspaceProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    const segments = useProjectStore((s: any) => s.segments).filter((sg: any) => sg.documentId === doc.id && sg.regionId);
    const codes = useProjectStore((s: any) => s.codes).filter((c: any) => c.projectId === doc.projectId);

    const addSegment = useProjectStore((s) => s.addSegment);
    const deleteSegment = useProjectStore((s) => s.deleteSegment);
    const updateDocument = useProjectStore((s) => s.updateDocument);
    const createCode = useProjectStore((s) => s.createCode);

    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentRect, setCurrentRect] = useState<RegionRect | null>(null);

    // Zoom / Pan state
    const [zoom, setZoom] = useState(1.0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, px: 0, py: 0 });

    const clampZoom = (z: number) => Math.max(0.5, Math.min(4, z));

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(z => clampZoom(z - e.deltaY * 0.001));
    }, []);

    // Floating Coding Panel state for Image
    const [pendingRegion, setPendingRegion] = useState<RegionRect | null>(null);

    // Mappings 
    const regions = doc.regions || [];

    const handlePointerDown = (e: React.PointerEvent) => {
        // Right click or space-key drag → pan
        if (e.button === 1 || e.altKey) {
            setIsPanning(true);
            panStartRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
        }

        // Only allow left click drawing, and not if we are waiting for a code selection
        if (e.button !== 0 || pendingRegion) return;

        // Prevent drawing on top of existing region if we wanted to make them clickable later,
        // but right now standard is to draw
        const rect = imgRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setIsDrawing(true);
        setStartPos({ x, y });
        setCurrentRect({ x, y, w: 0, h: 0 });
        // Capture pointer events so dragging outside doesn't break
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isPanning) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            setPan({ x: panStartRef.current.px + dx, y: panStartRef.current.py + dy });
            return;
        }

        if (!isDrawing || !imgRef.current) return;
        const rect = imgRef.current.getBoundingClientRect();

        let currentX = ((e.clientX - rect.left) / rect.width) * 100;
        let currentY = ((e.clientY - rect.top) / rect.height) * 100;

        // Clamp to 0-100%
        currentX = Math.max(0, Math.min(100, currentX));
        currentY = Math.max(0, Math.min(100, currentY));

        const x = Math.min(startPos.x, currentX);
        const y = Math.min(startPos.y, currentY);
        const w = Math.abs(currentX - startPos.x);
        const h = Math.abs(currentY - startPos.y);

        setCurrentRect({ x, y, w, h });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isPanning) {
            setIsPanning(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
            return;
        }

        if (!isDrawing) return;
        setIsDrawing(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        // If region is too small, cancel
        if (currentRect && currentRect.w > 2 && currentRect.h > 2) {
            setPendingRegion(currentRect);
        } else {
            setCurrentRect(null);
        }
    };

    const handleApplyCode = (code: Code) => {
        if (!pendingRegion) return;
        saveRegionWithCode(pendingRegion, code.id);
    };

    const handleCreateCode = (name: string) => {
        if (!pendingRegion) return;
        const newCode = createCode(doc.projectId, name);
        saveRegionWithCode(pendingRegion, newCode.id);
    };

    const saveRegionWithCode = (rect: RegionRect, codeId: string) => {
        const newRegionId = crypto.randomUUID();
        const newRegions = [...regions, { id: newRegionId, ...rect }];

        updateDocument(doc.id, { regions: newRegions });

        addSegment({
            documentId: doc.id,
            projectId: doc.projectId,
            start: 0, // unused for image
            end: 0,   // unused for image
            text: "Image Region",
            codeIds: [codeId],
            regionId: newRegionId
        });

        setPendingRegion(null);
        setCurrentRect(null);
    };

    const cancelRegion = () => {
        setPendingRegion(null);
        setCurrentRect(null);
    };

    const removeRegion = (regionId: string) => {
        // Find the segment and delete it
        const seg = segments.find(s => s.regionId === regionId);
        if (seg) deleteSegment(seg.id);

        // Remove from doc regions
        const newRegions = regions.filter(r => r.id !== regionId);
        updateDocument(doc.id, { regions: newRegions });
    };

    return (
        <div className="flex h-full w-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
            {/* LEFT: Image Viewer with Drawing Canvas */}
            <div
                ref={containerRef}
                className="flex-1 flex items-center justify-center relative border-r overflow-hidden select-none"
                style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}
                onWheel={handleWheel}
            >
                {/* Zoom toolbar */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-[var(--bg-secondary)/80] backdrop-blur-sm border border-[var(--border)] rounded-lg p-1 shadow-lg no-export">
                    <button onClick={() => setZoom(z => clampZoom(z + 0.25))} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]" title="Zoom in">
                        <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setZoom(z => clampZoom(z - 0.25))} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]" title="Zoom out">
                        <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-2 text-[10px] font-mono text-[var(--text-muted)]">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]" title="Reset">
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div
                    className="relative flex items-center justify-center p-8"
                    style={{
                        transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                        transformOrigin: "center center",
                        transition: isPanning ? "none" : "transform 0.05s ease-out",
                        cursor: isPanning ? "grabbing" : "default",
                    }}
                >
                    <div className="relative shadow-xl" style={{ display: 'inline-block' }}>
                        <img
                            ref={imgRef}
                            src={doc.content.startsWith('/') ? convertFileSrc(doc.content) : doc.content}
                            alt={doc.name}
                            draggable={false}
                            className="block max-w-full max-h-full object-contain pointer-events-none"
                            style={{ maxHeight: '80vh' }}
                        />

                        {/* SVG Overlay to perfectly map over image dimensions */}
                        <svg
                            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            style={{ zIndex: 10 }}
                        >
                            {/* Render existing coded regions */}
                            {regions.map(r => {
                                // Find associated code color
                                const seg = segments.find(s => s.regionId === r.id);
                                const code = seg ? codes.find(c => seg.codeIds.includes(c.id)) : null;
                                const color = code?.color || "var(--accent)";

                                return (
                                    <g key={r.id} className="group transition-opacity hover:opacity-100">
                                        <rect
                                            x={`${r.x}%`}
                                            y={`${r.y}%`}
                                            width={`${r.w}%`}
                                            height={`${r.h}%`}
                                            fill={`${color}40`} // 25% opacity
                                            stroke={color}
                                            strokeWidth="2"
                                            rx="2"
                                        />
                                    </g>
                                )
                            })}

                            {/* Render currently drawing region */}
                            {currentRect && (
                                <rect
                                    x={`${currentRect.x}%`}
                                    y={`${currentRect.y}%`}
                                    width={`${currentRect.w}%`}
                                    height={`${currentRect.h}%`}
                                    fill="var(--accent-subtle)"
                                    stroke="var(--accent)"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                    rx="2"
                                />
                            )}
                        </svg>
                    </div>
                </div>

                {/* Coding Panel anchored relative to Workspace */}
                <AnimatePresence>
                    {pendingRegion && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-black/10 backdrop-blur-sm">
                            <div className="pointer-events-auto shadow-2xl scale-110">
                                <CodeAssignPanel
                                    selectionText="Assign code to region"
                                    codes={codes}
                                    onApply={handleApplyCode}
                                    onCreate={handleCreateCode}
                                    onClose={cancelRegion}
                                />
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* RIGHT: Coded Regions List */}
            <div className="w-[320px] flex-shrink-0 flex flex-col bg-[var(--surface)]">
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
                    <h3 className="text-[12px] font-bold tracking-widest uppercase text-[var(--text-muted)] flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Regions
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)]">
                        {regions.length}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {regions.length === 0 && (
                        <div className="text-center opacity-50 mt-10">
                            <p className="text-xs">Draw a box on the image to code a region.</p>
                        </div>
                    )}

                    {regions.map((r, i) => {
                        const seg = segments.find(s => s.regionId === r.id);
                        const segCodes = codes.filter((c) => seg?.codeIds.includes(c.id));

                        return (
                            <div key={r.id} className="p-3 rounded-lg border bg-[var(--bg-secondary)] relative group transition-colors" style={{ borderColor: "var(--border)" }}>
                                <div className="font-mono text-[10px] text-[var(--text-muted)] mb-2 uppercase tracking-wide">
                                    Region #{i + 1}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {segCodes.map(c => (
                                        <span key={c.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${c.color}15`, color: c.color, border: `1px solid ${c.color}30` }}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                                            {c.name}
                                        </span>
                                    ))}
                                    {segCodes.length === 0 && <span className="text-[11px] text-[var(--danger)]">Unassigned</span>}
                                </div>

                                <button
                                    onClick={() => removeRegion(r.id)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded transition bg-red-500/10 hover:bg-red-500/20 text-red-500"
                                    title="Delete Region"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
