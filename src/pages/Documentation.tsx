import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  GraduationCap, ArrowLeft, BookOpen, Users, MessageSquare, PenTool,
  Timer, ClipboardCheck, Shield, Settings, BarChart3, DoorOpen,
  Layers, Globe, Brain, FileText, Target, ChevronDown,
} from "lucide-react";
import { useState } from "react";

const rise = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

interface DocSection {
  id: string;
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
  stepsKeys: string[];
}

const sections: DocSection[] = [
  { id: "getting-started", icon: BookOpen, titleKey: "docs.sections.gettingStarted.title", descKey: "docs.sections.gettingStarted.desc", stepsKeys: ["s1", "s2", "s3"] },
  { id: "rooms", icon: DoorOpen, titleKey: "docs.sections.rooms.title", descKey: "docs.sections.rooms.desc", stepsKeys: ["s1", "s2", "s3", "s4"] },
  { id: "scenarios", icon: FileText, titleKey: "docs.sections.scenarios.title", descKey: "docs.sections.scenarios.desc", stepsKeys: ["s1", "s2", "s3"] },
  { id: "session", icon: Layers, titleKey: "docs.sections.session.title", descKey: "docs.sections.session.desc", stepsKeys: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] },
  { id: "chat", icon: MessageSquare, titleKey: "docs.sections.chat.title", descKey: "docs.sections.chat.desc", stepsKeys: ["s1", "s2"] },
  { id: "whiteboard", icon: PenTool, titleKey: "docs.sections.whiteboard.title", descKey: "docs.sections.whiteboard.desc", stepsKeys: ["s1", "s2", "s3"] },
  { id: "timer", icon: Timer, titleKey: "docs.sections.timer.title", descKey: "docs.sections.timer.desc", stepsKeys: ["s1", "s2"] },
  { id: "evaluation", icon: ClipboardCheck, titleKey: "docs.sections.evaluation.title", descKey: "docs.sections.evaluation.desc", stepsKeys: ["s1", "s2", "s3"] },
  { id: "peer-eval", icon: Users, titleKey: "docs.sections.peerEval.title", descKey: "docs.sections.peerEval.desc", stepsKeys: ["s1", "s2"] },
  { id: "ai-cotutor", icon: Brain, titleKey: "docs.sections.aiCotutor.title", descKey: "docs.sections.aiCotutor.desc", stepsKeys: ["s1", "s2"] },
  { id: "objectives", icon: Target, titleKey: "docs.sections.objectives.title", descKey: "docs.sections.objectives.desc", stepsKeys: ["s1", "s2"] },
  { id: "reports", icon: BarChart3, titleKey: "docs.sections.reports.title", descKey: "docs.sections.reports.desc", stepsKeys: ["s1", "s2", "s3"] },
  { id: "admin", icon: Settings, titleKey: "docs.sections.admin.title", descKey: "docs.sections.admin.desc", stepsKeys: ["s1", "s2", "s3", "s4", "s5"] },
  { id: "roles", icon: Shield, titleKey: "docs.sections.roles.title", descKey: "docs.sections.roles.desc", stepsKeys: ["s1", "s2", "s3"] },
  { id: "i18n", icon: Globe, titleKey: "docs.sections.i18n.title", descKey: "docs.sections.i18n.desc", stepsKeys: ["s1", "s2"] },
];

function AccordionItem({ section, t }: { section: DocSection; t: any }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div className="rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-sm overflow-hidden transition-all">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/30 transition-colors"
      >
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base">{t(section.titleKey)}</h3>
          <p className="text-sm text-foreground/55 truncate">{t(section.descKey)}</p>
        </div>
        <ChevronDown className={`h-5 w-5 text-foreground/40 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-5 pb-5"
        >
          <div className="border-t border-white/40 pt-4 space-y-3">
            {section.stepsKeys.map((stepKey, i) => (
              <div key={stepKey} className="flex items-start gap-3">
                <span className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {t(`docs.sections.${section.id.replace("-", "")}.steps.${stepKey}`)}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

const languages = [
  { code: "pt", flag: "🇧🇷" },
  { code: "en", flag: "🇺🇸" },
  { code: "es", flag: "🇪🇸" },
];

export default function Documentation() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  return (
    <div className="min-h-screen bg-[hsl(25,30%,92%)] text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,40%,88%)] via-[hsl(25,25%,90%)] to-[hsl(210,30%,88%)]" />
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-bl from-[hsl(210,60%,85%)]/40 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 px-3 py-2 max-w-3xl w-full">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 rounded-full bg-primary/10 backdrop-blur-md px-4 py-2 hover:bg-primary/15 transition-colors">
            <ArrowLeft className="h-4 w-4 text-primary" />
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-primary">{t("app.name")}</span>
          </button>

          <div className="flex-1 text-center">
            <span className="text-sm font-semibold text-foreground/70">{t("docs.title")}</span>
          </div>

          <div className="flex items-center gap-0.5 mr-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`rounded-full px-2 py-1 text-sm transition-all ${
                  i18n.language?.startsWith(lang.code) ? "bg-primary/10 scale-110" : "opacity-60 hover:opacity-100"
                }`}
              >
                {lang.flag}
              </button>
            ))}
          </div>
        </div>
      </motion.nav>

      {/* Header */}
      <section className="pt-28 pb-12 px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto text-center">
          <motion.div variants={rise}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-md border border-white/60 px-5 py-2 text-sm font-medium text-foreground/70 shadow-sm mb-6">
              <BookOpen className="h-4 w-4 text-primary" />
              {t("docs.badge")}
            </span>
          </motion.div>
          <motion.h1 variants={rise} className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            {t("docs.heading")}
          </motion.h1>
          <motion.p variants={rise} className="text-foreground/55 text-lg max-w-xl mx-auto">
            {t("docs.subheading")}
          </motion.p>
        </motion.div>
      </section>

      {/* Sections */}
      <section className="pb-24 px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto space-y-3">
          {sections.map((section) => (
            <motion.div key={section.id} variants={rise}>
              <AccordionItem section={section} t={t} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground/40">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground/60">{t("app.name")}</span>
          </div>
          <p>{t("app.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
}
