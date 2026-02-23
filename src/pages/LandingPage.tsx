import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Users, MessageSquare, Timer, PenTool, ClipboardCheck, BookOpen,
  Shield, Zap, Layers, Globe, ArrowRight, GraduationCap, ChevronDown, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/AuthDialog";

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };
const rise = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" as const } } };

const featureIcons = [BookOpen, Users, MessageSquare, PenTool, Timer, ClipboardCheck];
const featureKeys = ["scenarios", "presence", "chat", "whiteboard", "timer", "evaluation"];
const featureGradients = [
  "from-blue-500/20 to-cyan-400/20", "from-emerald-500/20 to-teal-400/20",
  "from-violet-500/20 to-purple-400/20", "from-amber-500/20 to-orange-400/20",
  "from-rose-500/20 to-pink-400/20", "from-sky-500/20 to-indigo-400/20",
];

const pillarIcons = [Shield, Zap, Layers, Globe];
const pillarKeys = ["secure", "instant", "organized", "accessible"];

const chipIcons = [BookOpen, Users, PenTool, Timer, MessageSquare];
const chipKeys = ["scenarios", "participants", "whiteboard", "timer", "chat"];

const languages = [
  { code: "pt", flag: "🇧🇷" },
  { code: "en", flag: "🇺🇸" },
  { code: "es", flag: "🇪🇸" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const [authOpen, setAuthOpen] = useState(false);

  // Auto-open auth dialog if redirected from /auth
  useEffect(() => {
    if (searchParams.get("auth") === "open") {
      setAuthOpen(true);
      // Clean the URL param
      searchParams.delete("auth");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen bg-[hsl(25,30%,92%)] text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,40%,88%)] via-[hsl(25,25%,90%)] to-[hsl(210,30%,88%)]" />
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-bl from-[hsl(210,60%,85%)]/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-tr from-[hsl(30,50%,85%)]/50 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 px-3 py-2 max-w-3xl w-full">
          <div className="flex items-center gap-2 rounded-full bg-primary/10 backdrop-blur-md px-4 py-2">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-primary">{t("app.name")}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 rounded-full bg-white/40 backdrop-blur-md px-2 py-1 flex-1 justify-center">
            {(["navResources", "navHowItWorks", "navAbout"] as const).map((key) => (
              <button
                key={key}
                onClick={() => {
                  const id = key === "navResources" ? "features" : key === "navHowItWorks" ? "how-it-works" : "pillars";
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-4 py-1.5 rounded-full text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-white/60 transition-all"
              >
                {t(`landing.${key}`)}
              </button>
            ))}
            <button
              onClick={() => navigate("/pricing")}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-white/60 transition-all"
            >
              Planos
            </button>
            <button
              onClick={() => navigate("/docs")}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-white/60 transition-all"
            >
              {t("docs.navLink")}
            </button>
          </div>

          {/* Language pills */}
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

          <button onClick={() => setAuthOpen(true)} className="rounded-full bg-foreground text-white px-5 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
            {t("landing.enter")}
          </button>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center max-w-4xl mx-auto">
          <motion.div variants={rise} className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-md border border-white/60 px-5 py-2 text-sm font-medium text-foreground/70 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {t("landing.badge")}
            </span>
          </motion.div>

          <motion.h1 variants={rise} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-8">
            {t("landing.heroTitle1")}
            <br />
            <span className="bg-gradient-to-r from-primary via-[hsl(210,76%,55%)] to-[hsl(250,60%,55%)] bg-clip-text text-transparent">
              {t("landing.heroTitle2")}
            </span>
          </motion.h1>

          <motion.p variants={rise} className="text-lg sm:text-xl text-foreground/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("landing.heroSubtitle")}
          </motion.p>

          <motion.div variants={rise} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => setAuthOpen(true)} className="rounded-full px-8 h-14 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Play className="mr-2 h-4 w-4" />
              {t("landing.cta")}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full px-8 h-14 text-base font-semibold bg-white/40 backdrop-blur-md border border-white/50 hover:bg-white/60">
              {t("landing.explore")}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.8 }} className="mt-16 flex flex-wrap justify-center gap-3">
          {chipKeys.map((key, i) => {
            const Icon = chipIcons[i];
            return (
              <div key={key} className="flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/60 px-5 py-3 shadow-sm hover:shadow-md hover:bg-white/70 transition-all cursor-default">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground/80">{t(`landing.chips.${key}`)}</span>
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger} className="text-center mb-16">
            <motion.span variants={rise} className="inline-block rounded-full bg-primary/10 text-primary px-5 py-1.5 text-sm font-semibold mb-5">{t("landing.featuresTag")}</motion.span>
            <motion.h2 variants={rise} className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">{t("landing.featuresTitle")}</motion.h2>
            <motion.p variants={rise} className="text-foreground/60 text-lg max-w-2xl mx-auto">{t("landing.featuresSubtitle")}</motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureKeys.map((key, i) => {
              const Icon = featureIcons[i];
              return (
                <motion.div key={key} variants={scaleIn} className="group relative rounded-3xl bg-white/50 backdrop-blur-xl border border-white/60 p-8 shadow-sm hover:shadow-xl hover:bg-white/70 transition-all duration-500 hover:-translate-y-1">
                  <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${featureGradients[i]} backdrop-blur-md border border-white/40`}>
                    <Icon className="h-6 w-6 text-foreground/80" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t(`landing.features.${key}.title`)}</h3>
                  <p className="text-foreground/55 leading-relaxed text-[0.92rem]">{t(`landing.features.${key}.desc`)}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={stagger} className="text-center mb-16">
            <motion.span variants={rise} className="inline-block rounded-full bg-primary/10 text-primary px-5 py-1.5 text-sm font-semibold mb-5">{t("landing.howItWorksTag")}</motion.span>
            <motion.h2 variants={rise} className="text-4xl sm:text-5xl font-bold tracking-tight">{t("landing.howItWorksTitle")}</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {["s1", "s2", "s3", "s4"].map((key, i) => (
              <motion.div key={key} variants={scaleIn} className="relative rounded-3xl bg-white/50 backdrop-blur-xl border border-white/60 p-7 shadow-sm">
                <span className="text-5xl font-black text-primary/15 absolute top-4 right-6">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold mb-2 mt-6">{t(`landing.steps.${key}.title`)}</h3>
                  <p className="text-foreground/55 text-sm leading-relaxed">{t(`landing.steps.${key}.desc`)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section id="pillars" className="py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
            <motion.div variants={rise} className="text-center mb-14">
              <h2 className="text-4xl font-bold tracking-tight mb-4">{t("landing.pillarsTitle")}</h2>
            </motion.div>

            <motion.div variants={rise} className="flex flex-col sm:flex-row items-stretch gap-3 rounded-[2rem] bg-white/40 backdrop-blur-xl border border-white/60 p-3 shadow-lg">
              {pillarKeys.map((key, i) => {
                const Icon = pillarIcons[i];
                return (
                  <div key={key} className={`flex-1 flex items-center gap-4 rounded-[1.5rem] px-6 py-5 transition-all ${i === 0 ? "bg-primary/10 backdrop-blur-md border border-primary/20 shadow-sm" : "hover:bg-white/50"}`}>
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-white/60 text-foreground/70"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm">{t(`landing.pillars.${key}.label`)}</h4>
                      <p className="text-foreground/50 text-xs leading-snug">{t(`landing.pillars.${key}.desc`)}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={stagger} className="mx-auto max-w-3xl text-center">
          <motion.div variants={scaleIn} className="rounded-[2.5rem] bg-white/50 backdrop-blur-xl border border-white/60 shadow-xl p-12 sm:p-16">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              {t("landing.ctaTitle1")}
              <br />
              <span className="text-primary">{t("landing.ctaTitle2")}</span>
            </h2>
            <p className="text-foreground/55 text-lg mb-10 max-w-xl mx-auto">{t("landing.ctaSubtitle")}</p>
            <Button size="lg" onClick={() => setAuthOpen(true)} className="rounded-full px-10 h-14 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
              {t("landing.ctaButton")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground/40">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground/60">{t("app.name")}</span>
          </div>
          <div className="text-center sm:text-right">
            <p>{t("app.copyright", { year: new Date().getFullYear() })}</p>
            <p className="text-xs mt-1">{t("app.creditLine")}</p>
          </div>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
