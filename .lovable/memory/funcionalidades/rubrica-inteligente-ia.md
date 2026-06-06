---
name: Rubrica Inteligente com IA
description: Botão Sparkles no EvaluationPanel pede ao edge fn suggest-evaluation uma sugestão de nota + justificativa + evidências baseadas em chat, referências, comentários e peer evaluations do aluno.
type: feature
---
Funcionalidade assistiva: a IA NUNCA aplica nota sozinha. Tutor revisa no `EvaluationDialog` e aceita/descarta.

- Edge function: `suggest-evaluation` (verify_jwt=false; valida JWT em código; só o professor da sala pode chamar).
- Modelo: `google/gemini-3-flash-preview` via Lovable AI Gateway, com tool calling estruturado (`suggest_evaluation`).
- Schema retornado: `{ grade: O|I|PS|S|MS, rationale, evidences[] }` (evidences máx 6, tipos: chat/reference/comment/objective/peer).
- Tabela `evaluation_suggestions` registra cada sugestão (auditoria) + flag `accepted` + `applied_grade`.
- Limite de contexto: 60 últimas mensagens de chat + 30 comentários + 30 referências do aluno.
- Loga em `ai_usage_log` com `prompt_type='suggest_evaluation'`.
- Trata 429 (rate limit) e 402 (créditos) com toasts amigáveis.
