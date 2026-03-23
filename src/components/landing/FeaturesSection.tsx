import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { FEATURES_DATA } from "@/data/features";
import { cn } from "@/lib/utils";

// Dynamic Icon Component
const Icon = ({ name, className }: { name: string; className?: string }) => {
  const LucideIcon = (LucideIcons as any)[name];
  if (!LucideIcon) return null;
  return <LucideIcon className={className} />;
};

export function FeaturesSection() {
  const [lang, setLang] = useState<"en" | "tr">("en");
  const [activeTab, setActiveTab] = useState(FEATURES_DATA[0].id);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const activeCategory = FEATURES_DATA.find((c) => c.id === activeTab)!;

  return (
    <section className="relative py-24 px-6 overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent)]/10 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto">
        {/* Header & Lang Toggle */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
              {lang === "en" ? "Precision for Researchers." : "Araştırmacılar İçin Hassasiyet."}
            </h2>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl font-medium leading-relaxed">
              {lang === "en" 
                ? "Experience a QDA platform that respects your time, your privacy, and your academic integrity." 
                : "Zamanınıza, gizliliğinize ve akademik titizliğinize saygı duyan bir nitel analiz platformunu deneyimleyin."}
            </p>
          </motion.div>

          <div className="flex bg-[var(--surface)] p-1 rounded-xl border border-[var(--border-subtle)] backdrop-blur-md self-start">
            <button
              onClick={() => setLang("en")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                lang === "en" ? "bg-[var(--accent)] text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              ENGLISH
            </button>
            <button
              onClick={() => setLang("tr")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                lang === "tr" ? "bg-[var(--accent)] text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              TÜRKÇE
            </button>
          </div>
        </div>

        {/* Category Navigation (Tabs) */}
        <div className="flex flex-wrap gap-2 mb-12">
          {FEATURES_DATA.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-full border transition-all duration-300 font-bold text-sm",
                activeTab === cat.id
                  ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]"
                  : "bg-[var(--surface)]/50 border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border)] hover:bg-[var(--surface)]"
              )}
            >
              <Icon name={cat.icon} className="h-4 w-4" />
              {cat.title[lang]}
            </button>
          ))}
        </div>

        {/* Grid Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[220px]"
          >
            {activeCategory.features.map((feature, idx) => (
              <motion.div
                key={feature.id}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                className={cn(
                  "relative group p-8 rounded-3xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-secondary)]/50 to-[var(--surface)]/30 backdrop-blur-xl overflow-hidden flex flex-col justify-between",
                  // Dynamic Bento Sizing
                  idx === 0 ? "lg:col-span-2 lg:row-span-2" : "",
                  idx === 3 ? "lg:col-span-2" : ""
                )}
              >
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Icon name={feature.icon} className="h-24 w-24 -mr-8 -mt-8" />
                </div>

                <div className="z-10 bg-[var(--accent)]/10 w-12 h-12 flex items-center justify-center rounded-2xl border border-[var(--accent)]/20 mb-4 group-hover:scale-110 transition-transform">
                  <Icon name={feature.icon} className="h-6 w-6 text-[var(--accent)]" />
                </div>

                <div className="z-10 mt-auto">
                  <h3 className={cn(
                    "font-black tracking-tight mb-2 group-hover:text-[var(--accent)] transition-colors",
                    idx === 0 ? "text-2xl md:text-3xl" : "text-lg"
                  )}>
                    {feature.title[lang]}
                  </h3>
                  <p className={cn(
                    "text-[var(--text-secondary)] leading-snug font-medium",
                    idx === 0 ? "text-base md:text-lg max-w-sm" : "text-sm"
                  )}>
                    {feature.description[lang]}
                  </p>
                </div>

                {/* Corner Accent */}
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-[var(--accent)]/5 rounded-tl-[80px] -z-10" />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-20 pt-8 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-6">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[var(--bg-primary)] bg-[var(--surface-hover)] flex items-center justify-center overflow-hidden">
                   <Icon name="Users" className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-[var(--text-secondary)]">
              {lang === "en" 
                ? "Trusted by 5,000+ academics worldwide." 
                : "Dünya çapında 5.000'den fazla akademisyen tarafından güveniliyor."}
            </p>
          </div>

          <button className="px-8 py-4 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-black text-sm hover:scale-105 transition-transform active:scale-95 shadow-xl shadow-white/5">
            {lang === "en" ? "GET LIFETIME LICENSE — $149" : "ÖMÜR BOYU LİSANS AL — $149"}
          </button>
        </motion.div>
      </div>
    </section>
  );
}
