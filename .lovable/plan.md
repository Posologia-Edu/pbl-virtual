## Plan: Motor de Cenários Adaptativos por Desempenho

Um novo módulo no Painel Admin/Professor que analisa o desempenho recente (avaliações por critério, objetivos de aprendizagem cobertos, frequência) e usa IA para gerar **variações de cenários PBL ou sub-cenários** focados nas lacunas detectadas, reaproveitando a infraestrutura de geração já existente (`generate-scenario`, `ai_provider_keys`, fallback Lovable AI).

## Como funciona (fluxo)

```text
Professor seleciona Grupo (ou Aluno)
        │
        ▼
analyze-performance edge fn ──► lê: evaluations, peer_evaluations,
        │                              objective_sessions, learning_objectives,
        │                              session_minutes (cenários já cursados)
        ▼
Calcula: critérios fracos (média < S=75),
         objetivos não confirmados, conceitos pouco citados
        │
        ▼
generate-adaptive-scenario edge fn ──► IA recebe:
        │                                - cenário base (opcional)
        │                                - lacunas + objetivos pendentes
        │                                - histórico (evita repetição)
        ▼
Retorna: variação OU sub-cenário (mais curto, foco específico)
        │
        ▼
Salvo em `scenarios` com flag adaptive + origem,
e opcionalmente liberado direto numa sala existente.
```

## Mudanças no Banco

Nova tabela `adaptive_scenarios` (vínculo entre cenário gerado e contexto de origem) — evita poluir a tabela `scenarios` existente:

- `id`, `scenario_id` (FK lógica → scenarios.id)
- `source_type` (`variation` | `subscenario`)
- `target_type` (`group` | `student`), `target_id`
- `base_scenario_id` (cenário do qual derivou, nullable)
- `gaps_payload` jsonb (critérios fracos + objetivos pendentes usados no prompt)
- `created_by`, `created_at`

Adicionar coluna `is_adaptive boolean default false` em `scenarios` para badge na UI.

RLS: professor vê os adaptativos dos seus grupos; institution_admin vê os da sua instituição; superadmin tudo.

## Edge Functions (novas)

1. **`analyze-performance`** (verify_jwt=false, valida JWT em código)
   - Input: `{ group_id?, student_id?, scenario_id? }`
   - Agrega notas por critério (escala O/I/PS/S/MS → 0–100), objetivos de `learning_objectives` confirmados vs pendentes em `objective_sessions`, e termos do glossário pouco abordados nas atas (`session_minutes`).
   - Output: `{ weakCriteria[], pendingObjectives[], coveredScenarios[], summary }`.

2. **`generate-adaptive-scenario`** (verify_jwt=false)
   - Reutiliza `callAIWithFallback` do `generate-scenario` (copiar helper).
   - Prompt system: "Você é um designer de casos PBL. Gere um {variation|subscenario} focado nas lacunas a seguir, evitando repetir cenários já cursados. Para sub-cenário: máx 2 parágrafos + 1 pergunta-chave. Para variação: caso completo com novo contexto clínico/situacional mas mesmos objetivos de aprendizagem-alvo."
   - Tool calling para retornar JSON estruturado: `{ title, content, tutor_questions[], tutor_glossary[], targeted_objectives[], targeted_criteria[] }`.
   - Insere em `scenarios` (course_id/module_id herdado do base ou do grupo) e `adaptive_scenarios`.
   - Loga em `ai_usage_log` com `prompt_type='adaptive_scenario'`.

## UI

Nova aba **"Cenários Adaptativos"** dentro do `AdminPanel.tsx` (e atalho dentro de `ScenariosTab` botão "Gerar adaptativo"):

- Seletor: Grupo ou Aluno (filtrado por instituição/curso atuais).
- Card "Diagnóstico de desempenho" mostrando critérios fracos, objetivos pendentes, cenários já vistos (vem de `analyze-performance`).
- Toggle: **Variação completa** vs **Sub-cenário focado**.
- Seletor opcional "Cenário base" (lista de `scenarios` do curso).
- Botão **"Gerar com IA"** → chama `generate-adaptive-scenario`.
- Preview do resultado com botões: *Salvar*, *Salvar e liberar para sala…* (reutiliza fluxo de release já existente em `ScenariosTab`).
- Lista histórica de adaptativos gerados (badge "Adaptativo" + tooltip com lacunas-alvo).

No `ScenariosTab`: badge visual `Sparkles` "Adaptativo" para `is_adaptive=true`.

## Documentação

Adicionar seção em `src/pages/Documentation.tsx` explicando o motor, escala de notas usada, como interpretar o diagnóstico e diferença entre variação x sub-cenário.

## Memória do projeto

Salvar `mem://funcionalidades/motor-cenarios-adaptativos` descrevendo o fluxo e a regra: sub-cenário ≤ 2 parágrafos com 1 pergunta-chave; variação reutiliza objetivos mas troca contexto.

## Detalhes técnicos

- Reuso máximo: helper `callAIWithFallback` extraído (ou duplicado) de `generate-scenario`.
- Conversão de notas: O=0, I=25, PS=50, S=75, MS=100 (já no Core memory). Critério "fraco" = média < 75 com ≥3 observações.
- Anti-repetição: passar títulos de `coveredScenarios` no prompt + comparação normalizada (sem acentos/lowercase) antes de salvar.
- Permissões: edge functions validam que `auth.uid()` é professor do grupo OU admin da instituição OU superadmin antes de gerar.
- Custos: respeita 402/429 com toasts amigáveis.
- Sem mudança no fluxo PBL existente — cenário adaptativo entra como qualquer outro `scenarios.id` no `room_scenarios`.

## Arquivos previstos

- `supabase/migrations/<novo>.sql` — tabela `adaptive_scenarios`, coluna `is_adaptive`, RLS.
- `supabase/functions/analyze-performance/index.ts`
- `supabase/functions/generate-adaptive-scenario/index.ts`
- `supabase/config.toml` — registro das 2 funções.
- `src/components/admin/AdaptiveScenariosTab.tsx` (novo).
- `src/pages/AdminPanel.tsx` — nova aba.
- `src/components/admin/ScenariosTab.tsx` — badge "Adaptativo" + atalho.
- `src/pages/Documentation.tsx` — seção explicativa.
- `mem://funcionalidades/motor-cenarios-adaptativos` + atualização do `mem://index.md`.
