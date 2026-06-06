## Roadmap: 6 Funcionalidades Inovadoras para Professores/Tutores

Foco: **diferenciação no mercado** + **inovação com IA**, complementando o que já existe (Co-tutor, Análise Preditiva, Cenários Adaptativos, Painel de Apoio ao Tutor, Ata IA).

---

### 1. 🎙️ Transcrição e Análise de Áudio em Tempo Real ("Tutor Ears")
**O quê:** Captura o áudio da sessão presencial/online, transcreve em tempo real (Whisper) e analisa quem fala, por quanto tempo, e padrões de interação.

**Por que é inovador:** Hoje a ata e a avaliação dependem do que aparece no chat/whiteboard. Em sessões presenciais, o tutor perde o registro do que foi falado oralmente. Ninguém no mercado EdTech PBL faz isso.

**Como conecta:**
- Alimenta automaticamente a Ata da Sessão (P7) com transcrição limpa.
- Gera "Mapa de Participação Oral" por aluno (tempo de fala, número de intervenções) → entra como critério na **Avaliação por Pares** e **Critérios de Avaliação**.
- Detecta termos do glossário do cenário citados oralmente → reforça cobertura de objetivos.

**Stack:** Edge function `transcribe-session` usando Lovable AI Gateway (Whisper), gravação opcional iniciada pelo Coordenador, armazenamento privado no bucket `references`.

---

### 2. 🧠 Mapa Conceitual Colaborativo Automático
**O quê:** Durante o P3 (hipóteses) e P4 (objetivos), uma IA analisa o chat + whiteboard + termos citados e gera automaticamente um **mapa conceitual visual** (nós e relações) que evolui em tempo real.

**Por que é inovador:** Mapas conceituais são pilar pedagógico do PBL, mas hoje são manuais. Tornar isso automático e dinâmico é único.

**Como conecta:**
- Novo painel ao lado do Whiteboard; o Relator pode editar/reorganizar.
- Exportado junto da Ata em PDF.
- Diff entre mapa de abertura (P3) e fechamento (P7) → métrica de **evolução cognitiva do grupo** (vai para o Painel de Apoio ao Tutor).

**Stack:** Edge function `generate-concept-map` (Gemini com tool calling), renderização com `react-flow` (ou D3), salvo em nova tabela `session_concept_maps`.

---

### 3. 🎭 Simulador de Paciente Virtual Interativo
**O quê:** Para cenários clínicos, a IA assume o papel do paciente. Alunos conversam (chat ou voz) com o "paciente virtual" para coletar anamnese, e a IA responde em personagem, com sintomas/histórico coerentes.

**Por que é inovador:** Eleva o PBL de "ler um caso" para "viver o caso". Diferencial gigante para área da saúde — concorre diretamente com simuladores caros (Body Interact, etc.) a fração do preço.

**Como conecta:**
- Aba opcional dentro da sessão tutorial ("Entrevistar Paciente").
- Cada interação loga em `ai_usage_log` e conta para limites mensais.
- Histórico da entrevista é citável como referência no P7 e alimenta a Ata.
- Professor define no cenário o "dossiê oculto" do paciente (campo novo em `scenarios`).

**Stack:** Edge function `patient-simulator` com prompt persistente baseado no dossiê. Opção de voz via Web Speech API.

---

### 4. 🔬 Banco de Casos da Comunidade (Marketplace de Cenários)
**O quê:** Tutores podem **publicar cenários** (anonimizados) para uma biblioteca compartilhada entre instituições assinantes. Outros tutores avaliam (estrelas), comentam e clonam para seu curso.

**Por que é inovador:** Cria efeito de rede — quanto mais instituições usam, mais valioso o produto fica. Reduz tempo de criação de cenários (hoje a maior dor de tutor novo).

**Como conecta:**
- Nova flag `is_public` + `published_at` em `scenarios`.
- Tabela `scenario_reviews` (rating, comentário, autor).
- Filtros por especialidade, módulo, dificuldade.
- Tutor que clona vira "fork" — créditos ao autor original visíveis.
- Superadmin pode destacar cenários de referência.

**Stack:** Nova aba "Comunidade" em `ScenariosTab`. Moderação básica via flag de denúncia + revisão do superadmin.

---

### 5. 📋 Rubrica Inteligente com Justificativa em Linguagem Natural
**O quê:** Ao avaliar um aluno por critérios, o tutor pode pedir à IA uma **sugestão de nota + justificativa** baseada nas evidências reais da sessão (chat do aluno, referências anexadas, contribuições no whiteboard, transcrição).

**Por que é inovador:** Resolve a dor #1 do tutor: **avaliação subjetiva e demorada**. A IA não decide — apenas sugere com evidências citáveis. Tutor mantém controle.

**Como conecta:**
- Botão "✨ Sugerir avaliação" em cada critério do `EvaluationPanel`.
- IA retorna `{nota_sugerida, justificativa, evidências[]}` com timestamps clicáveis.
- Tutor aceita/edita. Toda alteração fica auditável.
- Acelera a avaliação de 30min → 5min por sessão.

**Stack:** Edge function `suggest-evaluation` (Gemini + tool calling). Reusa dados já agregados pelo `tutor-insights`.

---

### 6. 📅 Atalho de Reagendamento e Reposição Inteligente
**O quê:** Quando um aluno tem ausência justificada ou cenário precisa ser reagendado, a IA sugere automaticamente:
- Próximas datas livres compatíveis com o Planejamento Semestral.
- Cenários equivalentes que cobrem os mesmos objetivos não cumpridos.
- Grupo alternativo (de outro horário do mesmo módulo) onde o aluno pode fazer reposição.

**Por que é inovador:** Gestão de reposição em curso de medicina/saúde é caos. Automatizar é diferencial enorme para coordenação.

**Como conecta:**
- Botão "Sugerir reposição" no `AttendancePanel` e em qualquer ausência.
- Reusa `semester_sessions` e `learning_objectives`.
- Gera notificação por e-mail (Resend) para aluno + tutor receptor com confirmação.

**Stack:** Edge function `suggest-makeup` (regras + IA). Nova tabela `makeup_requests` (status, origem, destino).

---

## Resumo executivo

| # | Funcionalidade | Esforço | Impacto | Diferencial |
|---|----|----|----|----|
| 1 | Transcrição de áudio | Alto | Alto | 🔥🔥🔥 |
| 2 | Mapa conceitual auto | Médio | Alto | 🔥🔥🔥 |
| 3 | Paciente virtual IA | Alto | Muito alto | 🔥🔥🔥🔥 |
| 4 | Marketplace cenários | Médio | Alto (rede) | 🔥🔥 |
| 5 | Rubrica inteligente | Baixo | Muito alto | 🔥🔥🔥 |
| 6 | Reposição inteligente | Médio | Médio-alto | 🔥🔥 |

**Sugestão de ordem:** começar pela **#5 (Rubrica Inteligente)** — menor esforço, dor imediata, demonstra ROI rápido. Depois **#3 (Paciente Virtual)** como grande diferencial de marketing e venda.

Me diga quais quer implementar (uma, várias, ou todas em sequência) e eu executo.