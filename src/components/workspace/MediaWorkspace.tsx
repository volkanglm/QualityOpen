import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, FileAudio, FileText, FileVideo, Import, Loader2, Maximize, MessageSquare, Pause, Play, Plus, Search, Tag, X } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Document, Code } from "@/types";
import { useProjectStore } from "@/store/project.store";
import { SearchHighlighter } from "@/components/editor/SearchHighlighter";
import { FloatingMenu, type FloatingMenuPos } from "@/components/editor/FloatingMenu";
import { CodeAssignPanel } from "@/components/editor/CodeAssignPanel";
import { ContextCodeMenu } from "@/components/editor/ContextCodeMenu";
import { parseSubtitleFile, transcribeWithWhisper } from "@/services/transcriptionService";

interface MediaWorkspaceProps {
    doc: Document;
}

function getOffsets(range: Range, container: HTMLElement | null) {
    if (!container) return { start: 0, end: 0 };
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    const end = start + range.toString().length;
    return { start, end };
}

export function MediaWorkspace({ doc }: MediaWorkspaceProps) {
    const mediaRef = useRef<HTMLMediaElement>(null);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);

    const segments = useProjectStore((s) => s.segments).filter(sg => sg.documentId === doc.id);
    const codes = useProjectStore((s) => s.codes).filter(c => c.projectId === doc.projectId);
    const addSegment = useProjectStore((s) => s.addSegment);
    const updateDocument = useProjectStore((s) => s.updateDocument);
    const createCode = useProjectStore((s) => s.createCode);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(doc.mediaDuration || 0);

    const [transcribing, setTranscribing] = useState(false);

    // Selection / Coding state
    const [floatPos, setFloatPos] = useState<{ centerX: number; topY: number; text: string; start: number; end: number } | null>(null);
    const [codePanelSel, setCodePanelSel] = useState<{ text: string; start: number; end: number } | null>(null);
    const [ctxMenu, setCtxMenu] = useState<{ x: number, y: number, pos: any } | null>(null);

    // Combine transcript text for highlighting mapped offsets
    const fullTranscriptText = useMemo(() => {
        return (doc.transcript || []).map(t => `${t.start.toFixed(1)} - ${t.end.toFixed(1)}\n${t.text}`).join("\n\n");
    }, [doc.transcript]);

    // Handle standard QualityOpen mouse selection for the transcript text
    const handleMouseUp = useCallback(() => {
        if (ctxMenu) return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
            setFloatPos(null);
            return;
        }
        const range = sel.getRangeAt(0);
        const text = sel.toString().trim();
        if (!text) { setFloatPos(null); return; }

        const rect = range.getBoundingClientRect();
        const { start, end } = getOffsets(range, transcriptContainerRef.current);

        setFloatPos({
            centerX: rect.left + rect.width / 2,
            topY: rect.top,
            text,
            start,
            end,
        });
    }, [ctxMenu]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? "";
        if (!text) return;
        e.preventDefault();
        setFloatPos(null);
        const range = sel!.getRangeAt(0);
        const { start, end } = getOffsets(range, transcriptContainerRef.current);
        setCtxMenu({
            x: e.clientX,
            y: e.clientY,
            pos: { text, start, end },
        });
    }, []);

    const handleTimeUpdate = () => {
        if (mediaRef.current) setCurrentTime(mediaRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (mediaRef.current) {
            setDuration(mediaRef.current.duration);
            if (!doc.mediaDuration) updateDocument(doc.id, { mediaDuration: mediaRef.current.duration });
        }
    };

    const jumpTo = (time: number) => {
        if (mediaRef.current) mediaRef.current.currentTime = time;
    };

    // ── Handlers for Whisper or SRT
    const handleImportSrt = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const parsed = parseSubtitleFile(text);
        updateDocument(doc.id, { transcript: parsed });
    };

    const handleWhisperAI = async () => {
        const defaultKey = localStorage.getItem("qo_openai_key");
        if (!defaultKey) {
            alert("Please save your OpenAI key in Settings to use Whisper AI transcription.");
            return;
        }

        setTranscribing(true);
        try {
            // Blobs can be used if it's a proxy url, but doc.content is a blobURL. We need to fetch it to File.
            const res = await fetch(doc.content);
            const blob = await res.blob();
            const file = new File([blob], doc.name + ".mp4", { type: blob.type });
            const parsed = await transcribeWithWhisper(defaultKey, file);
            updateDocument(doc.id, { transcript: parsed });
        } catch (err: any) {
            alert("Transcription Failed: " + err.message);
        } finally {
            setTranscribing(false);
        }
    };

    const isAudio = (doc.mediaType === "audio" || (doc.content && doc.content.includes("audio")));

    console.log("MediaWorkspace Render - HMR Cache Buster");

    return (
        <div className="flex h-full w-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
            {/* LEFT: Media Player */}
            <div className="flex-1 flex flex-col border-r relative" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="flex-1 bg-black flex items-center justify-center p-8 relative overflow-hidden group">
                    {isAudio ? (
                        <div className="flex flex-col items-center gap-6 justify-center">
                            <FileAudio className="w-24 h-24 text-[var(--accent)] opacity-80" />
                            <p className="text-white/50 font-bold tracking-widest text-sm uppercase">Audio Analysis Model</p>
                            <audio
                                ref={mediaRef as any}
                                src={doc.content.startsWith('/') ? convertFileSrc(doc.content) : doc.content}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <video
                            ref={mediaRef as any}
                            src={doc.content.startsWith('/') ? convertFileSrc(doc.content) : doc.content}
                            className="max-h-full max-w-full rounded-lg shadow-2xl transition-all"
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                        />
                    )}

                    {/* Custom Elegant Player Controls Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-2">
                        <div
                            className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer relative"
                            onClick={(e) => {
                                if (!duration || !mediaRef.current) return;
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = e.clientX - rect.left;
                                mediaRef.current.currentTime = (x / rect.width) * duration;
                            }}
                        >
                            <div
                                className="absolute inset-y-0 left-0 bg-[var(--accent)] rounded-full transition-all duration-75"
                                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-white text-xs font-mono">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        const media = mediaRef.current as any;
                                        if (!media) return;
                                        if (isPlaying) {
                                            media.pause();
                                        } else {
                                            const playPromise = media.play();
                                            if (playPromise !== undefined) {
                                                playPromise.catch(() => { /* user-interrupted */ });
                                            }
                                        }
                                    }}
                                    className="hover:scale-110 transition-transform"
                                >
                                    {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                                </button>
                                <span>
                                    {new Date(currentTime * 1000).toISOString().substr(14, 5)} / {new Date((duration || 0) * 1000).toISOString().substr(14, 5)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Transcript Pane */}
            <div className="w-[450px] flex-shrink-0 flex flex-col bg-[var(--bg-secondary)] relative">
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
                    <h3 className="text-[12px] font-bold tracking-widest uppercase text-[var(--text-muted)]">Transcript</h3>

                    {/* Import Actions if no transcript */}
                    {!doc.transcript?.length && (
                        <div className="flex items-center gap-2">
                            <label className="cursor-pointer text-[10px] font-bold tracking-wider uppercase bg-[var(--surface-hover)] hover:bg-[var(--border)] px-3 py-1.5 rounded transition text-[var(--text-primary)]">
                                <input type="file" accept=".srt,.vtt" className="hidden" onChange={handleImportSrt} />
                                <span className="flex items-center gap-1.5"><Import className="w-3.5 h-3.5" /> Import SRT</span>
                            </label>
                            <button
                                onClick={handleWhisperAI}
                                disabled={transcribing}
                                className="text-[10px] font-bold tracking-wider uppercase bg-[var(--accent)] text-white px-3 py-1.5 rounded transition hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {transcribing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                Whisper AI
                            </button>
                        </div>
                    )}
                </div>

                <div
                    className="flex-1 overflow-y-auto p-6 text-[14px] leading-relaxed select-text"
                    style={{ color: "var(--text-primary)" }}
                    ref={transcriptContainerRef}
                    onMouseUp={handleMouseUp}
                    onContextMenu={handleContextMenu}
                >
                    {doc.transcript?.length ? (
                        <div className="relative">
                            {/* We render the continuous text visually identical to the combined mapped string so Selection offsets match perfectly */}
                            <SearchHighlighter
                                content={fullTranscriptText}
                                segments={segments}
                                codes={codes}
                                searchQuery=""
                            />

                            {/* Clickable transparent overlays over timestamps to allow seeking */}
                            <div className="absolute inset-0 pointer-events-none" style={{ fontFamily: "inherit" }}>
                                {(doc.transcript || []).map((tBlock) => {
                                    // Render invisible bounding anchors that intercept clicks strictly on their timestamps
                                    return (
                                        <div key={tBlock.id} className="mb-[1em]">
                                            <span
                                                className="pointer-events-auto cursor-pointer hover:underline text-transparent selection:bg-transparent"
                                                onClick={() => jumpTo(tBlock.start)}
                                                title="Jump to time"
                                            >
                                                {`${tBlock.start.toFixed(1)} - ${tBlock.end.toFixed(1)}`}
                                            </span>
                                            <br />
                                            <span className="text-transparent selection:bg-transparent">{tBlock.text}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-50 text-center px-8">
                            <FileVideo className="w-12 h-12 mb-4" />
                            <p className="text-sm">No transcript available.</p>
                            <p className="text-xs mt-2">Generate via Whisper AI or import an SRT file to begin coding this media.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating & Context Menus for Coding the Transcript */}
            <FloatingMenu
                pos={floatPos}
                onAssignCode={(pos: FloatingMenuPos) => setCodePanelSel(pos)}
                onHighlight={() => {
                    if (!floatPos) return;
                    addSegment({ documentId: doc.id, projectId: doc.projectId, start: floatPos.start, end: floatPos.end, text: floatPos.text, codeIds: [], isHighlight: true, highlightColor: "#fcd34d" });
                    setFloatPos(null);
                    window.getSelection()?.removeAllRanges();
                }}
                onAskAI={() => { }}
                onSummarize={() => { }}
                onDismiss={() => setFloatPos(null)}
            />

            <AnimatePresence>
                {codePanelSel && (
                    <CodeAssignPanel
                        key="code-panel"
                        selectionText={codePanelSel.text}
                        codes={codes}
                        onApply={(code: Code) => {
                            addSegment({ documentId: doc.id, projectId: doc.projectId, start: codePanelSel.start, end: codePanelSel.end, text: codePanelSel.text, codeIds: [code.id] });
                            setCodePanelSel(null);
                            setFloatPos(null);
                            window.getSelection()?.removeAllRanges();
                        }}
                        onCreate={(name: string) => {
                            const c = createCode(doc.projectId, name);
                            addSegment({ documentId: doc.id, projectId: doc.projectId, start: codePanelSel.start, end: codePanelSel.end, text: codePanelSel.text, codeIds: [c.id] });
                            setCodePanelSel(null);
                            setFloatPos(null);
                            window.getSelection()?.removeAllRanges();
                        }}
                        onClose={() => setCodePanelSel(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {ctxMenu && (
                    <ContextCodeMenu
                        key="ctx-menu"
                        x={ctxMenu.x}
                        y={ctxMenu.y}
                        codes={codes}
                        selectedText={ctxMenu.pos.text}
                        onSelect={(code: Code) => {
                            addSegment({ documentId: doc.id, projectId: doc.projectId, start: ctxMenu.pos.start, end: ctxMenu.pos.end, text: ctxMenu.pos.text, codeIds: [code.id] });
                            setCtxMenu(null);
                            window.getSelection()?.removeAllRanges();
                        }}
                        onCreate={(name: string) => {
                            const c = createCode(doc.projectId, name);
                            addSegment({ documentId: doc.id, projectId: doc.projectId, start: ctxMenu.pos.start, end: ctxMenu.pos.end, text: ctxMenu.pos.text, codeIds: [c.id] });
                            setCtxMenu(null);
                            window.getSelection()?.removeAllRanges();
                        }}
                        onClose={() => setCtxMenu(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
