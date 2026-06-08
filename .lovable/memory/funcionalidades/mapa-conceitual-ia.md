---
name: Mapa Conceitual Colaborativo Automático
description: IA gera mapas conceituais (nós + relações) por fase (abertura/fechamento) e calcula diff de evolução cognitiva entre eles.
type: feature
---

Edge function `generate-concept-map` chama Gemini (Lovable AI Gateway) com tool call `return_concept_map` retornando `{title, nodes[], edges[]}`. Tipos de nó: problem, hypothesis, concept, objective, term.

Tabela `session_concept_maps` (chave única `session_id+phase`). Apenas o **professor da sala** ou o **relator** podem gerar/atualizar; demais membros do grupo apenas leem. Realtime via canal Supabase por `session_id`.

UI em `src/components/ConceptMapPanel.tsx` usa `@xyflow/react`. Nós são arrastáveis (tutor/relator); botão "Salvar layout" persiste `nodes.x/y` com `is_manual_edit=true`. Botão de diff compara abertura × fechamento: contagem de conceitos, novos e removidos.

Disparado no `PBLSession.tsx` pela aba "Mapa Conceitual" (`rightPanel === "concept-map"`); fase escolhida pelo `activeStep` (>=7 → closing).
