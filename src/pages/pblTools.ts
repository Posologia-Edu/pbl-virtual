import { BrainCircuit, CircleHelp, FileSearch, MessageSquare, PenLine, Timer, type LucideIcon } from "lucide-react";
import type { ScreenKey } from "./PBLGuide";

export type PBLToolSlug = "chat" | "whiteboard" | "mapa-conceitual" | "referencias" | "timer" | "ai-co-tutor";
export type ToolTone = "blue" | "orange" | "green";

export type PBLTool = {
  slug: PBLToolSlug;
  title: string;
  summary: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  tone: ToolTone;
  screen: ScreenKey;
  access: string;
  studentSteps: Array<{ title: string; text: string }>;
  professorSteps: Array<{ title: string; text: string }>;
  bestPractices: string[];
  related: PBLToolSlug[];
};

export const pblTools: PBLTool[] = [
  {
    slug: "chat",
    title: "Chat em tempo real",
    summary: "Converse com o grupo, marque colegas e mantenha o histórico das decisões da sessão.",
    eyebrow: "Conversa em tempo real",
    description: "O chat é o espaço para transformar a fala do grupo em um registro consultável. Use-o para levantar hipóteses, fazer perguntas, combinar tarefas e recuperar o caminho que levou à síntese.",
    icon: MessageSquare,
    tone: "blue",
    screen: "room-flow",
    access: "Todos os participantes da sala podem ler e enviar mensagens. O professor acompanha o histórico e o registro permanece associado à sessão.",
    studentSteps: [
      { title: "Abra a aba Chat", text: "Dentro da sala PBL, localize o Chat na barra lateral. O indicador mostra quando há novas mensagens." },
      { title: "Escreva uma contribuição completa", text: "Registre a hipótese, dúvida ou decisão e, quando possível, explique qual dado do caso motivou sua mensagem." },
      { title: "Use o chat para combinar o trabalho", text: "Durante o P5 e P6, combine objetivos, responsáveis e referências sem perder o histórico da discussão." },
      { title: "Recupere o contexto", text: "Antes de perguntar novamente, percorra as mensagens do passo atual. O histórico ajuda a evitar decisões repetidas." },
    ],
    professorSteps: [
      { title: "Observe a qualidade da conversa", text: "Acompanhe se o grupo está justificando as hipóteses ou apenas listando respostas sem relação com o caso." },
      { title: "Faça perguntas que avancem o raciocínio", text: "Intervenha com perguntas sobre evidências, comparação e consequências em vez de entregar a resposta." },
      { title: "Use o histórico no feedback", text: "Retome uma mudança de hipótese ou uma boa pergunta durante o P7 para mostrar o percurso de aprendizagem." },
    ],
    bestPractices: ["Escreva uma ideia por mensagem.", "Mencione o dado do cenário que sustenta sua contribuição.", "Use @nome somente quando precisar chamar alguém.", "Evite transformar o chat em conversa paralela durante a síntese."],
    related: ["whiteboard", "mapa-conceitual", "referencias"],
  },
  {
    slug: "whiteboard",
    title: "Whiteboard colaborativo",
    summary: "Registre termos, hipóteses e sínteses. O Relator organiza o quadro e o grupo revisa.",
    eyebrow: "Pensamento visível",
    description: "O Whiteboard é o quadro coletivo da sala. Ele separa visualmente os registros por etapa para que o grupo consiga enxergar o que já foi compreendido, o que ainda é hipótese e o que precisa de evidência.",
    icon: PenLine,
    tone: "orange",
    screen: "collaboration",
    access: "O Relator edita o quadro durante a sessão. Os demais participantes acompanham em tempo real e contribuem pelo chat e pela discussão do grupo.",
    studentSteps: [
      { title: "Entenda o que pertence a cada passo", text: "P1 concentra termos, P2 a definição do problema, P3 e P4 hipóteses e conexões, e P7 a síntese revisada." },
      { title: "Envie contribuições ao Relator", text: "Use o chat para sugerir textos, agrupamentos ou correções. O Relator decide como organizar o quadro." },
      { title: "Revise antes de avançar", text: "Confira se o registro representa o consenso do grupo e avise quando uma hipótese estiver repetida ou desconectada." },
    ],
    professorSteps: [
      { title: "Defina o papel do Relator", text: "Escolha alguém que consiga ouvir, sintetizar e manter o quadro legível sem deixar de participar do raciocínio." },
      { title: "Observe a evolução do quadro", text: "O conteúdo deve sair de termos soltos para relações, categorias, objetivos e evidências." },
      { title: "Use o quadro no fechamento", text: "A retomada visual ajuda a mostrar como as hipóteses viraram objetivos e como foram respondidas." },
    ],
    bestPractices: ["Use títulos curtos e legíveis.", "Agrupe ideias semelhantes antes de criar novas categorias.", "Não apague uma hipótese sem discutir com o grupo.", "Revise o quadro no P4 e antes do P7."],
    related: ["chat", "mapa-conceitual", "timer"],
  },
  {
    slug: "mapa-conceitual",
    title: "Mapa conceitual",
    summary: "Conecte causas, mecanismos, sinais, hipóteses e objetivos de maneira visual.",
    eyebrow: "Conexões do caso",
    description: "O Mapa Conceitual ajuda o grupo a sair de uma lista de ideias e construir relações. Use nós para representar conceitos e conexões para explicitar como eles se relacionam.",
    icon: BrainCircuit,
    tone: "green",
    screen: "collaboration",
    access: "O mapa fica disponível na sala e é editado pelo Relator. O professor pode acompanhar a evolução e usar o mapa para fazer perguntas de aprofundamento.",
    studentSteps: [
      { title: "Comece pelo problema central", text: "Coloque no centro a definição consensuada do P2. Ela será a referência para organizar as hipóteses." },
      { title: "Crie conexões com verbos", text: "Prefira relações que expliquem o vínculo: causa, favorece, exclui, sugere, exige ou depende de." },
      { title: "Separe hipótese de evidência", text: "Deixe claro o que foi levantado pelo grupo e o que foi confirmado por uma referência no P6." },
      { title: "Retome no P7", text: "Use o mapa para escolher quais conexões merecem aparecer na apresentação final." },
    ],
    professorSteps: [
      { title: "Faça o mapa funcionar como hipótese", text: "Não procure um desenho perfeito na abertura. O valor está em tornar o raciocínio revisável." },
      { title: "Pergunte pelas conexões ausentes", text: "Quando dois conceitos aparecem próximos, peça ao grupo para explicar o que os conecta." },
      { title: "Compare antes e depois", text: "No fechamento, observe o que mudou depois do estudo individual e das referências." },
    ],
    bestPractices: ["Evite textos longos dentro dos nós.", "Use uma cor ou agrupamento por tipo de conceito.", "Nomeie as setas com relações claras.", "Não confunda mapa conceitual com resumo final."],
    related: ["whiteboard", "chat", "referencias"],
  },
  {
    slug: "referencias",
    title: "Referências e busca científica",
    summary: "Pesquise artigos e anexe DOI, link ou PDF ao objetivo correspondente.",
    eyebrow: "Evidência para aprender",
    description: "A área de Referências organiza as fontes que o grupo encontrou durante o estudo. Ao vincular cada fonte a um objetivo, o sistema deixa claro qual evidência sustenta cada parte da síntese.",
    icon: FileSearch,
    tone: "blue",
    screen: "research",
    access: "Alunos e professores podem consultar as referências da sala. O envio e a vinculação dependem do passo liberado e das permissões do grupo.",
    studentSteps: [
      { title: "Escolha um objetivo", text: "Comece pelo objetivo que ficou sob sua responsabilidade ou que o grupo ainda não conseguiu responder." },
      { title: "Pesquise por palavra, artigo ou DOI", text: "Use a busca científica quando precisar encontrar fontes sem sair da sala. Confira autoria e data." },
      { title: "Cadastre a referência", text: "Informe título, autor e link, DOI ou arquivo PDF. Uma fonte sem contexto é difícil de retomar." },
      { title: "Explique a contribuição", text: "Escreva uma nota curta dizendo qual parte do objetivo a referência ajuda a responder." },
    ],
    professorSteps: [
      { title: "Confira a qualidade das fontes", text: "No P7, observe se as conclusões estão apoiadas por referências pertinentes e não apenas por links soltos." },
      { title: "Use as lacunas como feedback", text: "Objetivos sem referência mostram onde o grupo precisa aprofundar ou reorganizar a busca." },
      { title: "Leve as fontes para o relatório", text: "As referências vinculadas ajudam a documentar a base teórica da síntese apresentada." },
    ],
    bestPractices: ["Prefira fonte primária, diretriz ou revisão confiável.", "Anote a data de acesso quando fizer sentido.", "Vincule a fonte a um objetivo específico.", "Não confunda quantidade de referências com qualidade da investigação."],
    related: ["mapa-conceitual", "chat", "ai-co-tutor"],
  },
  {
    slug: "timer",
    title: "Timer da sessão",
    summary: "O tempo de abertura, fechamento e fala ajuda a turma a distribuir o encontro.",
    eyebrow: "Ritmo da sessão",
    description: "O Timer torna o tempo um elemento visível da mediação. Ele ajuda a turma a saber quanto falta para concluir o bloco atual, sem substituir a decisão pedagógica do professor.",
    icon: Timer,
    tone: "orange",
    screen: "control",
    access: "O professor controla os timers principais. O Coordenador pode acompanhar o relógio e, quando autorizado, controlar o tempo de fala dos participantes.",
    studentSteps: [
      { title: "Confira o bloco atual", text: "Veja se a turma está na abertura ou no fechamento e qual é o tempo restante." },
      { title: "Distribua o tempo do grupo", text: "Combine uma ordem para ler, discutir e registrar. Não deixe objetivos ou referências para os últimos minutos." },
      { title: "Respeite o tempo de fala", text: "Se o Coordenador estiver usando o cronômetro individual, seja objetivo e dê espaço para os colegas." },
    ],
    professorSteps: [
      { title: "Inicie e pause o timer", text: "Use o painel de Timer para controlar abertura, fechamento e alertas próximos do fim." },
      { title: "Combine o ritmo com a etapa", text: "P1 e P2 precisam de compreensão; P3 e P4 precisam de espaço para comparar hipóteses; P7 precisa de síntese." },
      { title: "Leia o tempo como indicador", text: "Se o grupo sempre termina sem objetivos claros, ajuste a mediação e o planejamento da sessão seguinte." },
    ],
    bestPractices: ["Avise quando faltarem dez e cinco minutos.", "Não acelere a discussão só para cumprir o relógio.", "Use o tempo de fala para distribuir participação.", "Finalize a etapa antes de abrir a próxima."],
    related: ["chat", "whiteboard", "ai-co-tutor"],
  },
  {
    slug: "ai-co-tutor",
    title: "AI Co-tutor e apoio",
    summary: "Use perguntas-guia e apoio contextual quando o professor liberar o recurso para a sala.",
    eyebrow: "Apoio à mediação",
    description: "O AI Co-tutor oferece perguntas, resumos e pistas para apoiar a investigação. Ele não substitui o professor nem decide pelo grupo: serve para destravar o raciocínio e indicar caminhos de aprofundamento.",
    icon: CircleHelp,
    tone: "green",
    screen: "monitor",
    access: "O recurso aparece quando estiver habilitado para a sala. O professor define o momento de uso e continua responsável pela mediação e validação das respostas.",
    studentSteps: [
      { title: "Descreva a dúvida", text: "Informe qual parte do caso, hipótese ou objetivo você está tentando compreender. Quanto mais contexto, melhor a pista." },
      { title: "Peça uma pergunta, não apenas uma resposta", text: "Use o co-tutor para receber uma provocação, comparação ou caminho de busca que ajude o grupo a pensar." },
      { title: "Valide com a equipe", text: "Toda sugestão precisa ser discutida pelo grupo e conferida com referências antes de entrar na síntese." },
    ],
    professorSteps: [
      { title: "Libere o recurso no momento adequado", text: "O apoio é mais útil quando o grupo já explicitou o que sabe e o que ainda não consegue explicar." },
      { title: "Leia as perguntas geradas", text: "Use-as para perceber lacunas conceituais e escolher a intervenção que fará mais sentido para a turma." },
      { title: "Reforce o pensamento crítico", text: "Lembre os alunos de que uma resposta gerada é uma pista para investigar, não uma fonte definitiva." },
    ],
    bestPractices: ["Dê contexto antes de pedir ajuda.", "Peça pistas e perguntas orientadoras.", "Confirme informações em referências confiáveis.", "Registre no chat como a sugestão foi aceita, ajustada ou rejeitada."],
    related: ["referencias", "chat", "timer"],
  },
];

export function getPBLTool(slug?: string) {
  return pblTools.find((tool) => tool.slug === slug);
}
