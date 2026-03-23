import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, ShieldCheck, X } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CHECKLIST_ITEMS = [
  {
    id: "reflexivity",
    title: "1. Researcher Characteristics & Reflexivity",
    description: "Prior assumptions, experiences, and perspectives are recorded in the Reflexivity Journal.",
  },
  {
    id: "contextualization",
    title: "2. Contextualization & Demographics",
    description: "Participant and setting demographics are thoroughly documented within the project metadata.",
  },
  {
    id: "analysis",
    title: "3. Data Collection & Analysis",
    description: "The coding system is complete, and an Audit Trail (Code Evolution Log) exists.",
  },
  {
    id: "integrity",
    title: "4. Methodological Integrity",
    description: "Member-checking or adequate thick description is utilized in the analysis.",
  },
];

export function JarsChecklist({ open, onClose }: Props) {
  const { activeProjectId } = useAppStore();
  const { jarsProgress, setJarsProgress } = useProjectStore();

  const [localProgress, setLocalProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setLocalProgress(jarsProgress || {});
    }
  }, [open, jarsProgress]);

  const toggleItem = (id: string) => {
    const nextState = !localProgress[id];
    const newProgress = { ...localProgress, [id]: nextState };
    setLocalProgress(newProgress);
    if (activeProjectId) {
      setJarsProgress(activeProjectId, id, nextState);
    }
    
    // Check if fully completed
    const allChecked = CHECKLIST_ITEMS.every(item => newProgress[item.id]);
    if (allChecked && nextState) { // Only fire if we just checked the last one
      triggerConfetti();
    }
  };

  const triggerConfetti = () => {
    for (let i = 0; i < 50; i++) {
       const el = document.createElement("div");
       el.style.position = "fixed";
       el.style.left = "50%";
       el.style.top = "50%";
       el.style.width = "8px";
       el.style.height = "8px";
       el.style.backgroundColor = ["#ef4444", "#eab308", "#3b82f6", "#22c55e", "#a855f7"][Math.floor(Math.random() * 5)];
       el.style.zIndex = "9999";
       el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
       document.body.appendChild(el);
       
       const angle = Math.random() * Math.PI * 2;
       const speed = 10 + Math.random() * 15;
       
       const anim = el.animate([
           { transform: `translate(0,0) rotate(0deg) scale(1)`, opacity: 1 },
           { transform: `translate(${Math.cos(angle)*speed*15}px, ${Math.sin(angle)*speed*15 + 200}px) rotate(${Math.random()*720}deg) scale(0)`, opacity: 0 }
       ], { duration: 1500 + Math.random()*1000, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
       
       anim.onfinish = () => el.remove();
    }
  };

  const progressCount = CHECKLIST_ITEMS.filter(i => localProgress[i.id]).length;
  const progressPercent = Math.round((progressCount / CHECKLIST_ITEMS.length) * 100);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[1001] shadow-2xl rounded-2xl overflow-hidden"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>JARS-Qual Integrity Assistant</h2>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ensure APA 7 compliance for your qualitative study.</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 -mr-2" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-hover)" }}>
                  <motion.div 
                    className="h-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Checklist items */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {CHECKLIST_ITEMS.map((item) => {
                  const isChecked = !!localProgress[item.id];
                  return (
                    <motion.div 
                      key={item.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        isChecked 
                          ? "bg-green-500/5 border-green-500/30" 
                          : "bg-[var(--surface)] border-[var(--border-subtle)] hover:border-[var(--accent)]"
                      }`}
                      onClick={() => toggleItem(item.id)}
                    >
                      <button className="mt-0.5 flex-shrink-0 focus:outline-none">
                        {isChecked ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 transition-transform hover:scale-110" />
                        ) : (
                          <Circle className="h-5 w-5 text-zinc-400 transition-transform hover:scale-110 hover:text-zinc-300" />
                        )}
                      </button>
                      <div>
                        <h3 className={`text-sm font-semibold mb-1 transition-colors ${isChecked ? "text-green-500" : "text-[var(--text-primary)]"}`}>
                          {item.title}
                        </h3>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                          {item.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* APA Citation Box */}
              <div className="mt-6 p-4 rounded-xl" style={{ background: "var(--surface-hover)", border: "1px dashed var(--border)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Reference Citation</p>
                <p className="text-xs leading-relaxed pl-3 border-l-2" style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}>
                  Levitt, H. M., Bamberg, M., Creswell, J. W., Frost, D. M., Josselson, R., & Suárez-Orozco, C. (2018). 
                  Journal article reporting standards for qualitative primary, qualitative meta-analytic, and mixed methods research in psychology: 
                  The APA Publications and Communications Board task force report. <i>American Psychologist</i>, 73(1), 26–46. 
                  <br />
                  <a href="https://doi.org/10.1037/amp0000151" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                    https://doi.org/10.1037/amp0000151
                  </a>
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 flex justify-end border-t" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}>
               <Button variant="primary" onClick={onClose}>
                 Done
               </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
