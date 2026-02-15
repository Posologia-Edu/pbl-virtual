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
  ArrowRight,
  GraduationCap,
  Layers,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroGradient from "@/assets/hero-gradient.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  {
    icon: BookOpen,
    title: "Cenários PBL",
    desc: "Crie e gerencie cenários clínicos com IA generativa, glossário do tutor e perguntas orientadoras.",
  },
  {
    icon: Users,
    title: "Presença em Tempo Real",
    desc: "Veja quem está online com indicadores visuais instantâneos. Gerencie papéis de coordenador e relator.",
  },
  {
    icon: MessageSquare,
    title: "Chat Colaborativo",
    desc: "Discussões em tempo real integradas à sessão tutorial, com histórico por sessão e problema.",
  },
  {
    icon: PenTool,
    title: "Whiteboard Interativo",
    desc: "Quadro branco com formas geométricas, setas, texto editável e arrastar-e-soltar para o relator.",
  },
  {
    icon: Timer,
    title: "Cronômetro Sincronizado",
    desc: "Timer em tempo real visível para todos os participantes, controlado pelo coordenador da sessão.",
  },
  {
    icon: ClipboardCheck,
    title: "Avaliação Integrada",
    desc: "Critérios de avaliação por fase, notas individuais e acompanhamento contínuo pelo professor.",
  },
];

const pillars = [
  {
    icon: Shield,
    title: "Seguro",
    desc: "Controle de acesso por papéis com autenticação robusta.",
  },
  {
    icon: Zap,
    title: "Rápido",
    desc: "Atualizações instantâneas via Supabase Realtime.",
  },
  {
    icon: Layers,
    title: "Organizado",
    desc: "Instituições, cursos, módulos e grupos em hierarquia clara.",
  },
  {
    icon: Globe,
    title: "Acessível",
    desc: "100% web, responsivo e sem instalação necessária.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="h-10 w-10 rounded-2xl bg-primary/90 backdrop-blur-md flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              PBL Flow
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Button
              variant="ghost"
              className="rounded-full px-5 backdrop-blur-sm"
              onClick={() => navigate("/auth")}
            >
              Entrar
            </Button>
            <Button
              className="rounded-full px-6 shadow-lg shadow-primary/25"
              onClick={() => navigate("/auth")}
            >
              Começar Agora
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex items-center justify-center">
        <img
          src={heroGradient}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block mb-6 rounded-full border border-border/60 bg-card/70 backdrop-blur-md px-5 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
              Plataforma de Aprendizagem Baseada em Problemas
            </span>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
              Transforme suas{" "}
              <span className="text-primary">sessões tutoriais</span>{" "}
              em experiências colaborativas
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10 leading-relaxed">
              Uma plataforma completa para conduzir sessões PBL com chat em tempo real,
              whiteboard interativo, cronômetro sincronizado e avaliação integrada.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="rounded-full px-8 text-base shadow-xl shadow-primary/20 h-12"
                onClick={() => navigate("/auth")}
              >
                Acessar Plataforma
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 text-base bg-card/60 backdrop-blur-md border-border/60 h-12"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Conhecer Recursos
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Floating glass cards decoration */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3"
        >
          {[BookOpen, Users, PenTool, Timer].map((Icon, i) => (
            <div
              key={i}
              className="h-14 w-14 rounded-2xl bg-card/70 backdrop-blur-md border border-border/40 shadow-lg flex items-center justify-center"
            >
              <Icon className="h-6 w-6 text-primary" />
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-16"
          >
            <motion.span
              custom={0}
              variants={fadeUp}
              className="inline-block rounded-full bg-primary/10 text-primary px-4 py-1 text-sm font-semibold mb-4"
            >
              Recursos
            </motion.span>
            <motion.h2
              custom={1}
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            >
              Tudo que você precisa para o PBL
            </motion.h2>
            <motion.p
              custom={2}
              variants={fadeUp}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              Ferramentas projetadas especificamente para a metodologia de Aprendizagem Baseada em Problemas.
            </motion.p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                className="group relative rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="py-24 px-6 clinical-surface">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center mb-14"
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-4xl font-bold tracking-tight mb-4"
            >
              Construído para a educação moderna
            </motion.h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                className="text-center rounded-3xl bg-card/90 backdrop-blur-sm border border-border/40 p-7 shadow-sm"
              >
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <p.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{p.title}</h3>
                <p className="text-muted-foreground text-sm">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.h2
            custom={0}
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-6"
          >
            Pronto para revolucionar suas{" "}
            <span className="text-primary">sessões PBL</span>?
          </motion.h2>
          <motion.p
            custom={1}
            variants={fadeUp}
            className="text-muted-foreground text-lg mb-10"
          >
            Comece gratuitamente e descubra como a tecnologia pode potencializar a aprendizagem colaborativa.
          </motion.p>
          <motion.div custom={2} variants={fadeUp}>
            <Button
              size="lg"
              className="rounded-full px-10 text-base shadow-xl shadow-primary/20 h-13"
              onClick={() => navigate("/auth")}
            >
              Começar Agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">PBL Flow</span>
          </div>
          <p>© {new Date().getFullYear()} PBL Flow. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
