import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  GraduationCap, ArrowLeft, BookOpen, Users, MessageSquare, PenTool,
  Timer, ClipboardCheck, Shield, Settings, BarChart3, DoorOpen,
  Layers, Globe, Brain, FileText, Target, ChevronDown, Code2,
  Database, Server, Palette, Lock, Cpu, Webhook, Languages,
  Mic, Network, Stethoscope, Sparkles, Presentation, QrCode,
  UserCheck, Award, LineChart, Wrench, GitBranch, ShieldCheck,
  Calendar, Search, LayoutDashboard, Mail,
} from "lucide-react";
import { useState } from "react";
import Footer from "@/components/Footer";

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };

interface DocSection {
  id: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  path?: string;
  steps: string[];
}

// =============================================================
// ALUNO
// =============================================================
const studentSections: DocSection[] = [
  {
    id: "s-login", icon: BookOpen, title: "Entrar na plataforma",
    desc: "Como acessar sua conta pela primeira vez",
    path: "Página inicial → botão Entrar",
    steps: [
      "Acesse a URL da instituição e clique em Entrar no topo direito.",
      "Use seu e-mail institucional e a senha inicial fornecida pelo professor ou administrador.",
      "Alternativa: clique em Entrar com Google se sua instituição habilitou o SSO.",
      "No primeiro acesso, siga o guia de onboarding para revisar seu nome e curso.",
      "Se esquecer a senha, peça ao administrador para reenviá-la — a plataforma usa senhas efêmeras por segurança.",
    ],
  },
  {
    id: "s-dashboard", icon: LayoutDashboard, title: "Meu Painel do aluno",
    desc: "Visão geral do seu desempenho e atividades",
    path: "Menu lateral → Dashboard",
    steps: [
      "No Dashboard você vê suas salas ativas, próximos encontros e cenários liberados pelo professor.",
      "O card Meu Painel agrega notas por critério, frequência, badges conquistados e feedback dos colegas.",
      "Clique em uma sala para abrir os detalhes; para entrar na sessão, clique em Entrar na sala.",
      "Notificações em tempo real avisam quando o professor libera um novo cenário ou avança a sessão.",
    ],
  },
  {
    id: "s-session", icon: Layers, title: "Participar da sessão tutorial (P1 → P7)",
    desc: "Passo a passo dos 7 momentos do PBL",
    path: "Dashboard → clique na sala → Entrar na sala",
    steps: [
      "P1 — Termos desconhecidos: apenas o Relator escreve termos no whiteboard; os demais discutem no chat.",
      "P2 — Definição do problema: Relator registra a definição consensuada do grupo.",
      "P3 — Brainstorming: gere hipóteses livremente no chat; o Relator organiza no whiteboard e no Mapa Conceitual automático.",
      "P4 — Sistematização: agrupe hipóteses em categorias; a IA sugere conexões no mapa conceitual.",
      "P5 — Objetivos de aprendizagem: aprove os objetivos que o grupo estudará no P6 (aparecem como cards Kanban no P7).",
      "P6 — Estudo individual: fase off-line; use o painel Referências para anexar artigos ao seu objetivo.",
      "P7 — Fechamento: o Relator sobe a apresentação (PDF/PPTX). Todos comentam por slide, movem objetivos no Kanban (a estudar → estudado → dominado) e anexam referências a cada objetivo.",
      "A qualquer momento clique em Chat, Whiteboard ou Mapa Conceitual na barra lateral direita.",
    ],
  },
  {
    id: "s-roles", icon: UserCheck, title: "Papéis: Coordenador e Relator",
    desc: "O que muda quando o professor te designa",
    path: "Painel Participantes (dentro da sala) — apenas o professor designa",
    steps: [
      "Coordenador: controla o cronômetro da abertura (80min) e do fechamento (60min) e cronometra o tempo de fala clicando no nome de cada participante.",
      "Relator: escreve no whiteboard, edita o mapa conceitual, envia a apresentação no P7 e move cards no Kanban de objetivos.",
      "Se você não for Relator/Coordenador, ainda pode comentar em slides, anexar referências e conversar no chat.",
    ],
  },
  {
    id: "s-chat", icon: MessageSquare, title: "Chat da sala",
    desc: "Discussão em tempo real com o grupo",
    path: "Sala PBL → aba Chat (barra lateral direita)",
    steps: [
      "Mensagens são visíveis a todos os membros da sala e ao professor.",
      "Use @nome para chamar a atenção de um colega específico (visual apenas).",
      "O histórico é persistente e alimenta a Ata automática do P7 e o Painel de Apoio ao Tutor.",
    ],
  },
  {
    id: "s-whiteboard", icon: PenTool, title: "Whiteboard colaborativo",
    desc: "Quadro branco compartilhado do grupo",
    path: "Sala PBL → aba Whiteboard",
    steps: [
      "Apenas o Relator pode desenhar/escrever; os demais visualizam em tempo real.",
      "Ferramentas: caneta, texto, formas, seleção. Textos podem ser arrastados após criados (a ferramenta muda automaticamente para Selecionar).",
      "O conteúdo é salvo automaticamente e persiste mesmo se você sair e voltar.",
    ],
  },
  {
    id: "s-references", icon: FileText, title: "Enviar referências (P6/P7)",
    desc: "Artigos, links e arquivos para o grupo",
    path: "Sala PBL → aba Referências ou Kanban de Objetivos → Anexar",
    steps: [
      "Clique em Nova referência, preencha título, autor e cole o link/DOI ou faça upload do PDF.",
      "Para vincular a um objetivo específico do P5, abra o Kanban de Objetivos e use Anexar no card do objetivo.",
      "Todos os membros e o professor veem a referência em tempo real e podem citá-la na Ata.",
      "Use o painel Busca Científica (PubMed/SciELO) para pesquisar sem sair da sala.",
    ],
  },
  {
    id: "s-presentation", icon: Presentation, title: "Apresentação do P7 (Relator)",
    desc: "Como subir e navegar slides",
    path: "P7 → aba Apresentação",
    steps: [
      "Apenas o Relator sobe o arquivo (PDF ou PPTX, até 20MB).",
      "Todos veem o mesmo slide simultaneamente: quando você avança, o painel de comentários também muda para o slide correspondente.",
      "Comentários por slide são em tempo real; clique em Citar no P7 para transformar um comentário em referência da sessão.",
    ],
  },
  {
    id: "s-patient", icon: Stethoscope, title: "Entrevistar paciente virtual",
    desc: "Simulador clínico interativo",
    path: "Sala PBL → aba Entrevistar Paciente (quando liberada pelo professor)",
    steps: [
      "A aba fica disponível somente na janela liberada pelo professor: 5 minutos na abertura e 5 minutos no fechamento.",
      "Um cronômetro regressivo mostra quanto tempo resta; ao zerar, o input é bloqueado.",
      "Digite perguntas ou clique no microfone para usar voz (pt-BR). Cada mensagem é identificada com seu nome real e visível aos demais.",
      "Ao encontrar uma resposta relevante, clique em Citar no P7 para levar o trecho à Ata.",
    ],
  },
  {
    id: "s-attendance", icon: QrCode, title: "Aferir frequência (QR Code)",
    desc: "Confirmar presença na sessão",
    path: "Sala PBL → botão Frequência",
    steps: [
      "O professor gera um QR Code na sua tela.",
      "Clique em Escanear QR Code com a câmera e aponte para a tela do professor (é necessário estar próximo).",
      "Alternativamente, digite o código manualmente. A presença aparece na lista em segundos.",
    ],
  },
  {
    id: "s-peer", icon: Users, title: "Avaliação por pares",
    desc: "Avaliar colegas ao final da sessão",
    path: "Sala PBL → aba Avaliação por Pares (liberada no P7)",
    steps: [
      "Avalie cada colega e a si mesmo nos mesmos critérios do professor (O, I, PS, S, MS).",
      "As avaliações são anônimas para os colegas; o professor vê os detalhes no relatório.",
      "Disponível nos planos Professional e Enterprise.",
    ],
  },
  {
    id: "s-badges", icon: Award, title: "Badges e conquistas",
    desc: "Reconhecimento automático",
    path: "Dashboard → Meu Painel → seção Badges",
    steps: [
      "Badges são concedidos automaticamente por participação, liderança, colaboração e excelência.",
      "Passe o mouse sobre um badge para ver o critério que o desbloqueou.",
    ],
  },
];

// =============================================================
// PROFESSOR
// =============================================================
const professorSections: DocSection[] = [
  {
    id: "p-start", icon: BookOpen, title: "Preparar sua sala PBL",
    desc: "Antes da primeira sessão",
    path: "Menu lateral → Salas",
    steps: [
      "Suas salas são criadas automaticamente pelo administrador ao cadastrar o grupo.",
      "Abra a sala e clique em Gerenciar cenários para vincular um ou mais cenários do banco.",
      "Ajuste os critérios de avaliação da sala (opening/closing) — pode adicionar, editar ou remover critérios padrão.",
      "Defina Coordenador e Relator no painel Participantes; você pode trocar durante a sessão.",
    ],
  },
  {
    id: "p-scenario", icon: FileText, title: "Liberar cenário para os alunos",
    desc: "Controlar quando o problema aparece",
    path: "Sala PBL → topo → seletor de cenário → botão Liberar",
    steps: [
      "Selecione o cenário desejado na lista e clique em Liberar para os alunos.",
      "Cada cenário mantém sua própria sessão isolada (chat, whiteboard, avaliações independentes).",
      "Use Cenários Adaptativos para gerar sub-problemas focados nas dificuldades detectadas pela IA.",
    ],
  },
  {
    id: "p-conduct", icon: Layers, title: "Conduzir a sessão P1 → P7",
    desc: "Avançar passos em tempo real",
    path: "Sala PBL → botões P1..P7 no topo",
    steps: [
      "Clique em P1..P7 para avançar; a mudança é replicada em tempo real para todos os alunos.",
      "P1–P5 (abertura): apenas o Relator escreve no whiteboard e nos cards de contribuições.",
      "P7 (fechamento): habilita a aba Apresentação, o Kanban de Objetivos, comentários por slide e o Bloco do Veredito.",
      "Ao clicar em Finalizar P7, um checklist confirma que veredito e avaliações estão completos.",
    ],
  },
  {
    id: "p-timer", icon: Timer, title: "Timer da sessão e tempo de fala",
    desc: "Cronômetros regressivos e por participante",
    path: "Sala PBL → aba Timer / painel Participantes",
    steps: [
      "Abertura: 80min regressivos. Fechamento: 60min regressivos. Um alerta soa perto do fim.",
      "No painel Participantes, clique no nome de um aluno para iniciar seu cronômetro de fala; clique novamente para pausar; clicar outra vez reinicia do zero.",
      "Cada trecho de fala é gravado com o passo (P3 — Brainstorming, etc.) e aparece no relatório.",
    ],
  },
  {
    id: "p-evaluation", icon: ClipboardCheck, title: "Avaliar alunos",
    desc: "Notas por critério com apoio da IA",
    path: "Sala PBL → aba Avaliação → selecione um aluno",
    steps: [
      "Para cada critério clique em O (0), I (25), PS (50), S (75) ou MS (100).",
      "Clique no ícone ✨ Sparkles ao lado de qualquer critério para pedir uma sugestão de nota com justificativa e evidências (chat, referências, comentários, avaliação por pares).",
      "Revise e aceite a sugestão — a IA nunca aplica nota sozinha; auditoria fica em evaluation_suggestions.",
    ],
  },
  {
    id: "p-tutor-ears", icon: Mic, title: "Tutor Ears (gravação de áudio)",
    desc: "Transcrição e mapa de participação oral",
    path: "Sala PBL → barra lateral → Tutor Ears",
    steps: [
      "O Coordenador clica em Iniciar gravação (autorize o microfone no navegador).",
      "Ao parar, o áudio é enviado (limite 20MB) e transcrito com diarização (Speaker A/B/C) via Gemini.",
      "Você vê o Mapa de Participação Oral (tempo por locutor) e termos do glossário citados oralmente.",
      "A transcrição alimenta a Ata final e entra como evidência na Rubrica Inteligente.",
    ],
  },
  {
    id: "p-concept-map", icon: Network, title: "Mapa conceitual colaborativo",
    desc: "Diagrama gerado por IA",
    path: "Sala PBL → barra lateral → Mapa Conceitual",
    steps: [
      "Clique em Gerar para pedir à IA um mapa de conceitos com base no chat, whiteboard e termos citados.",
      "Existem dois mapas por sessão: abertura (P3–P5) e fechamento (P7).",
      "Clique em Diff abertura × fechamento para ver evolução cognitiva (conceitos novos, removidos).",
      "Você e o Relator podem arrastar nós e clicar em Salvar layout.",
    ],
  },
  {
    id: "p-patient", icon: Stethoscope, title: "Liberar paciente virtual",
    desc: "Janelas de 5 minutos por fase",
    path: "P1 ou P7 → aba Entrevistar Paciente → Liberar",
    steps: [
      "Você libera duas janelas: 5min na abertura e 5min no fechamento.",
      "Um cronômetro regressivo aparece para todos; ao zerar, a aba é bloqueada até a próxima liberação.",
      "Alunos entrevistam o paciente virtual (chat/voz) baseado no dossiê oculto do cenário.",
    ],
  },
  {
    id: "p-minutes", icon: FileText, title: "Ata automática da sessão",
    desc: "Documento fiel às contribuições dos alunos",
    path: "Sala PBL → aba Ata (após P7)",
    steps: [
      "Clique em Gerar Ata: a IA compõe o documento usando exclusivamente contribuições registradas (chat, whiteboard, referências, comentários, entrevistas).",
      "Se uma etapa estiver vazia, a Ata declara Nenhuma contribuição registrada — a IA não inventa dados.",
      "Baixe em PDF; a Ata também consolida o Mapa Conceitual e o Mapa de Participação Oral.",
    ],
  },
  {
    id: "p-reports", icon: BarChart3, title: "Relatórios do professor",
    desc: "Visão longitudinal do grupo e do aluno",
    path: "Menu lateral → Relatórios",
    steps: [
      "Aba Notas: evolução P1–Pn por critério e por aluno; exportação PDF em Professional/Enterprise.",
      "Aba Participação por trecho: cada fala com aluno, momento (mm:ss), passo e duração.",
      "Aba Risco: alunos em risco de reprovar (regra: <75% frequência ou <50% nota) com explicação da IA.",
      "Aba Apoio ao Tutor: diagnóstico de padrões de dificuldade e sugestões pedagógicas para as próximas sessões.",
    ],
  },
  {
    id: "p-ai-cotutor", icon: Brain, title: "AI Co-tutor",
    desc: "Assistente contextual da sala",
    path: "Sala PBL → barra lateral → AI Co-tutor",
    steps: [
      "Faça perguntas sobre o cenário; a IA responde com base no glossário, perguntas-guia e dados da sala.",
      "Consumo é contado no limite mensal da instituição — visível em Admin → Assinatura.",
    ],
  },
  {
    id: "p-planning", icon: Calendar, title: "Planejamento semestral",
    desc: "Calendário de sessões",
    path: "Menu lateral → Planejamento (quando disponível)",
    steps: [
      "Agende sessões futuras num calendário interativo por módulo/curso.",
      "As sessões planejadas viram templates para replicar cenário e critérios.",
    ],
  },
];

// =============================================================
// ADMINISTRADOR
// =============================================================
const adminSections: DocSection[] = [
  {
    id: "a-panel", icon: Settings, title: "Painel administrativo",
    desc: "Ponto central de gestão",
    path: "Menu lateral → Admin",
    steps: [
      "Abas: Instituições, Cursos, Módulos, Grupos, Usuários, Cenários, Cenários Adaptativos, Objetivos, Branding, IA, API, Analytics, Financeiro, Assinatura, Segurança, Pipeline.",
      "Superadmin enxerga todas as instituições; Institution Admin enxerga apenas a própria (RLS).",
    ],
  },
  {
    id: "a-institution", icon: Server, title: "Criar/gerenciar instituições",
    desc: "Multi-tenant isolado",
    path: "Admin → Instituições",
    steps: [
      "Superadmin cria instituições e delega owner_id a um Institution Admin.",
      "Cada instituição possui suas próprias cores, logo, chaves de IA e limite mensal de uso.",
      "Instituições possuídas pelo Superadmin liberam automaticamente todos os recursos Enterprise para seus membros.",
    ],
  },
  {
    id: "a-hierarchy", icon: GitBranch, title: "Hierarquia acadêmica",
    desc: "Cursos → Módulos → Grupos → Salas",
    path: "Admin → Cursos / Módulos / Grupos",
    steps: [
      "Crie o curso, adicione módulos e depois grupos vinculados a um módulo e a um professor.",
      "Ao criar um grupo, uma sala PBL é gerada automaticamente com critérios padrão.",
      "Adicione alunos ao grupo em Grupos → Membros; eles passam a ver a sala no Dashboard.",
    ],
  },
  {
    id: "a-users", icon: Users, title: "Cadastrar professores e alunos",
    desc: "Provisionamento em massa",
    path: "Admin → Usuários",
    steps: [
      "Clique em Novo usuário e escolha o papel (professor, aluno, institution_admin).",
      "A plataforma gera uma senha inicial usando DEFAULT_PROFESSOR_PASSWORD / DEFAULT_STUDENT_PASSWORD.",
      "Emails são únicos por instituição — o mesmo email pode ser usado em instituições diferentes.",
      "Para remover: deletar respeita a ordem group_members → course_members → user_roles → profiles → auth.",
    ],
  },
  {
    id: "a-invite", icon: Mail, title: "Convidar Institution Admin",
    desc: "Fluxo com pré-definição de plano",
    path: "Admin → Convidar Admin",
    steps: [
      "Preencha nome, email e escolha o plano (invited_starter, invited_professional, invited_enterprise).",
      "O convidado recebe email da Resend e ao aceitar herda a instituição sem passar por checkout Stripe.",
    ],
  },
  {
    id: "a-scenarios", icon: FileText, title: "Banco de cenários",
    desc: "Gerar, editar e reutilizar",
    path: "Admin → Cenários",
    steps: [
      "Crie manualmente ou clique em Gerar com IA — informe tema, contexto e área.",
      "Preencha o Dossiê Oculto do Paciente (usado pelo simulador virtual) e o Glossário do cenário.",
      "Cenários adaptativos: em Admin → Cenários Adaptativos, defina critérios/objetivos alvo e a IA gera variações.",
    ],
  },
  {
    id: "a-objectives", icon: Target, title: "Banco de objetivos",
    desc: "Objetivos de aprendizagem reutilizáveis",
    path: "Admin → Objetivos",
    steps: [
      "Cadastre objetivos por módulo, marque como essenciais para destaque nos relatórios.",
      "Vincule objetivos aos cenários — aparecem no Kanban do P7.",
    ],
  },
  {
    id: "a-branding", icon: Palette, title: "Branding e white-label",
    desc: "Personalização visual",
    path: "Admin → Branding",
    steps: [
      "Faça upload do logo e ajuste cor primária, secundária e de destaque.",
      "As cores são aplicadas via CSS variables (BrandingContext) em todo o sistema.",
      "Disponível no plano Enterprise.",
    ],
  },
  {
    id: "a-ai-keys", icon: Brain, title: "Chaves de IA por instituição",
    desc: "OpenAI, Gemini, Claude, Groq, OpenRouter",
    path: "Admin → IA",
    steps: [
      "Adicione as chaves dos provedores desejados. Cada função tenta os provedores externos ativos em ordem.",
      "Se todos falharem, cai automaticamente no Lovable AI Gateway (fallback).",
      "Consumo mensal aparece em Admin → Assinatura; limites variam por plano.",
    ],
  },
  {
    id: "a-api", icon: Webhook, title: "API pública (SIS/LMS)",
    desc: "Chaves e endpoints REST",
    path: "Admin → API & Integrações",
    steps: [
      "Gere uma chave (pbl_live_xxx) e escolha o escopo (read/write).",
      "Endpoints GET: /v1/institution, /v1/courses, /v1/groups, /v1/rooms, /v1/users, /v1/sessions, /v1/evaluations, /v1/attendance.",
      "Endpoints POST (escopo write): /v1/courses, /v1/users. Paginação via ?page=1&page_size=20.",
      "Autenticação via header Authorization: Bearer pbl_live_xxx.",
    ],
  },
  {
    id: "a-subscription", icon: LineChart, title: "Assinatura e cobrança",
    desc: "Stripe integrado",
    path: "Admin → Assinatura",
    steps: [
      "Planos: Starter, Professional, Enterprise (em BRL).",
      "Autoatendimento via Stripe Customer Portal; cancelamento marca cancel_at_period_end.",
      "Trial exibe contagem regressiva e trava recursos após expiração.",
    ],
  },
  {
    id: "a-analytics", icon: BarChart3, title: "Analytics do Superadmin",
    desc: "Dashboard de 4 dimensões",
    path: "Admin → Analytics",
    steps: [
      "Visitors: origem, funil, consentimento de cookies.",
      "AI: consumo mensal por provedor/modelo/função.",
      "Platform: sessões, salas ativas, uploads.",
      "Engagement: retenção, badges, avaliações por pares.",
    ],
  },
  {
    id: "a-security", icon: ShieldCheck, title: "Segurança e auditoria",
    desc: "Scans e memória de segurança",
    path: "Admin → Segurança",
    steps: [
      "RLS habilitado em 100% das tabelas; roles em tabela separada (user_roles).",
      "Buckets: references privado (URL assinada 1h) e presentations público.",
      "ai_usage_log restrito ao dono/admin; admin_invites SELECT apenas ao remetente.",
    ],
  },
  {
    id: "a-pipeline", icon: Wrench, title: "Roadmap e pipeline",
    desc: "Atualizações mensais",
    path: "Admin → Pipeline",
    steps: [
      "Superadmin visualiza propostas automáticas de 7–8 features/mês geradas pela IA.",
      "Aprove ou descarte itens; o changelog público é atualizado.",
    ],
  },
];

// =============================================================
// TÉCNICO
// =============================================================
const technicalSections: DocSection[] = [
  {
    id: "t-arch", icon: Server, title: "Arquitetura geral",
    desc: "Visão macro do sistema",
    steps: [
      "SPA React 18 + Vite servida via CDN; sem backend próprio.",
      "Backend serverless via Supabase (PostgreSQL + Auth + Storage + Edge Functions Deno).",
      "IA via Lovable AI Gateway como fallback, com prioridade para chaves externas por instituição (OpenAI, Gemini, Claude, Groq, OpenRouter).",
      "Realtime via Supabase Postgres Changes + Broadcast channels para whiteboard, chat, comentários, referências e sessões.",
    ],
  },
  {
    id: "t-frontend", icon: Code2, title: "Frontend",
    desc: "Stack e padrões",
    steps: [
      "React 18 + TypeScript 5 + Vite 5, roteamento com react-router-dom v6.",
      "Tailwind CSS v3 + shadcn/ui (Radix) com design tokens em src/index.css; nunca hardcode de cores.",
      "TanStack Query para cache; Context API para Auth (AuthContext), Branding (BrandingContext) e i18n.",
      "Framer Motion para animações; @xyflow/react para o mapa conceitual.",
      "i18next com três locales (pt/en/es) em src/i18n/locales.",
    ],
  },
  {
    id: "t-db", icon: Database, title: "Modelo de dados",
    desc: "Principais tabelas e RLS",
    steps: [
      "institutions → courses → modules → groups → rooms → tutorial_sessions (uma por cenário/sala).",
      "user_roles em tabela separada (roles: admin, institution_admin, professor, student) — previne escalonamento.",
      "Funções SECURITY DEFINER: has_role, is_group_member, is_group_professor, is_institution_member, is_institution_admin — usadas nas policies para evitar recursão (42P17).",
      "Toda tabela pública tem GRANT explícito antes de ENABLE RLS + policies granulares por role e escopo.",
      "REPLICA IDENTITY FULL habilitado em tabelas que precisam de UPDATE/DELETE em tempo real (presentation_comments, session_objective_references, session_references).",
    ],
  },
  {
    id: "t-storage", icon: Lock, title: "Storage",
    desc: "Buckets e políticas",
    steps: [
      "references (privado): PDFs e artigos; SELECT restrito ao dono via prefixo user_id/*; leitura via signed URL de 1h.",
      "presentations (público): apresentações do P7; URL pública é aceitável pois já é conteúdo compartilhado do grupo.",
      "Áudios de Tutor Ears usam session_audio_recordings + policies que checam membership da sala.",
    ],
  },
  {
    id: "t-ai", icon: Cpu, title: "IA — provedores e fallback",
    desc: "Como as edge functions chamam modelos",
    steps: [
      "Cada função (oracle-agent, sales-agent, ai-cotutor, generate-scenario, generate-minutes, generate-roadmap, generate-adaptive-scenario, suggest-evaluation, generate-concept-map, generate-arguition, patient-simulator, transcribe-session, tutor-insights) consulta ai_provider_keys ativos.",
      "Tenta cada provedor externo em ordem definida; falhando todos, usa Lovable AI Gateway (google/gemini-3-flash-preview ou modelo indicado).",
      "Uso é registrado em ai_usage_log (tokens, custo, prompt_type, institution_id) para relatórios e limites mensais em ai_interaction_counts.",
      "Trata rate limit (429) e falta de créditos (402) com toasts amigáveis no cliente.",
    ],
  },
  {
    id: "t-realtime", icon: Network, title: "Realtime",
    desc: "Padrões de sincronização",
    steps: [
      "Postgres Changes com filtro por session_id / room_id para chat, contribuições, referências, comentários, objetivos, verdicts, arguition_cards, patient_interviews.",
      "Broadcast channels para whiteboard (baixa latência entre relator e demais).",
      "Mudança de passo (activeStep) da tutorial_sessions replica para alunos ouvindo por room_id.",
      "Presence usado indiretamente por painel Participantes.",
    ],
  },
  {
    id: "t-functions", icon: Server, title: "Edge Functions relevantes",
    desc: "Deno runtime",
    steps: [
      "Auth/administração: login, invite-admin, manage-users, setup-institution, check-subscription, create-checkout, cancel-subscription, customer-portal.",
      "IA principal: ai-cotutor, oracle-agent, sales-agent, generate-scenario, generate-adaptive-scenario, generate-minutes, generate-roadmap, generate-arguition, generate-concept-map, suggest-evaluation, patient-simulator, transcribe-session, tutor-insights, predict-risk, analyze-performance.",
      "Integrações: search-articles (PubMed/SciELO), send-contact (Resend), public-api (REST externa), hub-metrics, compute-badges, manage-ai-keys.",
      "Todas validam JWT em código quando verify_jwt=false; CORS configurado em cada função.",
    ],
  },
  {
    id: "t-security", icon: ShieldCheck, title: "Segurança",
    desc: "Práticas aplicadas",
    steps: [
      "RLS em 100% das tabelas; roles em user_roles com policies via has_role.",
      "Nunca armazenar role na profile; nunca decidir permissão a partir de localStorage.",
      "Senhas gerenciadas pelo Supabase Auth (bcrypt) + senhas efêmeras via login edge function.",
      "Secrets no Supabase Vault: STRIPE_SECRET_KEY, RESEND_API_KEY, LOVABLE_API_KEY, HUB_METRICS_KEY, defaults de senha.",
      "Scans Wiz + memória de segurança em @security-memory; findings ignorados são documentados.",
    ],
  },
  {
    id: "t-payments", icon: Webhook, title: "Pagamentos",
    desc: "Stripe",
    steps: [
      "Fluxo: create-checkout → redirect → check-subscription (3 tentativas para indexação Stripe).",
      "Portal do cliente via customer-portal; cancel-subscription marca cancel_at_period_end.",
      "Feature flags (fullReportsEnabled, peerEvalEnabled, aiEnabled) derivadas do price_id.",
    ],
  },
  {
    id: "t-public-api", icon: Webhook, title: "API pública",
    desc: "Integração com SIS/LMS",
    steps: [
      "Base: https://vpoqqgnbhqgxikumjitu.supabase.co/functions/v1/public-api",
      "Autenticação: Bearer pbl_live_xxx; escopos read/write validados em api_keys (SHA-256 via hash_api_key).",
      "Requests logados em api_request_log (timestamp, endpoint, status, latência).",
      "Versionamento por prefixo /v1/; erros HTTP padrão 200/201/401/403/404/422/500.",
    ],
  },
  {
    id: "t-i18n", icon: Languages, title: "Internacionalização",
    desc: "i18next",
    steps: [
      "Detecção automática do idioma do navegador com fallback pt-BR.",
      "Arquivos JSON separados: pt.json, en.json, es.json. Chave t('ns.key', 'fallback').",
      "Troca em tempo real via LanguageSwitcher.",
    ],
  },
  {
    id: "t-branding", icon: Palette, title: "White-label técnico",
    desc: "BrandingContext",
    steps: [
      "Cores hex convertidas para HSL e injetadas em CSS variables (--primary, --secondary, --accent) no root.",
      "Logo e nome da plataforma vindos de institutions; ProtectedRoute recarrega branding após auth.",
      "Aplicado somente para instituições no plano Enterprise.",
    ],
  },
  {
    id: "t-deploy", icon: GitBranch, title: "Deploy e ambientes",
    desc: "Como o app roda em produção",
    steps: [
      "Frontend publicado via Lovable Hosting (CDN); domínios custom via Settings → Domains.",
      "Supabase gerenciado; migrações versionadas em supabase/migrations.",
      "Edge Functions declaradas em supabase/config.toml e deployadas automaticamente.",
      "Secrets configurados via UI do Supabase; nunca commitar tokens.",
    ],
  },
];


function AccordionItem({ section }: { section: DocSection }) {
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
            {section.path && (
              <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                <Search className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-primary/80">Onde encontrar</p>
                  <p className="text-sm text-foreground/75">{section.path}</p>
                </div>
              </div>
            )}
            {section.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground/75 leading-relaxed">{step}</p>
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

type TabKey = "student" | "professor" | "admin" | "technical";

export default function Documentation() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>("student");

  const tabs: { key: TabKey; label: string; icon: React.ElementType; sections: DocSection[]; blurb: string }[] = [
    { key: "student", label: "Aluno", icon: GraduationCap, sections: studentSections, blurb: "Manual completo para participar de sessões PBL." },
    { key: "professor", label: "Professor", icon: UserCheck, sections: professorSections, blurb: "Como conduzir sessões, avaliar e usar a IA." },
    { key: "admin", label: "Administrador", icon: Settings, sections: adminSections, blurb: "Configuração da instituição, usuários e integrações." },
    { key: "technical", label: "Técnico / TI", icon: Code2, sections: technicalSections, blurb: "Arquitetura, banco de dados, IA e segurança." },
  ];

  const current = tabs.find((tab) => tab.key === activeTab)!;

  return (
    <div className="min-h-screen bg-[hsl(25,30%,92%)] text-foreground overflow-x-hidden selection:bg-primary/20">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,40%,88%)] via-[hsl(25,25%,90%)] to-[hsl(210,30%,88%)]" />
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-bl from-[hsl(210,60%,85%)]/40 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
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

      <section className="pt-28 pb-6 px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto text-center">
          <motion.div variants={rise}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/50 backdrop-blur-md border border-white/60 px-5 py-2 text-sm font-medium text-foreground/70 shadow-sm mb-6">
              <BookOpen className="h-4 w-4 text-primary" />
              Central de Documentação
            </span>
          </motion.div>
          <motion.h1 variants={rise} className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Documentação do PBL Virtual
          </motion.h1>
          <motion.p variants={rise} className="text-foreground/60 text-lg max-w-xl mx-auto">
            Manual completo por perfil de usuário e referência técnica para times de TI.
          </motion.p>
        </motion.div>
      </section>

      <section className="px-6 pb-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-white/40 backdrop-blur-xl rounded-2xl border border-white/60">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-semibold transition-all ${
                    active
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
          <p className="text-center text-sm text-foreground/55 mt-4">{current.blurb}</p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <motion.div key={activeTab} initial="hidden" animate="visible" variants={stagger} className="max-w-3xl mx-auto space-y-3">
          {current.sections.map((section) => (
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
