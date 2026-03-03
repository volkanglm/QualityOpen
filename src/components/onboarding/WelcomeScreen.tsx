import { motion } from "framer-motion";
import { BookOpen, Keyboard } from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";

interface WelcomeScreenProps {
    onNewProject: () => void;
}

export function WelcomeScreen({ onNewProject }: WelcomeScreenProps) {
    const { setCommandPaletteOpen } = useAppStore();
    const { projects } = useProjectStore();
    const hasProjects = projects.length > 0;

    return (
        <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 flex items-center justify-center"
            style={{ background: "var(--bg-primary)" }}
        >
            {/* Subtle dark grid background */}
            <div
                className="absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage:
                        "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Glow */}
            <div
                className="absolute w-[600px] h-[400px] rounded-full blur-[120px] opacity-[0.06] pointer-events-none"
                style={{ background: "var(--accent)", top: "30%", left: "50%", transform: "translate(-50%, -50%)" }}
            />

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4, ease: [0.2, 0, 0, 1] }}
                className="relative flex flex-col items-center text-center z-10 max-w-lg px-6"
            >
                {/* Logo */}
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.35, ease: [0.2, 0, 0, 1] }}
                    className="mb-6"
                >
                    <AppLogo size={52} variant="badge" />
                </motion.div>

                {/* Title */}
                <h1 className="text-2xl font-medium tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                    QualityOpen'a Hoş Geldiniz
                </h1>
                <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
                    Yeni bir araştırma projesi oluşturun veya var olanı açın.
                </p>

                {/* Buttons */}
                <div className="flex items-center gap-3 mb-8">
                    <motion.button
                        onClick={onNewProject}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                        style={{ background: "var(--text-primary)", color: "var(--bg-primary)" }}
                    >
                        <span className="text-base leading-none">+</span>
                        Yeni Proje Oluştur
                    </motion.button>

                    {hasProjects && (
                        <motion.button
                            onClick={() => setCommandPaletteOpen(true)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors"
                            style={{
                                borderColor: "var(--border)",
                                color: "var(--text-secondary)",
                                background: "transparent",
                            }}
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            Proje Aç
                        </motion.button>
                    )}
                </div>

                {/* Tip */}
                <div className="flex items-center gap-1.5" style={{ color: "var(--text-disabled)" }}>
                    <Keyboard className="h-3 w-3 flex-shrink-0" />
                    <span className="text-[11px]">
                        İpucu: Hızlı menü için{" "}
                        <kbd className="font-mono px-1 py-0.5 rounded text-[10px] border" style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--surface)" }}>
                            ⌘K
                        </kbd>{" "}
                        tuşlarına basabilirsiniz.
                    </span>
                </div>
            </motion.div>
        </motion.div>
    );
}
