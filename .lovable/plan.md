## Implementação: Rubrica Inteligente com Justificativa em Linguagem Natural

Botão ✨ por critério no `EvaluationPanel` que pede à IA uma **nota sugerida + justificativa com evidências** baseadas nos dados reais da sessão. Tutor revisa, edita e aceita — IA nunca aplica sozinha.

### Fluxo
```text
Tutor clica ✨ no critério X do aluno Y
   ↓
Edge fn `suggest-evaluation` agrega:
   - Critério (label, fase, sala)
   - Aluno (nome) + dados da sessão atual
   - chat_messages do aluno na sessão
   - session_references / session_objective_references anexadas por ele
   - presentation_comments do aluno
   - objective_sessions confirmados
   - peer_evaluations recebidas (média atual)
   ↓
IA (Lovable AI Gateway, google/gemini-3-flash-preview, tool calling)
retorna { grade: O|I|PS|S|MS, rationale: string, evidences: [{type, snippet, timestamp?}] }
   ↓
Dialog exibe nota sugerida + justificativa + evidências citáveis
Tutor: [Aceitar] (aplica grade) | [Aceitar e editar nota] | [Descartar]
```

### Edge Function (nova): `supabase/functions/suggest-evaluation/index.ts`
- Valida JWT em código (segue padrão das outras).
- Input: `{ room_id, session_id?, student_id, criterion_id }`.
- Valida que `auth.uid()` é o professor da sala (`rooms.professor_id`).
- Agrega dados via service role; chama Lovable AI com tool `suggest_evaluation`.
- Loga em `ai_usage_log` com `prompt_type='suggest_evaluation'`.
- Trata 429/402 com mensagens amigáveis.
- Registra a sugestão em nova tabela `evaluation_suggestions` para auditoria.

### Nova tabela: `evaluation_suggestions` (auditoria)
Campos de domínio: `room_id`, `session_id`, `student_id`, `criterion_id`, `professor_id`, `suggested_grade`, `rationale`, `evidences` (jsonb), `accepted` (bool, default false), `applied_grade`.

RLS: apenas o professor da sala lê/insere/atualiza; superadmin gerencia.

### UI: `src/components/EvaluationDialog.tsx` (novo)
- Disparado por botão ✨ ao lado dos botões de nota no `EvaluationPanel`.
- Estado: loading → resultado.
- Mostra: nota sugerida (badge grande), justificativa (markdown leve), lista de evidências com tipo (Chat, Referência, Comentário, Objetivo, Pares).
- Botões: **Aceitar sugestão** (aplica `setGrade` no critério), **Descartar**.
- Ambas as ações atualizam `evaluation_suggestions.accepted/applied_grade`.

### Integração em `EvaluationPanel.tsx`
- Importa `EvaluationDialog`.
- Adiciona estado `suggestOpen: {criterionId, studentId} | null`.
- Botão Sparkles ao lado dos botões de nota (apenas no modo aluno selecionado).
- Após aceitar, refaz `setGrade()` existente.

### Documentação
- Adicionar seção em `src/pages/Documentation.tsx`: "Rubrica Inteligente" — como usar, quais evidências são consideradas, lembrete de que IA é assistiva.

### Memória
- Salvar `mem://funcionalidades/rubrica-inteligente-ia` e referenciar em `mem://index.md`.

### Arquivos
- **Migration**: tabela `evaluation_suggestions` + RLS + GRANTs.
- **Novos**: `supabase/functions/suggest-evaluation/index.ts`, `src/components/EvaluationDialog.tsx`.
- **Edits**: `supabase/config.toml`, `src/components/EvaluationPanel.tsx`, `src/pages/Documentation.tsx`.
- **Memória**: 1 arquivo novo + `mem://index.md`.

### Notas técnicas
- Tool calling com schema enxuto (`grade` enum + `rationale` string + `evidences` array curto) para evitar limite de estados do Gemini.
- Truncar histórico do chat a ~80 mensagens mais recentes da sessão para caber no contexto.
- `evidences[].timestamp` é opcional; se vier, formatamos como hora local no Dialog.