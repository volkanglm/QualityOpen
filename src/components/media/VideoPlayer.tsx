import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Bookmark, RotateCcw } from "lucide-react";
import { formatVideoTime } from "@/lib/utils";
import type { Segment, Code } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoPlayerProps {
  src:              string;
  segments:         Segment[];
  codes:            Code[];
  onAddTimestamp:   (seconds: number) => void;
  onDurationChange?: (seconds: number) => void;
}

// ─── Timeline Marker ─────────────────────────────────────────────────────────

function TimelineMarker({
  segment,
  codes,
  pct,
}: {
  segment: Segment;
  codes:   Code[];
  pct:     number;
}) {
  const [hovered, setHovered] = useState(false);

  const segCodes = codes.filter((c) => segment.codeIds.includes(c.id));
  const color    = segment.isHighlight
    ? (segment.highlightColor ?? "#fcd34d")
    : (segCodes[0]?.color ?? "#a78bfa");

  return (
    <div
      className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 z-10"
      style={{ left: `${pct * 100}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Marker dot */}
      <motion.div
        animate={{ scale: hovered ? 1.5 : 1 }}
        transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
        className="h-3 w-3 rounded-full cursor-pointer"
        style={{
          background: color,
          border:     "2px solid var(--bg-primary)",
        }}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.88 }}
            transition={{ duration: 0.13, ease: [0.2, 0, 0, 1] }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[110px] max-w-[180px] rounded-[var(--radius-sm)] border px-2.5 py-2"
            style={{
              background:  "var(--bg-secondary)",
              borderColor: "var(--border)",
              boxShadow:   "var(--float-shadow)",
            }}
            // prevent timeline events from firing while hovering tooltip
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Timestamp */}
            <p
              className="text-[10px] font-mono font-semibold mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              {formatVideoTime(segment.start)}
            </p>

            {/* Code tags */}
            <div className="flex flex-col gap-1">
              {segCodes.length > 0 ? (
                segCodes.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ background: c.color }}
                    />
                    <span
                      className="text-[11px] leading-tight truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {c.name}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Vurgulama
                </span>
              )}
            </div>

            {/* Arrow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full"
              style={{
                width:       0,
                height:      0,
                borderLeft:  "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop:   "4px solid var(--bg-secondary)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VideoPlayer({
  src,
  segments,
  codes,
  onAddTimestamp,
  onDurationChange,
}: VideoPlayerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [playing,      setPlaying]      = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [muted,        setMuted]        = useState(false);
  const [videoError,   setVideoError]   = useState(false);
  const [hoverPct,     setHoverPct]     = useState<number | null>(null);
  const [hoverTime,    setHoverTime]    = useState(0);
  const [isDragging,   setIsDragging]   = useState(false);

  // Wire up native video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime  = () => setCurrentTime(v.currentTime);
    const onMeta  = () => {
      setDuration(v.duration);
      onDurationChange?.(v.duration);
    };
    const onErr   = () => setVideoError(true);
    v.addEventListener("play",             onPlay);
    v.addEventListener("pause",            onPause);
    v.addEventListener("timeupdate",       onTime);
    v.addEventListener("loadedmetadata",   onMeta);
    v.addEventListener("error",            onErr);
    return () => {
      v.removeEventListener("play",           onPlay);
      v.removeEventListener("pause",          onPause);
      v.removeEventListener("timeupdate",     onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("error",          onErr);
    };
  }, [onDurationChange]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    playing ? v.pause() : v.play();
  };

  const seekToPct = useCallback((pct: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = Math.max(0, Math.min(1, pct)) * duration;
  }, [duration]);

  // ── Timeline interaction ──────────────────────────────────────────────────

  const getPct = (clientX: number): number => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    seekToPct(getPct(e.clientX));
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    const pct  = getPct(e.clientX);
    setHoverPct(pct);
    setHoverTime(pct * duration);
    if (isDragging) seekToPct(pct);
  };

  const handleTimelineDoubleClick = (e: React.MouseEvent) => {
    // Double-click: add timestamp at that position
    const pct = getPct(e.clientX);
    const seconds = pct * duration;
    seekToPct(pct);
    onAddTimestamp(seconds);
  };

  // Global mouseup to stop drag
  useEffect(() => {
    const up = () => setIsDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  // ── Error state ───────────────────────────────────────────────────────────

  if (videoError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div
          className="h-12 w-12 rounded-[var(--radius-sm)] flex items-center justify-center"
          style={{ background: "var(--surface)" }}
        >
          <RotateCcw className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Video yüklenemedi
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Blob URL geçersiz. Dosyayı yeniden içe aktarın.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col" style={{ background: "#000" }}>

      {/* ── Video area ── */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          src={src}
          className="max-h-full max-w-full"
          muted={muted}
          preload="metadata"
          style={{ userSelect: "none" }}
        />

        {/* Big play/pause overlay on click */}
        <AnimatePresence>
          {!playing && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.7, scale: 1 }}
              exit={{ opacity: 0, scale: 1.15 }}
              transition={{ duration: 0.15 }}
              className="absolute h-14 w-14 rounded-full flex items-center justify-center pointer-events-none"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <Play className="h-6 w-6 text-white ml-1" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls bar ── */}
      <div
        className="flex-shrink-0 px-4 pt-2 pb-3 border-t"
        style={{
          background:   "var(--bg-secondary)",
          borderColor:  "var(--border-subtle)",
        }}
      >
        {/* ── Timeline ── */}
        <div className="relative mb-2.5">
          {/* Hover time bubble */}
          <AnimatePresence>
            {hoverPct !== null && duration > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute bottom-full mb-1 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono pointer-events-none"
                style={{
                  left:       `${hoverPct * 100}%`,
                  background: "var(--surface-active)",
                  color:      "var(--text-secondary)",
                }}
              >
                {formatVideoTime(hoverTime)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Track */}
          <div
            ref={timelineRef}
            className="relative h-1.5 rounded-full cursor-pointer group"
            style={{
              background: "var(--surface)",
              userSelect: "none",
            }}
            onMouseDown={handleTimelineMouseDown}
            onMouseMove={handleTimelineMouseMove}
            onMouseLeave={() => setHoverPct(null)}
            onDoubleClick={handleTimelineDoubleClick}
          >
            {/* Filled progress */}
            <div
              className="h-full rounded-full pointer-events-none transition-none"
              style={{ width: `${progress * 100}%`, background: "var(--accent)" }}
            />

            {/* Playhead thumb */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                left:       `calc(${progress * 100}% - 6px)`,
                height:     "12px",
                width:      "12px",
                background: "var(--accent)",
                border:     "2px solid var(--bg-secondary)",
                boxShadow:  "0 1px 4px rgba(0,0,0,0.4)",
              }}
              whileHover={{ scale: 1.2 }}
            />

            {/* Hover ghost line */}
            {hoverPct !== null && (
              <div
                className="absolute top-0 h-full w-px pointer-events-none opacity-30"
                style={{
                  left:       `${hoverPct * 100}%`,
                  background: "var(--text-muted)",
                }}
              />
            )}

            {/* Timestamp markers */}
            {duration > 0 &&
              segments.map((seg) => (
                <TimelineMarker
                  key={seg.id}
                  segment={seg}
                  codes={codes}
                  pct={seg.start / duration}
                />
              ))}
          </div>

          {/* Double-click hint */}
          {segments.length === 0 && (
            <p
              className="absolute right-0 top-full mt-0.5 text-[9px]"
              style={{ color: "var(--text-disabled)" }}
            >
              Çift tıkla → damga ekle
            </p>
          )}
        </div>

        {/* ── Controls row ── */}
        <div className="flex items-center gap-2.5">
          {/* Play / Pause */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={togglePlay}
            className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {playing
              ? <Pause className="h-3 w-3" />
              : <Play  className="h-3 w-3 ml-0.5" />
            }
          </motion.button>

          {/* Time display */}
          <span
            className="text-[11px] font-mono tabular-nums flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
          >
            {formatVideoTime(currentTime)}
            <span style={{ color: "var(--text-disabled)" }}> / </span>
            {formatVideoTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              if (videoRef.current) videoRef.current.muted = next;
            }}
            className="h-6 w-6 flex items-center justify-center rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")
            }
          >
            {muted
              ? <VolumeX className="h-3.5 w-3.5" />
              : <Volume2 className="h-3.5 w-3.5" />
            }
          </motion.button>

          {/* Segment count badge */}
          {segments.length > 0 && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                background: "var(--accent-subtle)",
                color:      "var(--accent)",
                border:     "1px solid var(--accent-border)",
              }}
            >
              {segments.length} damga
            </span>
          )}

          {/* Add Timestamp */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => onAddTimestamp(currentTime)}
            className="flex items-center gap-1.5 h-6 px-2.5 rounded-[var(--radius-sm)] text-[11px] font-medium"
            style={{
              background:  "var(--accent-subtle)",
              color:       "var(--accent)",
              border:      "1px solid var(--accent-border)",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--surface-hover)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--accent-subtle)")
            }
          >
            <Bookmark className="h-3 w-3" />
            Damga Ekle
          </motion.button>
        </div>
      </div>
    </div>
  );
}
