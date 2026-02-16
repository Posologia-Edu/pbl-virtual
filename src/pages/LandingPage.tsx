import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  MessageSquare,
  Timer,
  PenTool,
  ClipboardCheck,
  BookOpen,
  Shield,
  Zap,
  Layers,
  Globe,
  ArrowRight,
  GraduationCap,
  ChevronDown,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── animation helpers ─── */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const rise = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

/* ─── data ─── */
const features = [
  {
    icon: BookOpen,
    title: "Cenários PBL",
    desc: "Crie cenários clínicos com IA, glossário do tutor e perguntas orientadoras integradas.",
    gradient: "from-blue-500/20 to-cyan-400/20",
  },
  {
    icon: Users,
    title: "Presença Online",
    desc: "Indicadores em tempo real mostram quem está ativo. Atribua papéis de coordenador e relator.",
    gradient: "from-emerald-500/20 to-teal-400/20",
  },
  {
    icon: MessageSquare,
    title: "Chat em Tempo Real",
    desc: "Discussões integradas à sessão com histórico por problema e sessão tutorial.",
    gradient: "from-violet-500/20 to-purple-400/20",
  },
  {
    icon: PenTool,
    title: "Whiteboard Avançado",
    desc: "Formas, setas, texto editável e drag-and-drop para documentar discussões visualmente.",
    gradient: "from-amber-500/20 to-orange-400/20",
  },
  {
    icon: Timer,
    title: "Cronômetro Sincronizado",
    desc: "Timer visível para todos, controlado pelo coordenador com sincronização instantânea.",
    gradient: "from-rose-500/20 to-pink-400/20",
  },
  {
    icon: ClipboardCheck,
    title: "Avaliação Integrada",
    desc: "Critérios por fase, notas individuais e acompanhamento contínuo pelo professor.",
    gradient: "from-sky-500/20 to-indigo-400/20",
  },
];

const pillars = [
  { icon: Shield, label: "Seguro", desc: "Controle por papéis e autenticação robusta" },
  { icon: Zap, label: "Instantâneo", desc: "Atualizações em tempo real via Realtime" },
  { icon: Layers, label: "Organizado", desc: "Hierarquia de instituição, curso e módulo" },
  { icon: Globe, label: "Acessível", desc: "100% web, responsivo, sem instalação" },
];

const steps = [
  { num: "01", title: "Professor cria a sala", desc: "Define grupo, cenário e critérios de avaliação" },
  { num: "02", title: "Alunos entram na sessão", desc: "Acesso direto pelo login com presença em tempo real" },
  { num: "03", title: "Colaboração ativa", desc: "Chat, whiteboard e papéis rotativos durante a tutoria" },
  { num: "04", title: "Avaliação integrada", desc: "Professor avalia em tempo real por critérios definidos" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[hsl(25,30%,92%)] text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* ─── Warm gradient background ─── */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,40%,88%)] via-[hsl(25,25%,90%)] to-[hsl(210,30%,88%)]" />
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-bl from-[hsl(210,60%,85%)]/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-tr from-[hsl(30,50%,85%)]/50 to-transparent rounded-full blur-3xl" />
      </div>

      {/* ─── Navbar (glass pill) ─── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-4 inset-x-0 z-50 flex justify-center px-4"
      >
        <div className="flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 px-3 py-2 max-w-3xl w-full">
          {/* Logo pill */}
          <div className="flex items-center gap-2 rounded-full bg-primary/10 backdrop-blur-md px-4 py-2">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-primary">PBL Virtual</span>
          </div>

          {/* Nav links pill */}
          <div className="hidden sm:flex items-center gap-1 rounded-full bg-white/40 backdrop-blur-md px-2 py-1 flex-1 justify-center">
            {["Recursos", "Como funciona", "Sobre"].map((label) => (
              <button
                key={label}
                onClick={() => {
                  const id = label === "Recursos" ? "features" : label === "Como funciona" ? "how-it-works" : "pillars";
                  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-4 py-1.5 rounded-full text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-white/60 transition-all"
              >
                {label}
              </button>
            ))}
          </div>

          {/* CTA pill */}
          <button
            onClick={() => navigate("/auth")}
            className="rounded-full bg-foreground text-white px-5 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Entrar
          </button>
        </div>
      </motion.nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div variants={rise} className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-md border border-white/60 px-5 py-2 text-sm font-medium text-foreground/70 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Plataforma de Aprendizagem Baseada em Problemas
            </span>
          </motion.div>

          <motion.h1
            variants={rise}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-8"
          >
            Sessões tutoriais
            <br />
            <span className="bg-gradient-to-r from-primary via-[hsl(210,76%,55%)] to-[hsl(250,60%,55%)] bg-clip-text text-transparent">
              reimaginadas
            </span>
          </motion.h1>

          <motion.p
            variants={rise}
            className="text-lg sm:text-xl text-foreground/60 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Uma plataforma completa para conduzir sessões PBL com colaboração em tempo real,
            whiteboard interativo e avaliação integrada.
          </motion.p>

          <motion.div variants={rise} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="rounded-full px-8 h-14 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="mr-2 h-4 w-4" />
              Começar Agora
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full px-8 h-14 text-base font-semibold bg-white/40 backdrop-blur-md border border-white/50 hover:bg-white/60"
            >
              Explorar Recursos
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Floating glass cards */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-16 flex flex-wrap justify-center gap-3"
        >
          {[
            { icon: BookOpen, label: "Cenários" },
            { icon: Users, label: "Participantes" },
            { icon: PenTool, label: "Whiteboard" },
            { icon: Timer, label: "Cronômetro" },
            { icon: MessageSquare, label: "Chat" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-xl border border-white/60 px-5 py-3 shadow-sm hover:shadow-md hover:bg-white/70 transition-all cursor-default"
            >
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground/80">{label}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span
              variants={rise}
              className="inline-block rounded-full bg-primary/10 text-primary px-5 py-1.5 text-sm font-semibold mb-5"
            >
              Recursos
            </motion.span>
            <motion.h2
              variants={rise}
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-5"
            >
              Tudo para o PBL em um só lugar
            </motion.h2>
            <motion.p variants={rise} className="text-foreground/60 text-lg max-w-2xl mx-auto">
              Ferramentas projetadas para potencializar cada etapa da metodologia de Aprendizagem Baseada em Problemas.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={scaleIn}
                className="group relative rounded-3xl bg-white/50 backdrop-blur-xl border border-white/60 p-8 shadow-sm hover:shadow-xl hover:bg-white/70 transition-all duration-500 hover:-translate-y-1"
              >
                <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} backdrop-blur-md border border-white/40`}>
                  <f.icon className="h-6 w-6 text-foreground/80" />
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-foreground/55 leading-relaxed text-[0.92rem]">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span
              variants={rise}
              className="inline-block rounded-full bg-primary/10 text-primary px-5 py-1.5 text-sm font-semibold mb-5"
            >
              Como funciona
            </motion.span>
            <motion.h2 variants={rise} className="text-4xl sm:text-5xl font-bold tracking-tight">
              Simples e poderoso
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {steps.map((s) => (
              <motion.div
                key={s.num}
                variants={scaleIn}
                className="relative rounded-3xl bg-white/50 backdrop-blur-xl border border-white/60 p-7 shadow-sm"
              >
                <span className="text-5xl font-black text-primary/15 absolute top-4 right-6">
                  {s.num}
                </span>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold mb-2 mt-6">{s.title}</h3>
                  <p className="text-foreground/55 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Pillars ─── */}
      <section id="pillars" className="py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <motion.div variants={rise} className="text-center mb-14">
              <h2 className="text-4xl font-bold tracking-tight mb-4">
                Construído para a educação moderna
              </h2>
            </motion.div>

            {/* Glass pill bar — inspired by reference */}
            <motion.div
              variants={rise}
              className="flex flex-col sm:flex-row items-stretch gap-3 rounded-[2rem] bg-white/40 backdrop-blur-xl border border-white/60 p-3 shadow-lg"
            >
              {pillars.map((p, i) => (
                <div
                  key={p.label}
                  className={`flex-1 flex items-center gap-4 rounded-[1.5rem] px-6 py-5 transition-all ${
                    i === 0
                      ? "bg-primary/10 backdrop-blur-md border border-primary/20 shadow-sm"
                      : "hover:bg-white/50"
                  }`}
                >
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-white/60 text-foreground/70"
                  }`}>
                    <p.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm">{p.label}</h4>
                    <p className="text-foreground/50 text-xs leading-snug">{p.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-28 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={stagger}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            variants={scaleIn}
            className="rounded-[2.5rem] bg-white/50 backdrop-blur-xl border border-white/60 shadow-xl p-12 sm:p-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Pronto para transformar
              <br />
              <span className="text-primary">suas tutorias?</span>
            </h2>
            <p className="text-foreground/55 text-lg mb-10 max-w-xl mx-auto">
              Comece agora e descubra como a tecnologia pode potencializar a aprendizagem colaborativa.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="rounded-full px-10 h-14 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Acessar Plataforma
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground/40">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground/60">PBL Virtual</span>
          </div>
          <div className="text-center sm:text-right">
            <p>© {new Date().getFullYear()} PBL Virtual. Todos os direitos reservados.</p>
            <p className="text-xs mt-1">Desenvolvido por Sérgio Araújo. Posologia Produções.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
