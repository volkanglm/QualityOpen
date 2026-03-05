import { motion } from "framer-motion";
import { Plus, FolderOpen, Keyboard, BookOpen } from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";

interface WelcomeScreenProps {
    onNewProject: () => void;
    onOpenProject: () => void;
}

export function WelcomeScreen({ onNewProject, onOpenProject }: WelcomeScreenProps) {
    const t = useT();
    const { setCommandPaletteOpen } = useAppStore();
    const { projects } = useProjectStore();
    const hasProjects = projects.length > 0;

    return (
        <div className="flex h-screen w-full items-center justify-center overflow-hidden bg-[#0A0A0A]">
            {/* Subtle Grid Background */}
            <div
                className="absolute inset-0 z-0 opacity-20"
                style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, #333 1px, transparent 0)`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Backdrop Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md px-8 pt-12 pb-16 text-center border border-white/5 bg-white/5 backdrop-blur-xl rounded-[32px] shadow-2xl"
            >
                {/* Logo Icon */}
                <div className="mx-auto mb-8 flex items-center justify-center">
                    <AppLogo size={80} variant="badge" />
                </div>

                <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white">
                    {t('welcome.title')}
                </h1>
                <p className="mb-10 text-pretty text-sm text-neutral-400 leading-relaxed px-4">
                    {t('welcome.subtitle')}
                </p>

                <div className="flex flex-col gap-3">
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full h-12 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-500 transition-all duration-200"
                        onClick={onNewProject}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('welcome.newProject')}
                    </Button>

                    <Button
                        variant="ghost"
                        size="lg"
                        className="w-full h-12 text-sm font-medium rounded-xl text-neutral-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                        onClick={onOpenProject}
                    >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        {t('welcome.openProject')}
                    </Button>

                    {hasProjects && (
                        <Button
                            variant="ghost"
                            size="lg"
                            className="w-full h-12 text-sm font-medium rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                            onClick={() => setCommandPaletteOpen(true)}
                        >
                            <BookOpen className="mr-2 h-4 w-4" />
                            {t('welcome.openProject')}
                        </Button>
                    )}
                </div>

                <div className="mt-10 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
                    <Keyboard className="h-3.5 w-3.5" />
                    <span>{t('welcome.hint')}</span>
                </div>
            </motion.div>
        </div>
    );
}
