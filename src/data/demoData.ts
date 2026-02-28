// Demo room constants - all data is mocked in the frontend
export const DEMO_ROOM_ID = "demo";

export const DEMO_STUDENTS = [
  { student_id: "demo-student-1", full_name: "Ana Clara Santos" },
  { student_id: "demo-student-2", full_name: "Pedro Henrique Lima" },
  { student_id: "demo-student-3", full_name: "Maria Eduarda Silva" },
  { student_id: "demo-student-4", full_name: "Lucas Gabriel Oliveira" },
  { student_id: "demo-student-5", full_name: "Juliana Costa Pereira" },
];

export const DEMO_ROOM = {
  id: DEMO_ROOM_ID,
  name: "Sala de Demonstração",
  group_id: "demo-group",
  professor_id: "demo-professor",
  status: "active",
  scenario: null,
  is_scenario_released: true,
  is_scenario_visible_to_professor: true,
  coordinator_id: "demo-student-1",
  reporter_id: "demo-student-3",
  current_step: 0,
  timer_running: false,
  timer_end_at: null,
  tutor_glossary: null,
  tutor_questions: null,
};

export const DEMO_SCENARIO_CONTENT =
  "Maria, 45 anos, professora, procurou a Unidade Básica de Saúde com queixa de cansaço progressivo há 3 meses, associado a falta de ar aos esforços moderados. Refere que passou a sentir palpitações ocasionais e tontura ao se levantar rapidamente. Nega febre, perda de peso ou sudorese noturna. Tem história de menstruação abundante nos últimos 2 anos. Ao exame físico: palidez cutaneomucosa ++/4+, FC 92 bpm, PA 110x70 mmHg, murmúrio vesicular fisiológico, abdome sem alterações. Hemograma: Hb 8,2 g/dL, Ht 25%, VCM 68 fL, HCM 22 pg, leucócitos 6.500/mm³, plaquetas 380.000/mm³.";

export const DEMO_TUTOR_GLOSSARY = [
  { term: "VCM (Volume Corpuscular Médio)", definition: "Volume médio das hemácias. Valores baixos (<80 fL) indicam microcitose, comum na anemia ferropriva." },
  { term: "HCM (Hemoglobina Corpuscular Média)", definition: "Quantidade média de hemoglobina por hemácia. Valores baixos indicam hipocromia." },
  { term: "Palidez cutaneomucosa", definition: "Redução da coloração da pele e mucosas, sinal clínico de anemia." },
];

export const DEMO_TUTOR_QUESTIONS = [
  "Quais são as possíveis causas de anemia microcítica hipocrômica?",
  "Qual a relação entre a menorragia e o quadro clínico da paciente?",
  "Quais exames complementares seriam importantes para confirmar o diagnóstico?",
  "Como abordar o tratamento desta paciente considerando a causa provável?",
  "Qual a importância da investigação da causa base da anemia?",
];

export const DEMO_ROOM_SCENARIO = {
  id: "demo-scenario",
  room_id: DEMO_ROOM_ID,
  scenario_content: DEMO_SCENARIO_CONTENT,
  label: "P1",
  is_active: true,
  sort_order: 0,
  tutor_glossary: DEMO_TUTOR_GLOSSARY,
  tutor_questions: DEMO_TUTOR_QUESTIONS,
  scenario_id: null,
};

export const DEMO_SESSION = {
  id: "demo-session",
  room_id: DEMO_ROOM_ID,
  room_scenario_id: "demo-scenario",
  label: "P1",
  current_step: 0,
  status: "active",
  started_at: new Date().toISOString(),
  ended_at: null,
  coordinator_id: "demo-student-1",
  reporter_id: "demo-student-3",
  timer_running: false,
  timer_end_at: null,
};

export const DEMO_CHAT_MESSAGES = [
  { id: "demo-chat-1", user_id: "demo-student-1", content: "Pessoal, vamos começar analisando os dados do hemograma. A hemoglobina está bem baixa!", profiles: { full_name: "Ana Clara Santos" }, created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "demo-chat-2", user_id: "demo-student-2", content: "Sim, e o VCM e HCM baixos indicam que é uma anemia microcítica hipocrômica.", profiles: { full_name: "Pedro Henrique Lima" }, created_at: new Date(Date.now() - 28 * 60000).toISOString() },
  { id: "demo-chat-3", user_id: "demo-student-3", content: "A história de menstruação abundante pode ser a causa da perda de ferro crônica.", profiles: { full_name: "Maria Eduarda Silva" }, created_at: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: "demo-chat-4", user_id: "demo-student-4", content: "Concordo. Precisamos pensar em investigar ferro sérico e ferritina para confirmar.", profiles: { full_name: "Lucas Gabriel Oliveira" }, created_at: new Date(Date.now() - 22 * 60000).toISOString() },
  { id: "demo-chat-5", user_id: "demo-student-5", content: "E não podemos esquecer de investigar a causa da menorragia também!", profiles: { full_name: "Juliana Costa Pereira" }, created_at: new Date(Date.now() - 20 * 60000).toISOString() },
];

export const DEMO_STEP_ITEMS: Record<number, Array<{ id: string; content: string; author_id: string; profiles: { full_name: string } }>> = {
  1: [
    { id: "demo-item-1", content: "VCM (Volume Corpuscular Médio)", author_id: "demo-student-1", profiles: { full_name: "Ana Clara Santos" } },
    { id: "demo-item-2", content: "HCM (Hemoglobina Corpuscular Média)", author_id: "demo-student-2", profiles: { full_name: "Pedro Henrique Lima" } },
    { id: "demo-item-3", content: "Palidez cutaneomucosa", author_id: "demo-student-3", profiles: { full_name: "Maria Eduarda Silva" } },
  ],
  2: [
    { id: "demo-item-4", content: "Paciente com anemia microcítica hipocrômica de causa provável ferropriva secundária a menorragia", author_id: "demo-student-1", profiles: { full_name: "Ana Clara Santos" } },
  ],
  3: [
    { id: "demo-item-5", content: "Deficiência de ferro por perda menstrual crônica", author_id: "demo-student-4", profiles: { full_name: "Lucas Gabriel Oliveira" } },
    { id: "demo-item-6", content: "Possível patologia uterina causando menorragia", author_id: "demo-student-5", profiles: { full_name: "Juliana Costa Pereira" } },
  ],
  5: [
    { id: "demo-item-7", content: "Compreender o metabolismo do ferro e sua relação com a eritropoese", author_id: "demo-student-2", profiles: { full_name: "Pedro Henrique Lima" } },
    { id: "demo-item-8", content: "Estudar diagnóstico diferencial das anemias microcíticas", author_id: "demo-student-3", profiles: { full_name: "Maria Eduarda Silva" } },
  ],
};

export const DEMO_EVALUATION_CRITERIA = [
  { id: "demo-crit-1", room_id: DEMO_ROOM_ID, phase: "opening", label: "Identificação de termos desconhecidos", sort_order: 1 },
  { id: "demo-crit-2", room_id: DEMO_ROOM_ID, phase: "opening", label: "Definição do problema central", sort_order: 2 },
  { id: "demo-crit-3", room_id: DEMO_ROOM_ID, phase: "opening", label: "Formulação de hipóteses", sort_order: 3 },
  { id: "demo-crit-4", room_id: DEMO_ROOM_ID, phase: "opening", label: "Participação ativa no brainstorming", sort_order: 4 },
  { id: "demo-crit-5", room_id: DEMO_ROOM_ID, phase: "opening", label: "Contribuição para objetivos de aprendizagem", sort_order: 5 },
  { id: "demo-crit-6", room_id: DEMO_ROOM_ID, phase: "closing", label: "Domínio do conteúdo estudado", sort_order: 1 },
  { id: "demo-crit-7", room_id: DEMO_ROOM_ID, phase: "closing", label: "Capacidade de síntese", sort_order: 2 },
  { id: "demo-crit-8", room_id: DEMO_ROOM_ID, phase: "closing", label: "Integração de conhecimentos", sort_order: 3 },
  { id: "demo-crit-9", room_id: DEMO_ROOM_ID, phase: "closing", label: "Comunicação e clareza", sort_order: 4 },
  { id: "demo-crit-10", room_id: DEMO_ROOM_ID, phase: "closing", label: "Pensamento crítico", sort_order: 5 },
];
