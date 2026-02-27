

## Plano de Correção: Fluxo de Assinatura e Papéis

### Problema 1: Cadastro normal nao atribui papel de "student"
Quando um usuario se cadastra pelo Google ou pelo formulario de login, ele entra no sistema sem nenhum papel. Precisa-se criar um trigger ou logica que atribua automaticamente o papel `student` a usuarios que se cadastram sem passar pelo fluxo de compra.

**Solucao:** Criar uma migracao SQL com um trigger `after insert on auth.users` que insere automaticamente o papel `student` na tabela `user_roles`, apenas se o usuario nao tiver nenhum papel ainda. Isso garante que quem entra pelo onboarding de assinatura (que recebe `institution_admin`) nao seja sobrescrito.

### Problema 2: Trial de 14 dias nao implementado
A pagina de Pricing promete "14 dias de teste gratis" mas o checkout do Stripe cobra imediatamente.

**Solucao:** Adicionar `subscription_data: { trial_period_days: 14 }` na criacao da sessao de checkout em `supabase/functions/create-checkout/index.ts`. Isso faz com que o Stripe so cobre apos 14 dias.

### Problema 3: AI Co-tutor no plano Starter
A feature list mostra "AI Co-tutor basico (50 interacoes/mes)" para o Starter, mas no codigo `ai_enabled: false`.

**Solucao:** Alterar `ai_enabled` para `true` no tier Starter em `supabase/functions/setup-institution/index.ts`. O limite de 50 interacoes/mes pode ser controlado por um campo adicional ou pela logica do co-tutor (que ja pode ter esse controle).

---

### Alteracoes tecnicas

**Arquivo 1: `supabase/functions/create-checkout/index.ts`**
- Adicionar `subscription_data: { trial_period_days: 14 }` ao objeto `stripe.checkout.sessions.create()`

**Arquivo 2: `supabase/functions/setup-institution/index.ts`**
- Alterar o tier Starter de `ai_enabled: false` para `ai_enabled: true`

**Arquivo 3: Nova migracao SQL**
- Criar funcao `handle_new_user_default_role()` que insere o papel `student` automaticamente
- Criar trigger `on_auth_user_created` na tabela `auth.users` (after insert)
- A funcao verifica se ja existe um papel para o usuario antes de inserir, evitando conflitos

```text
Fluxo corrigido:

Cadastro normal (Google/email)
    |
    v
Trigger auto-atribui papel "student"
    |
    v
Usuario entra como Aluno no Dashboard


Compra de plano (Pricing -> Stripe -> Onboarding)
    |
    v
setup-institution atribui "institution_admin"
(trigger nao sobrescreve pois ja tem papel)
    |
    v
Usuario entra como Admin Institucional
com limites do plano comprado
e 14 dias de trial antes da cobranca
```

### Observacao sobre sequencia no fluxo de compra
No fluxo atual, o usuario pode comprar um plano SEM estar logado. Ele e redirecionado para o onboarding onde cria a conta. Nesse caso, o trigger ira inserir `student` primeiro, e o `setup-institution` tentara inserir `institution_admin` depois. Como a tabela `user_roles` tem restricao de unicidade em `(user_id, role)` mas nao em `user_id` sozinho (o constraint `unique(user_id)` impede multiplos papeis), sera necessario que o `setup-institution` faca um DELETE do papel antigo antes de inserir `institution_admin`, o que ja e tratado pela logica existente (ele faz insert e ignora duplicata). Precisaremos ajustar para que ele remova o papel `student` antes de atribuir `institution_admin`.

**Ajuste adicional em `setup-institution`:** Antes de inserir o papel `institution_admin`, deletar qualquer papel existente do usuario.

