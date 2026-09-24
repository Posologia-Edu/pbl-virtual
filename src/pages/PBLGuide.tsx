import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileSearch,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  MessageSquare,
  MonitorPlay,
  PenLine,
  Presentation,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";
import AuthDialog from "@/components/AuthDialog";
import Footer from "@/components/Footer";

type Role = "student" | "professor";
export type ScreenKey =
  | "student-dashboard"
  | "room-flow"
  | "collaboration"
  | "objectives"
  | "research"
  | "presentation"
  | "evaluation"
  | "professor-dashboard"
  | "release"
  | "control"
  | "monitor"
  | "finalize";

type GuideStep = {
  number: string;
  label: string;
  title: string;
  description: string;
  bullets: string[];
  tip: string;
  screen: ScreenKey;
};

const studentSteps: GuideStep[] = [
  {
    number: "01",
    label: "Acesso",
    title: "Entre na sua sala e entenda o momento da turma",
    description: "No painel do aluno, você encontra as salas disponíveis, o cenário liberado e o passo atual da sessão.",
    bullets: ["Abra a sala indicada pelo professor.", "Confira cenário, participantes e horário.", "Clique em Entrar na sala para acompanhar o grupo."],
    tip: "O sistema salva cada contribuição automaticamente — você pode voltar sem perder o contexto.",
    screen: "student-dashboard",
  },
  {
    number: "02",
    label: "P1 → P2",
    title: "Leia o problema e ajude a definir o foco",
    description: "A sessão avança pelos sete passos do PBL. Nos primeiros momentos, o grupo transforma o caso em uma pergunta de aprendizagem.",
    bullets: ["Leia o cenário com atenção.", "Registre termos desconhecidos e perguntas.", "Contribua para a definição consensuada do problema."],
    tip: "Use o chat para discutir; o Relator organiza as decisões no whiteboard.",
    screen: "room-flow",
  },
  {
    number: "03",
    label: "P3 → P4",
    title: "Construa hipóteses com o grupo",
    description: "Brainstorming e sistematização acontecem juntos: o grupo levanta possibilidades, conecta ideias e identifica o que ainda precisa investigar.",
    bullets: ["Compartilhe hipóteses sem julgá-las cedo demais.", "Observe as conexões no mapa conceitual.", "Ajude a agrupar as ideias em categorias."],
    tip: "Uma boa contribuição é objetiva, conectada ao caso e aberta para ser refinada pelo grupo.",
    screen: "collaboration",
  },
  {
    number: "04",
    label: "P5",
    title: "Transforme a discussão em objetivos de aprendizagem",
    description: "No P5, as hipóteses viram objetivos claros. Eles orientam o estudo individual e dão sentido ao fechamento da sessão.",
    bullets: ["Proponha objetivos específicos e investigáveis.", "Vote e refine os objetivos do grupo.", "Confira quais objetivos ficaram sob sua responsabilidade."],
    tip: "Prefira verbos de ação: explicar, comparar, identificar, interpretar ou aplicar.",
    screen: "objectives",
  },
  {
    number: "05",
    label: "P6",
    title: "Estude, pesquise e compartilhe referências",
    description: "Durante o estudo individual, a sala continua sendo o ponto de encontro. Registre fontes confiáveis e relacione cada uma a um objetivo.",
    bullets: ["Pesquise dentro da sala ou abra uma busca científica.", "Anexe artigo, DOI, link ou PDF.", "Escreva uma nota curta sobre a contribuição da fonte."],
    tip: "Uma referência útil explica por que aquela fonte ajuda a responder ao objetivo.",
    screen: "research",
  },
  {
    number: "06",
    label: "P7",
    title: "Apresente a síntese e converse sobre as evidências",
    description: "No fechamento, o Relator apresenta a síntese do grupo e todos podem comentar slide a slide, citando as referências usadas.",
    bullets: ["Acompanhe o mesmo slide que o grupo está vendo.", "Comente pontos fortes e lacunas da síntese.", "Conecte cada conclusão ao objetivo correspondente."],
    tip: "Comentários específicos ajudam mais do que avaliações genéricas: cite o slide e a evidência.",
    screen: "presentation",
  },
  {
    number: "07",
    label: "Reflexão",
    title: "Avalie sua participação e aprenda com o processo",
    description: "Ao final, registre uma avaliação honesta sobre sua participação e a colaboração do grupo. Esse retorno orienta o próximo encontro.",
    bullets: ["Avalie colegas e autoavalie sua atuação.", "Considere preparo, colaboração e argumentação.", "Leia seus indicadores no painel pessoal."],
    tip: "A avaliação por pares é anônima para os colegas e visível ao professor no relatório.",
    screen: "evaluation",
  },
];

const professorSteps: GuideStep[] = [
  {
    number: "01",
    label: "Preparação",
    title: "Prepare a sala antes do encontro",
    description: "Comece pela sala da turma. Vincule o cenário, confira os participantes e deixe os critérios de avaliação prontos.",
    bullets: ["Abra Salas no menu lateral.", "Escolha ou crie o cenário da sessão.", "Defina Coordenador e Relator do grupo."],
    tip: "Uma boa preparação libera você para observar o raciocínio dos alunos durante o encontro.",
    screen: "professor-dashboard",
  },
  {
    number: "02",
    label: "Liberação",
    title: "Libere o problema no momento certo",
    description: "O cenário só aparece para os alunos quando você libera. Assim, todo o grupo começa a discussão junto e com o mesmo contexto.",
    bullets: ["Selecione o cenário da sessão.", "Confira objetivos e instruções do caso.", "Clique em Liberar para alunos."],
    tip: "Cada cenário mantém chat, whiteboard e avaliações separados para facilitar o acompanhamento.",
    screen: "release",
  },
  {
    number: "03",
    label: "Condução",
    title: "Avance pelos sete passos do PBL",
    description: "Use o controle de etapas para manter o ritmo. A mudança é sincronizada em tempo real para todos os participantes.",
    bullets: ["Avance de P1 a P7 conforme o grupo amadurece.", "Use o timer de abertura e fechamento.", "Abra o painel de participantes para acompanhar papéis."],
    tip: "O sistema organiza a sequência; sua mediação continua sendo o que dá profundidade à discussão.",
    screen: "control",
  },
  {
    number: "04",
    label: "Acompanhamento",
    title: "Observe participação, objetivos e evidências",
    description: "Enquanto os alunos trabalham, você acompanha contribuições, tempo de fala, objetivos e referências sem interromper o fluxo.",
    bullets: ["Veja quem está participando e em qual etapa.", "Acompanhe a qualidade dos objetivos do P5.", "Use o apoio do tutor quando o grupo precisar de uma pergunta-guia."],
    tip: "Intervenha com perguntas que façam o grupo pensar, não com respostas prontas.",
    screen: "monitor",
  },
  {
    number: "05",
    label: "Fechamento",
    title: "Finalize a sessão com avaliação e veredito",
    description: "No P7, revise a síntese, registre o veredito e conclua as avaliações. A plataforma transforma o encontro em um histórico consultável.",
    bullets: ["Revise apresentação e referências do grupo.", "Preencha os critérios de avaliação.", "Finalize o P7 para gerar ata e relatório."],
    tip: "O relatório reúne evidências do processo — não apenas o resultado final.",
    screen: "finalize",
  },
];

const roleContent = {
  student: {
    eyebrow: "Trilha do aluno",
    title: "Participe com clareza em cada etapa",
    description: "Do primeiro acesso à reflexão final, saiba onde contribuir e como transformar sua participação em aprendizagem.",
    icon: GraduationCap,
    accent: "bg-primary",
    steps: studentSteps,
  },
  professor: {
    eyebrow: "Trilha do professor",
    title: "Conduza a sessão sem perder o grupo de vista",
    description: "Prepare, libere, acompanhe e avalie. O PBL Virtual deixa o método visível para você mediar melhor.",
    icon: UserCheck,
    accent: "bg-emerald-600",
    steps: professorSteps,
  },
};

function MockupShell({ children, section = "Sala PBL", active = "Sala" }: { children: React.ReactNode; section?: string; active?: string }) {
  const navItems = ["Painel", "Salas", "Relatórios"];
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_24px_70px_-38px_rgba(15,35,65,0.5)]">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/90 px-4 py-3"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><div className="ml-3 flex h-7 min-w-0 flex-1 items-center rounded-lg bg-white px-3 text-[10px] text-slate-400 shadow-sm ring-1 ring-slate-200/70">app.pblvirtual.com / {section.toLowerCase().replace(/\s+/g, "-")}</div><div className="hidden h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary sm:flex">AS</div></div>
      <div className="flex min-h-[290px] bg-[#f7f9fc]"><aside className="hidden w-[116px] shrink-0 flex-col border-r border-slate-200 bg-[#14243a] p-3 sm:flex"><div className="mb-7 flex items-center gap-1.5 text-[10px] font-bold text-white"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500"><GraduationCap className="h-3.5 w-3.5" /></span>PBL Virtual</div><div className="space-y-1.5">{navItems.map((item) => <div key={item} className={`rounded-lg px-2 py-1.5 text-[9px] ${active === item ? "bg-white/12 text-white" : "text-slate-400"}`}>{item}</div>)}</div><div className="mt-auto rounded-lg bg-white/8 px-2 py-2 text-[8px] leading-tight text-slate-300">Sessão em andamento<span className="mt-1 block text-emerald-300">● sincronizado</span></div></aside><div className="min-w-0 flex-1 p-3 sm:p-5">{children}</div></div>
    </div>
  );
}

function TinyBadge({ children, color = "blue" }: { children: React.ReactNode; color?: "blue" | "green" | "amber" | "violet" }) {
  const colors = { blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-600" };
  return <span className={`inline-flex items-center rounded-full px-2 py-1 text-[9px] font-semibold ${colors[color]}`}>{children}</span>;
}

function StudentDashboardMockup() {
  return <MockupShell section="Meu painel" active="Painel"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] text-slate-400">Quarta-feira, 22 de maio</p><h3 className="mt-1 text-sm font-bold text-slate-800 sm:text-base">Olá, Ana 👋</h3></div><TinyBadge color="green">● online</TinyBadge></div><div className="mt-4 grid grid-cols-3 gap-2">{[{ label: "Sessões", value: "12", icon: BookOpen }, { label: "Participação", value: "86%", icon: Users }, { label: "Badges", value: "08", icon: Sparkles }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-2.5"><Icon className="h-3.5 w-3.5 text-primary" /><p className="mt-2 text-[9px] text-slate-400">{label}</p><p className="text-sm font-bold text-slate-800">{value}</p></div>)}</div><div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.04] p-3"><div className="flex items-start justify-between gap-2"><div><TinyBadge>PBL 04 · hoje, 14:00</TinyBadge><p className="mt-2 text-xs font-bold text-slate-800">Dor torácica no adulto jovem</p><p className="mt-1 text-[9px] text-slate-500">Turma Saúde Coletiva · 8 participantes</p></div><span className="rounded-lg bg-primary px-2 py-1 text-[9px] font-semibold text-white">Entrar</span></div><div className="mt-3 flex items-center justify-between text-[9px] text-slate-400"><span>Etapa atual</span><span className="font-semibold text-primary">P3 · Brainstorming</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-[42%] rounded-full bg-primary" /></div></div></MockupShell>;
}

function RoomFlowMockup() {
  const steps = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];
  return <MockupShell section="sala-pbl" active="Salas"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">Sala PBL · PBL 04</p><h3 className="mt-1 text-sm font-bold text-slate-800">Dor torácica no adulto jovem</h3></div><TinyBadge color="green">ao vivo</TinyBadge></div><div className="mt-4 flex gap-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5">{steps.map((step, index) => <span key={step} className={`flex-1 rounded-lg py-1.5 text-center text-[9px] font-bold ${index === 2 ? "bg-primary text-white shadow-sm" : index < 2 ? "bg-primary/10 text-primary" : "text-slate-400"}`}>{step}</span>)}</div><div className="mt-3 grid gap-2 sm:grid-cols-[1.25fr_0.75fr]"><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Lightbulb className="h-3.5 w-3.5" /></div><div><p className="text-[9px] text-slate-400">Cenário liberado</p><p className="text-[10px] font-bold text-slate-700">O que está acontecendo?</p></div></div><p className="mt-3 text-[10px] leading-relaxed text-slate-500">Paciente de 32 anos relata dor torácica após esforço. O grupo precisa investigar...</p><div className="mt-3 flex gap-1.5"><TinyBadge>Termos: 04</TinyBadge><TinyBadge color="violet">Hipóteses: 09</TinyBadge></div></div><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700"><MessageSquare className="h-3.5 w-3.5 text-violet-500" /> Chat do grupo</div><div className="mt-3 space-y-2"><p className="rounded-lg rounded-tl-none bg-slate-100 p-2 text-[9px] text-slate-600"><b>João:</b> Vamos separar causas cardíacas?</p><p className="ml-3 rounded-lg rounded-tr-none bg-primary/10 p-2 text-[9px] text-slate-600"><b>Ana:</b> Sim, e pensar no contexto.</p></div><div className="mt-3 rounded-lg border border-slate-200 px-2 py-1.5 text-[9px] text-slate-400">Escreva uma mensagem…</div></div></div></MockupShell>;
}

function CollaborationMockup() {
  return <MockupShell section="whiteboard" active="Salas"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] text-slate-400">P3 · Brainstorming</p><h3 className="text-sm font-bold text-slate-800">Organize as hipóteses</h3></div><div className="flex gap-1 rounded-lg bg-slate-100 p-1"><span className="rounded-md bg-white px-2 py-1 text-[9px] font-semibold text-primary shadow-sm">Whiteboard</span><span className="px-2 py-1 text-[9px] text-slate-400">Mapa</span></div></div><div className="mt-4 grid gap-2 sm:grid-cols-[0.72fr_1.28fr]"><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-700">Chat</span><span className="h-2 w-2 rounded-full bg-emerald-400" /></div><div className="mt-3 space-y-2"><p className="rounded-lg bg-slate-100 p-2 text-[9px] text-slate-500">A dor pode ser muscular?</p><p className="rounded-lg bg-violet-50 p-2 text-[9px] text-violet-700">E se for ansiedade?</p><p className="rounded-lg bg-slate-100 p-2 text-[9px] text-slate-500">Vamos listar sinais de alerta.</p></div></div><div className="relative min-h-[158px] overflow-hidden rounded-xl border border-slate-200 bg-[#fffdfa] p-3"><div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(#cbd5e1 0.7px, transparent 0.7px)", backgroundSize: "12px 12px" }} /><div className="relative"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-700">Mapa conceitual</span><PenLine className="h-3.5 w-3.5 text-primary" /></div><div className="relative mt-4 h-[105px]"><div className="absolute left-[34%] top-[28%] rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[9px] font-bold text-primary">Dor torácica</div><div className="absolute left-[6%] top-[6%] rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[8px] font-semibold text-amber-700">Cardíaca</div><div className="absolute right-[2%] top-[10%] rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-[8px] font-semibold text-violet-700">Ansiedade</div><div className="absolute bottom-[3%] left-[18%] rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[8px] font-semibold text-emerald-700">Muscular</div><div className="absolute left-[28%] top-[42%] h-px w-[9%] rotate-[-25deg] bg-slate-300" /><div className="absolute left-[62%] top-[42%] h-px w-[11%] rotate-[22deg] bg-slate-300" /><div className="absolute left-[45%] top-[56%] h-[38%] w-px rotate-[25deg] bg-slate-300" /></div></div></div></div></MockupShell>;
}

function ObjectivesMockup() {
  const columns = [{ title: "Propostos", color: "text-slate-500", cards: ["Diferenciar causas de dor", "Identificar sinais de alerta"] }, { title: "Aprovados", color: "text-primary", cards: ["Explicar fisiopatologia"] }, { title: "Meu estudo", color: "text-emerald-600", cards: ["Interpretar ECG inicial"] }];
  return <MockupShell section="objetivos" active="Salas"><div className="flex items-center justify-between"><div><p className="text-[9px] text-slate-400">P5 · Objetivos de aprendizagem</p><h3 className="text-sm font-bold text-slate-800">O que precisamos aprender?</h3></div><Target className="h-5 w-5 text-primary" /></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{columns.map((column) => <div key={column.title} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200"><div className={`mb-2 text-[9px] font-bold ${column.color}`}>{column.title} <span className="ml-1 font-normal text-slate-400">{column.cards.length}</span></div><div className="space-y-2">{column.cards.map((card, i) => <div key={card} className={`rounded-lg border p-2 text-[9px] leading-snug ${column.title === "Meu estudo" ? "border-emerald-100 bg-emerald-50/70 text-emerald-800" : "border-slate-100 bg-slate-50 text-slate-600"}`}><span className="mr-1 text-[8px] text-slate-400">0{i + 1}</span>{card}</div>)}</div></div>)}</div><div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/[0.06] px-3 py-2 text-[9px] text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> 4 objetivos aprovados pelo grupo</div></MockupShell>;
}

function ResearchMockup() {
  return <MockupShell section="referências" active="Salas"><div className="flex items-center justify-between"><div><p className="text-[9px] text-slate-400">P6 · Estudo individual</p><h3 className="text-sm font-bold text-slate-800">Referências da sala</h3></div><TinyBadge color="violet">Objetivo 03</TinyBadge></div><div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-400"><Search className="h-3.5 w-3.5" /> Buscar artigo, DOI ou palavra-chave <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[8px]">Buscar</span></div><div className="mt-3 space-y-2">{[{ title: "Chest pain in young adults", source: "PubMed · 2024", type: "Artigo" }, { title: "Diretriz de dor torácica", source: "Sociedade Brasileira de Cardiologia", type: "PDF" }].map((item) => <div key={item.title} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><FileSearch className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-slate-700">{item.title}</p><p className="mt-1 text-[9px] text-slate-400">{item.source}</p></div><TinyBadge color="green">{item.type}</TinyBadge></div>)}</div></MockupShell>;
}

function PresentationMockup() {
  return <MockupShell section="apresentação" active="Salas"><div className="flex items-center justify-between"><div><p className="text-[9px] text-slate-400">P7 · Fechamento</p><h3 className="text-sm font-bold text-slate-800">Síntese do grupo</h3></div><div className="flex items-center gap-1 text-[9px] font-semibold text-slate-500"><Presentation className="h-3.5 w-3.5 text-primary" /> 03 / 08</div></div><div className="mt-3 grid gap-2 sm:grid-cols-[1.25fr_0.75fr]"><div className="min-h-[168px] rounded-xl border border-slate-200 bg-gradient-to-br from-[#eaf4ff] to-white p-4"><TinyBadge>Objetivo 03</TinyBadge><h4 className="mt-4 max-w-[190px] text-base font-extrabold leading-tight text-slate-800">Quando a dor torácica exige investigação?</h4><div className="mt-5 h-1.5 w-24 rounded-full bg-primary/30" /><div className="mt-2 h-1.5 w-36 rounded-full bg-slate-200" /><div className="mt-2 h-1.5 w-28 rounded-full bg-slate-200" /></div><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700"><MessageSquare className="h-3.5 w-3.5 text-violet-500" /> Comentários</div><div className="mt-3 space-y-2"><p className="rounded-lg bg-violet-50 p-2 text-[9px] text-slate-600"><b>Marina:</b> Incluir o dado do artigo.</p><p className="rounded-lg bg-slate-100 p-2 text-[9px] text-slate-600"><b>Você:</b> Boa, vou citar na ata.</p></div><div className="mt-3 flex items-center gap-1.5 text-[9px] text-primary"><Check className="h-3 w-3" /> Referência vinculada</div></div></div></MockupShell>;
}

function EvaluationMockup() {
  const criteria = [{ label: "Participação", value: "Excelente", width: "88%", color: "bg-primary" }, { label: "Colaboração", value: "Muito bom", width: "76%", color: "bg-emerald-500" }, { label: "Argumentação", value: "Muito bom", width: "72%", color: "bg-violet-500" }];
  return <MockupShell section="avaliação" active="Painel"><div className="flex items-center justify-between"><div><p className="text-[9px] text-slate-400">Reflexão da sessão · PBL 04</p><h3 className="text-sm font-bold text-slate-800">Como foi sua participação?</h3></div><ClipboardCheck className="h-5 w-5 text-primary" /></div><div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3">{criteria.map((criterion) => <div key={criterion.label}><div className="flex justify-between text-[9px]"><span className="font-semibold text-slate-600">{criterion.label}</span><span className="text-slate-400">{criterion.value}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${criterion.color}`} style={{ width: criterion.width }} /></div></div>)}<div className="flex gap-1.5 pt-1"><span className="rounded-lg bg-primary px-2 py-1.5 text-[9px] font-semibold text-white">Enviar avaliação</span><span className="rounded-lg border border-slate-200 px-2 py-1.5 text-[9px] font-semibold text-slate-500">Salvar rascunho</span></div></div></MockupShell>;
}

function ProfessorDashboardMockup() {
  return <MockupShell section="salas" active="Salas"><div className="flex items-start justify-between"><div><p className="text-[10px] text-slate-400">Visão do professor</p><h3 className="mt-1 text-sm font-bold text-slate-800">Suas salas PBL</h3></div><span className="rounded-lg bg-primary px-2.5 py-1.5 text-[9px] font-semibold text-white">+ Nova sala</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-primary/20 bg-white p-3"><div className="flex items-center justify-between"><TinyBadge color="green">em andamento</TinyBadge><span className="text-[9px] text-slate-400">PBL 04</span></div><p className="mt-3 text-[11px] font-bold text-slate-800">Saúde Coletiva · T2</p><p className="mt-1 text-[9px] text-slate-400">24 alunos · 4 grupos</p><div className="mt-3 flex items-center justify-between text-[9px]"><span className="text-slate-400">Cenário</span><span className="font-semibold text-primary">Dor torácica</span></div></div><div className="rounded-xl border border-slate-200 bg-white p-3"><TinyBadge color="amber">próxima</TinyBadge><p className="mt-3 text-[11px] font-bold text-slate-800">Clínica Médica · T1</p><p className="mt-1 text-[9px] text-slate-400">18 alunos · amanhã, 08:00</p><div className="mt-3 h-1.5 rounded-full bg-slate-100"><div className="h-full w-1/4 rounded-full bg-amber-400" /></div></div></div></MockupShell>;
}

function ReleaseMockup() {
  return <MockupShell section="gerenciar-cenários" active="Salas"><div className="flex items-center justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">Sala · Saúde Coletiva T2</p><h3 className="mt-1 text-sm font-bold text-slate-800">Gerenciar cenários</h3></div><span className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] text-slate-500">+ Novo cenário</span></div><div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-3"><div className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Lightbulb className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><TinyBadge>selecionado</TinyBadge><p className="mt-1.5 text-[11px] font-bold text-slate-800">Dor torácica no adulto jovem</p></div><span className="rounded-lg bg-emerald-500 px-2 py-1 text-[9px] font-bold text-white">Liberado</span></div><p className="mt-2 text-[9px] leading-relaxed text-slate-500">Paciente de 32 anos relata dor torácica após esforço...</p></div></div><div className="mt-3 flex items-center justify-between border-t border-primary/10 pt-3"><span className="text-[9px] text-slate-400">Visível para 8 alunos</span><span className="rounded-lg bg-primary px-2.5 py-1.5 text-[9px] font-semibold text-white">Liberar para alunos</span></div></div></MockupShell>;
}

function ControlMockup() {
  const steps = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];
  return <MockupShell section="controle-da-sessão" active="Salas"><div className="flex items-center justify-between"><div><p className="text-[9px] text-slate-400">Sala PBL · controle do professor</p><h3 className="text-sm font-bold text-slate-800">Conduzir sessão</h3></div><TinyBadge color="green">8 conectados</TinyBadge></div><div className="mt-4 rounded-xl border border-slate-200 bg-white p-2"><div className="mb-2 flex justify-between text-[9px] font-bold text-slate-500"><span>Etapa da sessão</span><span className="text-primary">P4 · Sistematização</span></div><div className="flex gap-1">{steps.map((step, index) => <span key={step} className={`flex-1 rounded-md py-1.5 text-center text-[9px] font-bold ${index === 3 ? "bg-primary text-white" : index < 3 ? "bg-primary/10 text-primary" : "bg-slate-50 text-slate-400"}`}>{step}</span>)}</div></div><div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500"><Timer className="h-3.5 w-3.5 text-amber-500" /> Tempo da abertura</div><p className="mt-2 text-xl font-extrabold tracking-tight text-slate-800">42:18</p><span className="mt-1 inline-flex rounded-lg bg-amber-50 px-2 py-1 text-[8px] font-semibold text-amber-700">Pausar timer</span></div><div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500"><Users className="h-3.5 w-3.5 text-primary" /> Participantes</div><div className="mt-2 flex -space-x-1.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[8px] font-bold text-blue-700 ring-2 ring-white">AS</span><span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[8px] font-bold text-violet-700 ring-2 ring-white">JM</span><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[8px] font-bold text-emerald-700 ring-2 ring-white">+6</span></div><p className="mt-2 text-[8px] text-emerald-600">Todos presentes</p></div></div></MockupShell>;
}

function MonitorMockup() {
  const people = [{ initials: "AS", name: "Ana Souza", role: "Relatora", score: "92%", color: "bg-blue-100 text-blue-700" }, { initials: "JM", name: "João Mendes", role: "Coordenador", score: "78%", color: "bg-violet-100 text-violet-700" }, { initials: "MC", name: "Marina Costa", role: "Participante", score: "84%", color: "bg-emerald-100 text-emerald-700" }];
  return <MockupShell section="acompanhamento" active="Relatórios"><div className="flex items-center justify-between"><div><p className="text-[9px] text-slate-400">Acompanhamento em tempo real</p><h3 className="text-sm font-bold text-slate-800">Como o grupo está avançando?</h3></div><BrainCircuit className="h-5 w-5 text-emerald-600" /></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{people.map((person) => <div key={person.name} className="rounded-xl border border-slate-200 bg-white p-2.5"><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[8px] font-bold ${person.color}`}>{person.initials}</span><div className="min-w-0"><p className="truncate text-[9px] font-bold text-slate-700">{person.name}</p><p className="text-[8px] text-slate-400">{person.role}</p></div></div><div className="mt-3 flex items-center justify-between text-[8px]"><span className="text-slate-400">Participação</span><span className="font-bold text-emerald-600">{person.score}</span></div><div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: person.score }} /></div></div>)}</div><div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[9px] text-amber-800"><CircleHelp className="h-3.5 w-3.5" /> O grupo ainda não conectou o objetivo 02 a uma referência.</div></MockupShell>;
}

function FinalizeMockup() {
  return <MockupShell section="fechamento" active="Relatórios"><div className="flex items-center justify-between"><div><p className="text-[9px] text-slate-400">P7 · Checklist final</p><h3 className="text-sm font-bold text-slate-800">Finalizar sessão</h3></div><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_0.85fr]"><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold text-slate-700">Antes de finalizar</p><div className="mt-3 space-y-2">{["Apresentação enviada", "Objetivos revisados", "Referências anexadas", "Avaliações preenchidas"].map((item) => <div key={item} className="flex items-center gap-2 text-[9px] text-slate-600"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-2.5 w-2.5" /></span>{item}</div>)}</div></div><div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3"><p className="text-[10px] font-bold text-slate-700">Veredito do tutor</p><div className="mt-3 rounded-lg border border-white bg-white p-2.5 text-[9px] leading-relaxed text-slate-500">Grupo conectou evidências aos objetivos e apresentou boa colaboração.</div><span className="mt-3 block rounded-lg bg-primary px-2 py-2 text-center text-[9px] font-semibold text-white">Finalizar P7</span></div></div></MockupShell>;
}

export function Mockup({ screen }: { screen: ScreenKey }) {
  const screens: Record<ScreenKey, React.ReactNode> = {
    "student-dashboard": <StudentDashboardMockup />, "room-flow": <RoomFlowMockup />, collaboration: <CollaborationMockup />, objectives: <ObjectivesMockup />, research: <ResearchMockup />, presentation: <PresentationMockup />, evaluation: <EvaluationMockup />, "professor-dashboard": <ProfessorDashboardMockup />, release: <ReleaseMockup />, control: <ControlMockup />, monitor: <MonitorMockup />, finalize: <FinalizeMockup />,
  };
  return screens[screen];
}

function GuideStepCard({ step, index, role }: { step: GuideStep; index: number; role: Role }) {
  const isEven = index % 2 === 1;
  const content = <div className="flex h-full flex-col justify-center"><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-extrabold text-white ${role === "student" ? "bg-primary" : "bg-emerald-600"}`}>{step.number}</span><span className={`text-xs font-bold uppercase tracking-[0.16em] ${role === "student" ? "text-primary" : "text-emerald-700"}`}>{step.label}</span></div><h3 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{step.title}</h3><p className="mt-4 text-[15px] leading-relaxed text-slate-600">{step.description}</p><div className="mt-5 space-y-2.5">{step.bullets.map((bullet) => <div key={bullet} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600"><span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${role === "student" ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-700"}`}><Check className="h-3 w-3" /></span>{bullet}</div>)}</div><div className={`mt-6 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${role === "student" ? "border-primary/15 bg-primary/[0.045] text-primary/80" : "border-emerald-500/15 bg-emerald-500/[0.045] text-emerald-800/80"}`}><span className="font-bold">Dica prática:</span> {step.tip}</div></div>;
  return <motion.article initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.16 }} transition={{ duration: 0.55, delay: Math.min(index * 0.03, 0.18) }} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"><div className={isEven ? "lg:order-2" : "lg:order-1"}>{content}</div><div className={isEven ? "lg:order-1" : "lg:order-2"}><div className="relative"><div className={`absolute -inset-6 -z-10 rounded-[2rem] blur-3xl ${role === "student" ? "bg-primary/10" : "bg-emerald-500/10"}`} /><Mockup screen={step.screen} /></div></div></motion.article>;
}

export default function PBLGuide() {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<Role>("student");
  const [authOpen, setAuthOpen] = useState(false);
  const current = roleContent[activeRole];
  const RoleIcon = current.icon;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return <div className="min-h-screen overflow-x-hidden bg-[hsl(25,30%,92%)] text-foreground selection:bg-primary/20"><div className="fixed inset-0 -z-10"><div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,40%,88%)] via-[hsl(25,25%,90%)] to-[hsl(210,30%,88%)]" /><div className="absolute right-0 top-0 h-[55%] w-[60%] rounded-full bg-gradient-to-bl from-[hsl(210,60%,85%)]/40 to-transparent blur-3xl" /><div className="absolute bottom-0 left-0 h-[50%] w-[50%] rounded-full bg-gradient-to-tr from-[hsl(30,50%,85%)]/50 to-transparent blur-3xl" /></div>
    <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"><div className="flex w-full max-w-5xl items-center gap-2 rounded-full border border-white/60 bg-white/55 px-3 py-2 shadow-lg shadow-black/5 backdrop-blur-xl"><button onClick={() => navigate("/")} className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-left transition-colors hover:bg-primary/15 sm:px-4"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary"><GraduationCap className="h-4 w-4 text-primary-foreground" /></div><span className="hidden text-sm font-bold text-primary sm:block">PBL Virtual</span></button><div className="hidden flex-1 items-center justify-center gap-1 rounded-full bg-white/40 px-2 py-1 lg:flex"><button onClick={() => navigate("/features")} className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground/65 transition-all hover:bg-white/60 hover:text-foreground">Recursos</button><button onClick={() => scrollTo("guide")} className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">Como funciona</button><button onClick={() => navigate("/#pillars")} className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground/65 transition-all hover:bg-white/60 hover:text-foreground">Sobre</button><button onClick={() => navigate("/pricing")} className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground/65 transition-all hover:bg-white/60 hover:text-foreground">Planos</button><button onClick={() => navigate("/docs")} className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground/65 transition-all hover:bg-white/60 hover:text-foreground">Documentação</button></div><div className="ml-auto flex items-center gap-0.5 sm:ml-0"><span className="rounded-full bg-primary/10 px-2 py-1 text-sm">🇧🇷</span><span className="hidden px-2 py-1 text-sm opacity-60 sm:inline">🇺🇸</span><span className="hidden px-2 py-1 text-sm opacity-60 sm:inline">🇪🇸</span></div><button onClick={() => setAuthOpen(true)} className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]">Entrar</button></div></motion.nav>

    <main><section className="relative px-6 pb-20 pt-36 sm:pb-28 sm:pt-44"><div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"><motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}><span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-2 text-sm font-semibold text-primary shadow-sm"><BookOpen className="h-4 w-4" /> Guia visual do PBL Virtual</span><h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-[1.02] tracking-tight text-slate-900 sm:text-6xl">Aprenda o método.<br /><span className="bg-gradient-to-r from-primary via-[hsl(210,76%,55%)] to-[hsl(250,60%,55%)] bg-clip-text text-transparent">Use o sistema.</span></h1><p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">Um passo a passo ilustrado para alunos e professores conduzirem sessões PBL com mais clareza, participação e evidências de aprendizagem.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={() => scrollTo("guide")} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-2xl">Começar o guia <ArrowRight className="h-4 w-4" /></button><button onClick={() => setActiveRole("professor")} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/45 px-6 text-sm font-bold text-slate-700 backdrop-blur-md transition-colors hover:bg-white/75"><UserCheck className="h-4 w-4 text-emerald-600" /> Sou professor</button></div><div className="mt-10 flex flex-wrap gap-5 text-sm text-slate-500"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 7 etapas visuais</span><span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> 2 perfis de uso</span><span className="flex items-center gap-2"><MonitorPlay className="h-4 w-4 text-violet-500" /> Em tempo real</span></div></motion.div><motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.15 }} className="relative"><div className="absolute -inset-8 -z-10 rounded-full bg-primary/10 blur-3xl" /><StudentDashboardMockup /><div className="absolute -bottom-7 -left-3 hidden items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-xl backdrop-blur-xl sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-[11px] font-bold text-slate-800">Tudo sincronizado</p><p className="text-[10px] text-slate-500">Sua turma está pronta para começar</p></div></div></motion.div></div></section>

      <section className="px-6 pb-14"><div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-3"><div className="rounded-3xl border border-white/60 bg-white/45 p-6 backdrop-blur-xl"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LayoutDashboard className="h-5 w-5" /></div><h3 className="mt-4 font-bold text-slate-900">Uma sala, tudo conectado</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">Cenário, conversa, quadro, objetivos e avaliação no mesmo lugar.</p></div><div className="rounded-3xl border border-white/60 bg-white/45 p-6 backdrop-blur-xl"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600"><Clock3 className="h-5 w-5" /></div><h3 className="mt-4 font-bold text-slate-900">O ritmo fica visível</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">As etapas P1 a P7 orientam o grupo sem engessar a mediação.</p></div><div className="rounded-3xl border border-white/60 bg-white/45 p-6 backdrop-blur-xl"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600"><BrainCircuit className="h-5 w-5" /></div><h3 className="mt-4 font-bold text-slate-900">O processo vira evidência</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">Cada contribuição ajuda a construir ata, relatório e próximos passos.</p></div></div></section>

      <section id="guide" className="scroll-mt-28 px-6 pb-28 pt-16 sm:pt-24"><div className="mx-auto max-w-6xl"><div className="mx-auto max-w-2xl text-center"><span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary"><Sparkles className="h-4 w-4" /> Escolha sua trilha</span><h2 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Cada pessoa vê o PBL por um ângulo</h2><p className="mt-4 text-lg leading-relaxed text-slate-600">Comece pelo seu perfil e acompanhe as telas que aparecem durante a jornada.</p></div><div className="mx-auto mt-10 grid max-w-xl grid-cols-2 gap-2 rounded-[1.5rem] border border-white/70 bg-white/45 p-2 shadow-sm backdrop-blur-xl"><button onClick={() => setActiveRole("student")} className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${activeRole === "student" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:bg-white/60"}`}><GraduationCap className="h-4 w-4" /> Aluno</button><button onClick={() => setActiveRole("professor")} className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${activeRole === "professor" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-500 hover:bg-white/60"}`}><UserCheck className="h-4 w-4" /> Professor</button></div><motion.div key={activeRole} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-14"><div className="mb-16 flex items-start gap-4 rounded-[2rem] border border-white/70 bg-white/45 p-6 shadow-sm backdrop-blur-xl sm:items-center sm:p-8"><div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${current.accent}`}><RoleIcon className="h-7 w-7" /></div><div><p className={`text-xs font-bold uppercase tracking-[0.18em] ${activeRole === "student" ? "text-primary" : "text-emerald-700"}`}>{current.eyebrow}</p><h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{current.title}</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{current.description}</p></div></div><div className="space-y-24 sm:space-y-32">{current.steps.map((step, index) => <GuideStepCard key={step.number} step={step} index={index} role={activeRole} />)}</div></motion.div></div></section>

      <section id="quick-start" className="px-6 pb-28"><div className="mx-auto max-w-6xl rounded-[2.5rem] border border-white/70 bg-white/45 p-8 shadow-sm backdrop-blur-xl sm:p-12"><div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]"><div><span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-1.5 text-sm font-semibold text-amber-700"><Lightbulb className="h-4 w-4" /> Antes de começar</span><h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Uma rotina simples para uma boa sessão</h2><p className="mt-4 text-base leading-relaxed text-slate-600">Se você souber onde está, qual é o próximo passo e o que precisa registrar, o sistema trabalha a favor da conversa.</p><button onClick={() => setAuthOpen(true)} className="mt-7 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02]">Entrar no PBL Virtual <ArrowRight className="h-4 w-4" /></button></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/80 bg-white/65 p-5"><span className="text-3xl font-black text-primary/25">01</span><h4 className="mt-4 font-bold text-slate-900">Leia antes</h4><p className="mt-2 text-sm leading-relaxed text-slate-500">Chegue ao encontro sabendo qual é o cenário e o objetivo da etapa.</p></div><div className="rounded-2xl border border-white/80 bg-white/65 p-5"><span className="text-3xl font-black text-primary/25">02</span><h4 className="mt-4 font-bold text-slate-900">Contribua</h4><p className="mt-2 text-sm leading-relaxed text-slate-500">Registre ideias, fontes e decisões para o grupo pensar junto.</p></div><div className="rounded-2xl border border-white/80 bg-white/65 p-5"><span className="text-3xl font-black text-primary/25">03</span><h4 className="mt-4 font-bold text-slate-900">Feche o ciclo</h4><p className="mt-2 text-sm leading-relaxed text-slate-500">Revise evidências, avalie o processo e transforme a sessão em memória.</p></div></div></div></div></section>

      <section className="px-6 pb-28"><div className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full bg-white/55 px-4 py-1.5 text-sm font-semibold text-slate-600"><CircleHelp className="h-4 w-4 text-primary" /> Ainda ficou alguma dúvida?</span><h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">A documentação completa está a um clique</h2><p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">Consulte instruções detalhadas de cada ferramenta, papéis, avaliações e configurações da plataforma.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={() => navigate("/docs")} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5"><BookOpen className="h-4 w-4" /> Abrir documentação</button><button onClick={() => navigate("/")} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/80 bg-white/50 px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-white/80"><ArrowLeft className="h-4 w-4" /> Voltar para a home</button></div></div></section>
    </main><Footer /><AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
  </div>;
}
