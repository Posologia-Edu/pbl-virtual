

# Plano: Implementar travas de funcionalidades por plano

## Analise da imagem vs. sistema atual

Analisei cada recurso listado na imagem para os 3 planos. Aqui esta o que JA esta implementado e o que FALTA implementar:

### Starter (R$49/mes)
| Recurso | Status | Detalhes |
|---------|--------|---------|
| Ate 30 alunos | OK | Trava implementada em UsersTab |
| 3 salas simultaneas | OK | Trava implementada em GroupsTab |
| AI Co-tutor basico (50 interacoes/mes) | FALTA | Nao ha limite de interacoes. O AI co-tutor funciona sem contagem |
| Chat e whiteboard | OK | Disponivel para todos |
| Cenarios pre-definidos | OK | Cenarios funcionam para todos |
| Suporte por email | N/A | Nao e uma funcionalidade tecnica |

### Professional (R$149/mes)
| Recurso | Status | Detalhes |
|---------|--------|---------|
| Ate 150 alunos | OK | Trava implementada |
| Salas ilimitadas | OK | max_rooms=999 no setup |
| AI Co-tutor avancado (500 interacoes/mes) | FALTA | Sem contagem de interacoes |
| Geracao de cenarios com IA | FALTA | generate-scenario nao verifica o plano. Starter nao deveria ter acesso |
| Relatorios completos | FALTA | Reports.tsx nao verifica o plano. Starter nao deveria ter acesso |
| Avaliacao por pares | FALTA | PeerEvaluationPanel nao verifica o plano. Starter nao deveria ter acesso |
| Badges e gamificacao | FALTA | BadgesPanel nao verifica o plano. Starter nao deveria ter acesso |
| Suporte prioritario | N/A | Nao e uma funcionalidade tecnica |

### Enterprise (R$399/mes)
| Recurso | Status | Detalhes |
|---------|--------|---------|
| Alunos ilimitados | OK | max_students=99999 |
| Salas ilimitadas | OK | max_rooms=99999 |
| AI Co-tutor ilimitado | FALTA | Sem contagem de interacoes |
| White-label completo | PARCIAL | whitelabel_enabled existe na subscription mas BrandingTab nao verifica |
| Branding personalizado | PARCIAL | BrandingContext aplica cores mas nao verifica se o plano permite |
| Analytics avancados | FALTA | Reports nao tem diferenciacao de funcionalidades basicas vs avancadas |
| Integracao SSO | N/A | Nao implementado no sistema |
| Gerente de conta dedicado | N/A | Nao e funcionalidade tecnica |
| SLA 99.9% | N/A | Nao e funcionalidade tecnica |

---

## O que sera implementado

### 1. Adicionar campos de controle de plano na subscription

Adicionar novos campos na tabela `subscriptions` via migracao:
- `max_ai_interactions` (integer) -- limite de interacoes AI por mes (50, 500, 99999)
- `ai_scenario_generation` (boolean) -- permissao para gerar cenarios com IA
- `peer_evaluation_enabled` (boolean) -- avaliacao por pares
- `badges_enabled` (boolean) -- badges e gamificacao
- `full_reports_enabled` (boolean) -- relatorios completos

Atualizar o TIERS no `setup-institution/index.ts`:

```text
starter:     max_ai_interactions: 50,  ai_scenario_generation: false, peer_evaluation_enabled: false, badges_enabled: false, full_reports_enabled: false
professional: max_ai_interactions: 500, ai_scenario_generation: true,  peer_evaluation_enabled: true,  badges_enabled: true,  full_reports_enabled: true
enterprise:  max_ai_interactions: 99999, ai_scenario_generation: true, peer_evaluation_enabled: true,  badges_enabled: true,  full_reports_enabled: true
```

### 2. Criar tabela de contagem de interacoes AI

Nova tabela `ai_interaction_counts` com:
- `institution_id`, `month_year` (ex: "2026-02"), `interaction_count`, `updated_at`
- Incrementada a cada chamada ao `ai-cotutor`

### 3. Travas no backend (Edge Functions)

**`ai-cotutor/index.ts`:**
- Buscar a subscription da instituicao do professor
- Verificar `max_ai_interactions` contra a contagem mensal
- Incrementar contador apos uso bem-sucedido
- Retornar erro 403 com mensagem clara se o limite foi atingido

**`generate-scenario/index.ts`:**
- Verificar `ai_scenario_generation` da subscription
- Bloquear acesso para planos que nao tem esse recurso (Starter)

### 4. Travas no frontend

**`check-subscription` (edge function):**
- Retornar os novos campos da subscription para o frontend

**`AuthContext.tsx`:**
- Armazenar os novos campos no estado global de subscription

**`PBLSession.tsx` -- Condicionar paineis por plano:**
- **Peer Evaluation**: Mostrar botao apenas se `peer_evaluation_enabled`
- **Badges**: Mostrar painel apenas se `badges_enabled`
- **AI Co-tutor**: Mostrar contagem restante de interacoes

**`Reports.tsx`:**
- Se `full_reports_enabled` for false, mostrar apenas estatisticas basicas
- Bloquear graficos de radar e comparativos com overlay de "upgrade"

**`SessionScenarioManager.tsx`:**
- Botao "Gerar com IA" visivel apenas se `ai_scenario_generation` habilitado

**`BrandingTab.tsx`:**
- Verificar `whitelabel_enabled` antes de permitir edicoes

### 5. UI de feedback ao usuario

- Quando um recurso esta bloqueado, mostrar um overlay/card com icone de cadeado, nome do recurso e botao "Fazer Upgrade" que redireciona para `/pricing`
- No painel de AI co-tutor, mostrar "X/50 interacoes usadas este mes" como badge

---

## Resumo das alteracoes

| Arquivo | Alteracao |
|---------|----------|
| Nova migracao SQL | Adicionar colunas na tabela `subscriptions` + criar tabela `ai_interaction_counts` |
| `setup-institution/index.ts` | Adicionar novos campos no TIERS |
| `check-subscription/index.ts` | Retornar novos campos |
| `ai-cotutor/index.ts` | Verificar limite de interacoes + incrementar contagem |
| `generate-scenario/index.ts` | Verificar permissao do plano |
| `AuthContext.tsx` | Armazenar novos campos de subscription |
| `PBLSession.tsx` | Condicionar paineis (peer-eval, badges, AI) |
| `AICotutorPanel.tsx` | Mostrar contagem de uso + travar quando esgotado |
| `Reports.tsx` | Bloquear recursos avancados para Starter |
| `SessionScenarioManager.tsx` | Ocultar botao de geracao IA para Starter |
| `BrandingTab.tsx` | Verificar whitelabel_enabled |
| Novo componente `UpgradeOverlay.tsx` | Componente reutilizavel de overlay de upgrade |

