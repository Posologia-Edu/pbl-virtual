import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { trackPageView, trackCTAClick } from "@/lib/cookieAnalytics";
import { motion } from "framer-motion";
import {
  GraduationCap, ArrowLeft, ArrowRight, BookOpen, Users, MessageSquare,
  PenTool, Timer, ClipboardCheck, Brain, FileText, Target, BarChart3,
  Shield, Award, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const rise = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

const features = [
  {
    icon: BookOpen,
    title: "Cenários Clínicos Interativos",
    desc: "Crie e gerencie cenários PBL com suporte a múltiplos problemas por sala. Os alunos acessam o cenário em tempo real e seguem os 7 passos do método tutorial.",
    gradient: "from-blue-500/20 to-cyan-400/20",
  },
  {
    icon: Brain,
    title: "Co-tutor com Inteligência Artificial",
    desc: "IA integrada que gera sugestões pedagógicas, identifica lacunas no conhecimento e auxilia o tutor durante a sessão — tudo em tempo real.",
    gradient: "from-violet-500/20 to-purple-400/20",
  },
  {
    icon: Users,
    title: "Gestão de Grupos e Participantes",
    desc: "Organize turmas, crie grupos, defina coordenadores e relatores. Controle presença e participação de cada aluno em todas as sessões.",
    gradient: "from-emerald-500/20 to-teal-400/20",
  },
  {
    icon: ClipboardCheck,
    title: "Avaliação Docente e por Pares",
    desc: "Avaliação estruturada com critérios personalizáveis. Professores avaliam alunos e os próprios alunos se avaliam mutuamente com autoavaliação.",
    gradient: "from-rose-500/20 to-pink-400/20",
  },
  {
    icon: MessageSquare,
    title: "Chat em Tempo Real",
    desc: "Comunicação instantânea entre todos os participantes da sessão. Mensagens organizadas por sessão para consulta posterior.",
    gradient: "from-amber-500/20 to-orange-400/20",
  },
  {
    icon: PenTool,
    title: "Quadro Branco Colaborativo",
    desc: "Espaço digital para anotações coletivas nos 7 passos do tutorial. Cada etapa mantém seus registros separados para organização.",
    gradient: "from-sky-500/20 to-indigo-400/20",
  },
  {
    icon: Timer,
    title: "Cronômetro Sincronizado",
    desc: "Controle de tempo em tempo real compartilhado entre todos os participantes. O professor define e inicia o timer que todos veem simultaneamente.",
    gradient: "from-lime-500/20 to-green-400/20",
  },
  {
    icon: FileText,
    title: "Geração de Cenários com IA",
    desc: "Crie cenários clínicos automaticamente usando inteligência artificial. Defina o tema e a IA gera um cenário completo com glossário e questões norteadoras.",
    gradient: "from-fuchsia-500/20 to-pink-400/20",
  },
  {
    icon: Target,
    title: "Banco de Objetivos de Aprendizagem",
    desc: "Gerencie objetivos de aprendizagem por módulo. Vincule objetivos às sessões e acompanhe quais foram cobertos ao longo do curso.",
    gradient: "from-teal-500/20 to-cyan-400/20",
  },
  {
    icon: BarChart3,
    title: "Relatórios e Analytics",
    desc: "Relatórios detalhados de desempenho individual e coletivo. Visualize notas, participação, badges e evolução ao longo do tempo.",
    gradient: "from-indigo-500/20 to-blue-400/20",
  },
  {
    icon: Award,
    title: "Badges e Gamificação",
    desc: "Sistema de conquistas que reconhece participação, liderança e desempenho acadêmico. Badges automáticos computados ao final de cada sessão.",
    gradient: "from-yellow-500/20 to-amber-400/20",
  },
  {
    icon: Shield,
    title: "Administração e White-Label",
    desc: "Painel administrativo completo com gestão de instituições, cursos, módulos e usuários. Personalização de marca com logo e cores da instituição.",
    gradient: "from-slate-500/20 to-gray-400/20",
  },
];

export default function Features() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[hsl(25,30%,92%)] text-foreground overflow-x-hidden selection:bg-primary/20">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,40%,88%)] via-[hsl(25,25%,90%)] to-[hsl(210,30%,88%)]" />
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-bl from-[hsl(210,60%,85%)]/40 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Nav */}
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
            <span className="text-sm font-semibold text-foreground/70">Funcionalidades</span>
          </div>
          <Button size="sm" onClick={() => navigate("/?auth=open")} className="rounded-full px-5 font-semibold">
            Criar Conta
          </Button>
        </div>
      </motion.nav>

      {/* Header */}
      <section className="pt-28 pb-12 px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto text-center">
          <motion.span variants={rise} className="inline-block rounded-full bg-primary/10 text-primary px-5 py-1.5 text-sm font-semibold mb-5">
            Tudo que você precisa
          </motion.span>
          <motion.h1 variants={rise} className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5">
            Funcionalidades que transformam{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              o ensino PBL
            </span>
          </motion.h1>
          <motion.p variants={rise} className="text-foreground/55 text-lg max-w-xl mx-auto">
            Conheça cada ferramenta da plataforma e descubra como o PBL Virtual pode elevar a qualidade das suas sessões tutoriais.
          </motion.p>
        </motion.div>
      </section>

      {/* Features grid */}
      <section className="pb-20 px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={stagger} className="mx-auto max-w-6xl grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={rise} className="group rounded-3xl bg-white/50 backdrop-blur-xl border border-white/60 p-8 shadow-sm hover:shadow-xl hover:bg-white/70 transition-all duration-500 hover:-translate-y-1">
                <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradient} backdrop-blur-md border border-white/40`}>
                  <Icon className="h-6 w-6 text-foreground/80" />
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-foreground/55 leading-relaxed text-[0.92rem]">{f.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="pb-20 px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={stagger} className="mx-auto max-w-3xl text-center">
          <motion.div variants={rise} className="rounded-[2.5rem] bg-white/50 backdrop-blur-xl border border-white/60 shadow-xl p-12 sm:p-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">
              Pronto para começar?
            </h2>
            <p className="text-foreground/55 text-lg mb-8 max-w-xl mx-auto">
              Crie sua conta gratuitamente e experimente todas as funcionalidades do PBL Virtual.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/?auth=open")} className="rounded-full px-10 h-14 text-base font-semibold shadow-xl shadow-primary/25">
                Criar Conta Grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="ghost" onClick={() => navigate("/pricing")} className="rounded-full px-8 h-14 text-base font-semibold bg-white/40 backdrop-blur-md border border-white/50 hover:bg-white/60">
                Ver Planos
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
