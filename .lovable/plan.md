
# Plano: Cancelamento direto na plataforma + Travas de limites do plano

## Resumo

Duas funcionalidades serão implementadas:
1. **Cancelamento de assinatura** direto pela plataforma (sem redirecionar ao Stripe)
2. **Validacao de limites** de alunos e salas antes de permitir cadastro/criacao

---

## 1. Cancelamento direto na plataforma

Atualmente o botao "Gerenciar Assinatura" redireciona para o Stripe Customer Portal. Vamos adicionar um botao dedicado "Cancelar Assinatura" com dialogo de confirmacao que cancela diretamente via edge function.

### Alteracoes:

**Nova edge function `cancel-subscription/index.ts`:**
- Recebe o token do usuario autenticado
- Busca o customer no Stripe pelo email
- Lista assinaturas ativas do customer
- Cancela a assinatura via `stripe.subscriptions.cancel()` (cancelamento imediato) ou `stripe.subscriptions.update({ cancel_at_period_end: true })` (cancela no fim do periodo -- recomendado)
- Atualiza a tabela `subscriptions` local com `status: 'canceled'` e `cancel_at`
- Retorna sucesso

**Atualizacao do `SubscriptionTab.tsx`:**
- Adicionar botao "Cancelar Assinatura" com estilo destrutivo
- Usar `AlertDialog` para confirmacao com mensagem clara ("Sua assinatura continuara ativa ate o fim do periodo atual")
- Apos cancelamento, chamar `onRefresh()` e `refreshSubscription()` para atualizar o estado

**Atualizacao do `supabase/config.toml`:**
- Adicionar entrada `[functions.cancel-subscription]` com `verify_jwt = false`

---

## 2. Travas de limites (alunos e salas)

Atualmente nenhuma validacao de limites e feita no frontend. Vamos adicionar validacoes antes de criar alunos e turmas.

### Alteracoes:

**`UsersTab.tsx` -- Limite de alunos:**
- Receber a `subscription` (dados de `mySubscription`) como prop
- Antes de criar um usuario com role "student", contar quantos alunos ja existem na instituicao (via `course_members` ou `profiles` com role `student` vinculados a instituicao)
- Se `count >= max_students`, mostrar toast de erro informando o limite e sugerindo upgrade de plano
- Desabilitar o botao de criar quando o limite for atingido

**`GroupsTab.tsx` -- Limite de salas:**
- Receber a `subscription` como prop
- Antes de criar uma turma, contar quantas turmas/salas ja existem na instituicao (via `rooms` ou `groups` vinculados aos cursos da instituicao)
- Se `count >= max_rooms`, mostrar toast de erro informando o limite e sugerindo upgrade de plano
- Desabilitar o botao de criar quando o limite for atingido

**`AdminPanel.tsx`:**
- Passar `mySubscription` como prop para `UsersTab` e `GroupsTab`

---

## Detalhes tecnicos

### Edge function `cancel-subscription`:
```text
POST /cancel-subscription
Authorization: Bearer <token>

Fluxo:
1. Autenticar usuario via token
2. Buscar Stripe customer por email
3. Listar subscriptions ativas
4. stripe.subscriptions.update(subId, { cancel_at_period_end: true })
5. Atualizar tabela subscriptions: status -> 'canceled', cancel_at -> period_end
6. Retornar { success: true }
```

### Contagem de limites:
- **Alunos**: Contar usuarios distintos com role `student` que sao `course_members` em cursos da instituicao selecionada
- **Salas/Turmas**: Contar `groups` que pertencem a cursos da instituicao selecionada (cada grupo gera uma sala automaticamente via trigger)

### Alertas visuais:
- Banner de aviso quando proximo do limite (>80%)
- Mensagem clara no toast com o limite do plano e um link/sugestao para fazer upgrade
