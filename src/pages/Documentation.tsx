import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  GraduationCap, ArrowLeft, BookOpen, Users, MessageSquare, PenTool,
  Timer, ClipboardCheck, Shield, Settings, BarChart3, DoorOpen,
  Layers, Globe, Brain, FileText, Target, ChevronDown, Code2,
  Database, Server, Palette, Lock, Cpu, Webhook, Languages,
} from "lucide-react";
import { useState } from "react";
import Footer from "@/components/Footer";

const rise = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

interface DocSection {
  id: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  steps: string[];
}

const functionalitySections: DocSection[] = [
  {
    id: "getting-started", icon: BookOpen,
    title: "Primeiros Passos",
    desc: "Como começar a usar o PBL Flow",
    steps: [
      "Faça login com suas credenciais fornecidas pela instituição ou via Google OAuth.",
      "Na primeira vez, você será guiado pelo onboarding para configurar seu perfil.",
      "Acesse o Dashboard para ver suas salas, grupos e atividades recentes.",
    ],
  },
  {
    id: "rooms", icon: DoorOpen,
    title: "Salas PBL",
    desc: "Criação e gerenciamento de salas de tutorial",
    steps: [
      "Salas são criadas automaticamente quando um grupo é cadastrado no painel admin.",
      "Cada sala possui seu próprio cenário, chat, whiteboard e ferramentas de avaliação.",
      "O professor pode gerenciar múltiplos cenários por sala e ativar/desativar conforme necessidade.",
      "Os alunos acessam a sala pelo Dashboard e podem ver os cenários liberados pelo professor.",
    ],
  },
  {
    id: "scenarios", icon: FileText,
    title: "Cenários e Problemas",
    desc: "Gerenciamento de cenários PBL",
    steps: [
      "Cenários podem ser criados manualmente ou gerados automaticamente com IA.",
      "Cada cenário pode ter perguntas-guia e glossário para auxiliar o co-tutor de IA.",
      "O professor controla quando o cenário é visível para os alunos com o botão de liberação.",
    ],
  },
  {
    id: "session", icon: Layers,
    title: "Sessões Tutoriais",
    desc: "Os 7 passos do PBL em cada sessão",
    steps: [
      "Passo 1 — Identificação de termos desconhecidos: alunos listam termos que não compreendem.",
      "Passo 2 — Definição do problema: o grupo define o problema central do cenário.",
      "Passo 3 — Brainstorming: chuva de ideias livre para explorar hipóteses.",
      "Passo 4 — Resumo/Sistematização: organização das ideias levantadas.",
      "Passo 5 — Objetivos de aprendizagem: definição do que precisa ser estudado.",
      "Passo 6 — Estudo individual: fase externa à plataforma.",
      "Passo 7 — Rediscussão e síntese: fechamento com integração dos conhecimentos.",
      "O professor pode escolher coordenador e relator para cada sessão e controlar o timer.",
    ],
  },
  {
    id: "chat", icon: MessageSquare,
    title: "Chat em Tempo Real",
    desc: "Comunicação durante as sessões",
    steps: [
      "O chat é integrado à sessão e permite troca de mensagens em tempo real entre todos os participantes.",
      "As mensagens são salvas e podem ser consultadas no histórico da sessão.",
    ],
  },
  {
    id: "whiteboard", icon: PenTool,
    title: "Whiteboard Colaborativo",
    desc: "Quadro branco para anotações do grupo",
    steps: [
      "Cada passo da sessão tem seu próprio espaço de whiteboard.",
      "Qualquer participante pode adicionar itens ao quadro.",
      "Os itens ficam organizados por passo e são salvos automaticamente.",
    ],
  },
  {
    id: "timer", icon: Timer,
    title: "Timer da Sessão",
    desc: "Controle de tempo das atividades",
    steps: [
      "O professor configura o tempo desejado e inicia/pausa o cronômetro.",
      "Todos os participantes veem o timer em tempo real sincronizado.",
    ],
  },
  {
    id: "evaluation", icon: ClipboardCheck,
    title: "Avaliação do Professor",
    desc: "Avaliação individual por critérios",
    steps: [
      "O professor avalia cada aluno em critérios específicos por fase (abertura e fechamento).",
      "Os critérios são personalizáveis por sala — podem ser editados, adicionados ou removidos.",
      "As notas usam escala qualitativa: Excelente, Bom, Regular, Insatisfatório.",
    ],
  },
  {
    id: "peer-eval", icon: Users,
    title: "Avaliação por Pares",
    desc: "Alunos avaliam uns aos outros",
    steps: [
      "Disponível nos planos Professional e Enterprise.",
      "Cada aluno avalia seus colegas e a si mesmo usando os mesmos critérios do professor.",
    ],
  },
  {
    id: "ai-cotutor", icon: Brain,
    title: "AI Co-tutor",
    desc: "Assistente de IA integrado",
    steps: [
      "O co-tutor responde perguntas sobre o cenário e ajuda a explorar o problema.",
      "Disponível conforme o limite de interações do plano contratado.",
    ],
  },
  {
    id: "objectives", icon: Target,
    title: "Objetivos de Aprendizagem",
    desc: "Banco de objetivos por módulo",
    steps: [
      "Objetivos podem ser criados e vinculados a módulos e sessões.",
      "Objetivos marcados como 'essenciais' são destacados nos relatórios.",
    ],
  },
  {
    id: "reports", icon: BarChart3,
    title: "Relatórios",
    desc: "Acompanhamento de desempenho",
    steps: [
      "Relatórios mostram notas por aluno, sessão e critério.",
      "Exportação em PDF disponível nos planos Professional e Enterprise.",
      "Gráficos de evolução e comparativos entre sessões.",
    ],
  },
  {
    id: "admin", icon: Settings,
    title: "Painel Administrativo",
    desc: "Gestão completa do sistema",
    steps: [
      "Gerencie instituições, cursos, módulos e grupos em um único painel.",
      "Cadastre professores e alunos com senhas padrão seguras.",
      "Configure cenários reutilizáveis no banco de cenários.",
      "Personalize branding (logo, cores, nome) para white-label.",
      "Monitore analytics de uso e assinaturas.",
    ],
  },
  {
    id: "badges", icon: Shield,
    title: "Badges e Gamificação",
    desc: "Conquistas automáticas",
    steps: [
      "Badges são concedidos automaticamente com base na participação e desempenho.",
      "Categorias incluem: participação, liderança, colaboração e excelência.",
      "Disponível nos planos Professional e Enterprise.",
    ],
  },
  {
    id: "i18n", icon: Globe,
    title: "Multi-idioma",
    desc: "Interface em 3 idiomas",
    steps: [
      "O sistema está disponível em Português, English e Español.",
      "Troque o idioma a qualquer momento pelo seletor na navegação.",
    ],
  },
];

const technicalSections: DocSection[] = [
  {
    id: "tech-stack", icon: Code2,
    title: "Stack Tecnológico",
    desc: "Tecnologias utilizadas no desenvolvimento",
    steps: [
      "Frontend: React 18 com TypeScript, Vite como bundler, Tailwind CSS para estilização.",
      "Componentes UI: shadcn/ui (Radix UI) com customização completa via design tokens.",
      "Animações: Framer Motion para transições e micro-interações.",
      "Estado global: React Context API para autenticação, branding e internacionalização.",
      "Gerenciamento de dados: TanStack React Query para cache e sincronização de dados.",
    ],
  },
  {
    id: "tech-backend", icon: Server,
    title: "Backend e Infraestrutura",
    desc: "Arquitetura serverless com Supabase",
    steps: [
      "Backend: Supabase (PostgreSQL gerenciado + Auth + Storage + Edge Functions).",
      "Edge Functions: Deno runtime para lógica serverless (IA, pagamentos, emails).",
      "Autenticação: Supabase Auth com suporte a email/senha e Google OAuth.",
      "Hospedagem: Frontend servido via CDN com deploy automático pela Lovable.",
    ],
  },
  {
    id: "tech-database", icon: Database,
    title: "Banco de Dados",
    desc: "Estrutura e segurança dos dados",
    steps: [
      "PostgreSQL com Row Level Security (RLS) em todas as tabelas.",
      "Tabelas principais: profiles, institutions, courses, modules, groups, rooms, tutorial_sessions.",
      "Funções de segurança: has_role(), is_group_member(), is_institution_admin() com SECURITY DEFINER.",
      "Roles: admin, institution_admin, professor, student — armazenados em tabela separada (user_roles).",
      "Triggers automáticos: criação de perfil no signup, criação de sala ao criar grupo, critérios padrão por sala.",
    ],
  },
  {
    id: "tech-ai", icon: Cpu,
    title: "Inteligência Artificial",
    desc: "Integração com modelos de IA",
    steps: [
      "Gateway: Lovable AI Gateway (ai.gateway.lovable.dev) como proxy para modelos.",
      "Modelos suportados: Google Gemini, OpenAI GPT, Anthropic Claude, Groq, OpenRouter.",
      "Chaves por instituição: cada instituição pode configurar suas próprias API keys.",
      "Funcionalidades IA: co-tutor contextual, geração de cenários, geração de atas, agentes conversacionais.",
      "Controle de uso: contagem de interações por instituição/mês com limites por plano.",
    ],
  },
  {
    id: "tech-payments", icon: Webhook,
    title: "Pagamentos e Assinaturas",
    desc: "Integração com Stripe",
    steps: [
      "Processamento: Stripe Checkout para criação de assinaturas.",
      "Planos: Starter, Professional e Enterprise com preços em BRL.",
      "Portal do cliente: gerenciamento de assinatura via Stripe Customer Portal.",
      "Feature flags: funcionalidades habilitadas/desabilitadas conforme o plano (IA, badges, peer eval, etc.).",
    ],
  },
  {
    id: "tech-security", icon: Lock,
    title: "Segurança",
    desc: "Práticas de segurança implementadas",
    steps: [
      "RLS (Row Level Security) em 100% das tabelas do banco de dados.",
      "Autenticação JWT validada em todas as Edge Functions.",
      "Senhas de usuários gerenciadas via Supabase Auth (bcrypt).",
      "Buckets de storage privados (acesso apenas autenticado).",
      "CORS configurado em todas as Edge Functions.",
      "Roles nunca armazenados no perfil — tabela separada para prevenir escalação de privilégios.",
    ],
  },
  {
    id: "tech-i18n", icon: Languages,
    title: "Internacionalização",
    desc: "Sistema multi-idioma",
    steps: [
      "Biblioteca: i18next + react-i18next com detecção automática de idioma do navegador.",
      "Arquivos de tradução: JSON separados por idioma (en.json, es.json, pt.json).",
      "Suporte a 3 idiomas: Português (BR), English (US) e Español.",
    ],
  },
  {
    id: "tech-branding", icon: Palette,
    title: "White-label e Branding",
    desc: "Personalização por instituição",
    steps: [
      "Cores primária, secundária e de destaque configuráveis por instituição.",
      "Logo e nome da plataforma personalizáveis (armazenados na tabela institutions).",
      "BrandingContext aplica as cores dinamicamente via CSS variables.",
      "Disponível no plano Enterprise.",
    ],
  },
  {
    id: "tech-public-api", icon: Webhook,
    title: "API Pública para Integrações",
    desc: "REST API para sistemas externos (SIS, LMS)",
    steps: [
      "Base URL: https://vpoqqgnbhqgxikumjitu.supabase.co/functions/v1/public-api",
      "Autenticação: header 'Authorization: Bearer pbl_live_xxx'. Gere chaves no Painel Admin → API & Integrações.",
      "Escopo: cada chave é vinculada a uma instituição; todas as queries são automaticamente restritas à instituição da chave.",
      "Endpoints (GET): /v1/health, /v1/institution, /v1/courses, /v1/courses/:id, /v1/groups, /v1/rooms, /v1/users, /v1/sessions, /v1/evaluations, /v1/attendance.",
      "Endpoints (POST, requer escopo 'write'): /v1/courses (criar curso), /v1/users (provisionar aluno/professor + matrícula).",
      "Paginação: parâmetros ?page=1&page_size=20 (máx 100). Resposta: { data, meta: { page, page_size, total } }.",
      "Exemplo: curl -H 'Authorization: Bearer pbl_live_xxx' https://vpoqqgnbhqgxikumjitu.supabase.co/functions/v1/public-api/v1/courses",
      "Versionamento: prefixo /v1/. Mudanças incompatíveis serão lançadas como /v2/. Códigos HTTP padrão (200, 201, 401, 403, 404, 422, 500).",
    ],
  },
];
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
          <h3 className="font-bold text-base">{section.title}</h3>
          <p className="text-sm text-foreground/55 truncate">{section.desc}</p>
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
            {section.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground/70 leading-relaxed">{step}</p>
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

type TabKey = "features" | "technical";

export default function Documentation() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("features");

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "features", label: "Funcionalidades", icon: BookOpen },
    { key: "technical", label: "Informações Técnicas", icon: Code2 },
  ];

  const activeSections = activeTab === "features" ? functionalitySections : technicalSections;

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
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 rounded-full bg-primary/10 backdrop-blur-md px-4 py-2 hover:bg-primary/15 transition-colors">
            <ArrowLeft className="h-4 w-4 text-primary" />
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm text-primary">{t("app.name")}</span>
          </button>

          <div className="flex-1 text-center">
            <span className="text-sm font-semibold text-foreground/70">Documentação</span>
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
      <section className="pt-28 pb-6 px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto text-center">
          <motion.div variants={rise}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-md border border-white/60 px-5 py-2 text-sm font-medium text-foreground/70 shadow-sm mb-6">
              <BookOpen className="h-4 w-4 text-primary" />
              Central de Documentação
            </span>
          </motion.div>
          <motion.h1 variants={rise} className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Documentação do PBL Flow
          </motion.h1>
          <motion.p variants={rise} className="text-foreground/55 text-lg max-w-xl mx-auto">
            Tudo o que você precisa saber para usar o sistema e entender como ele funciona.
          </motion.p>
        </motion.div>
      </section>

      {/* Tabs */}
      <section className="px-6 pb-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 p-1 bg-white/40 backdrop-blur-xl rounded-xl border border-white/60">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-foreground/60 hover:text-foreground/80 hover:bg-white/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="pb-24 px-6">
        <motion.div key={activeTab} initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto space-y-3">
          {activeSections.map((section) => (
            <motion.div key={section.id} variants={rise}>
              <AccordionItem section={section} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
