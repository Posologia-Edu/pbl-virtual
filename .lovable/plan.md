

## Associar plano ao admin convidado e gerenciar via superadmin

### Contexto atual
- Admins convidados recebem uma assinatura "Convidado (Cortesia)" com limites maximos (999 alunos, 999 salas, tudo habilitado)
- O superadmin nao escolhe qual plano atribuir ao convidado
- Nao ha como alterar o plano de um convidado depois
- Nao ha como revogar o acesso de um convidado pela UI (so via `revoke_access` que ja existe no backend mas nao esta exposto na UI)
- A aba "Assinatura" do admin institucional mostra "Acesso cortesia — sem cobranca recorrente" para convidados

### O que sera feito

**1. Formulario de convite com selecao de plano**

No `InviteAdminTab.tsx`, adicionar um seletor de plano (Starter, Professional, Enterprise) ao formulario de convite. O superadmin escolhe qual plano atribuir ao admin convidado antes de enviar.

**2. Edge Function `invite-admin` — receber `plan_name` no convite**

Na acao `invite`, aceitar o campo `plan_name` (starter | professional | enterprise). Esse valor sera salvo na tabela `admin_invites` em uma nova coluna `assigned_plan`.

**3. Migracao: coluna `assigned_plan` em `admin_invites`**

Adicionar coluna `assigned_plan text` (nullable) na tabela `admin_invites` para registrar qual plano foi atribuido pelo superadmin.

**4. Edge Function `setup-institution` — usar plano atribuido**

Na acao `setup-invited`, em vez de criar uma assinatura com limites maximos fixos, buscar o `assigned_plan` do convite e aplicar os limites do tier correspondente (usando o mapeamento TIERS ja existente). A assinatura criada tera o `plan_name` correto (starter/professional/enterprise) com os limites reais do plano.

**5. Edge Function `invite-admin` — acao `update_plan`**

Nova acao que permite ao superadmin alterar o plano de um admin convidado:
- Recebe `invite_id` e `plan_name`
- Verifica que a assinatura e de tipo convidado (`stripe_customer_id` comeca com `invited_`)
- Atualiza `admin_invites.assigned_plan` e a linha correspondente em `subscriptions` com os novos limites
- Se a assinatura nao for de tipo convidado (e real do Stripe), retorna erro 403 — apenas o proprio admin pode alterar via Stripe

**6. Edge Function `invite-admin` — acao `revoke` na UI**

A acao `revoke_access` ja existe no backend. Expor na UI do `InviteAdminTab.tsx` com um botao "Revogar Acesso" com confirmacao (AlertDialog) para cada admin convidado ativo.

**7. UI: lista de convites com plano e acoes**

No `InviteAdminTab.tsx`, a lista de convites passara a exibir:
- O plano atribuido (badge colorido: Starter/Professional/Enterprise)
- Um seletor para alterar o plano (apenas para convidados, nao assinantes Stripe)
- Botao "Revogar" com confirmacao

**8. UI: aba Assinatura para admin convidado**

No `SubscriptionTab.tsx`, quando o admin for convidado, em vez de mostrar "Acesso cortesia", exibir o nome real do plano (Starter/Professional/Enterprise) com os limites corretos, e uma nota "Plano atribuido pelo administrador do sistema".

### Detalhes tecnicos

```text
Fluxo do convite:
  Superadmin -> seleciona email + plano -> invite-admin(action:invite, email, plan_name)
    -> salva em admin_invites com assigned_plan
    -> envia email

Fluxo do setup:
  Admin convidado -> login -> setup-institution(action:setup-invited)
    -> busca admin_invites.assigned_plan
    -> cria subscription com limites do TIERS[plan_name]

Fluxo de alteracao:
  Superadmin -> invite-admin(action:update_plan, invite_id, plan_name)
    -> valida que e convidado (stripe_customer_id starts with "invited_")
    -> atualiza admin_invites.assigned_plan
    -> atualiza subscriptions com novos limites

Fluxo de revogacao:
  Superadmin -> invite-admin(action:revoke_access, institution_id)
    -> deleta toda a hierarquia (ja implementado)
```

Mapeamento de planos (ja existe em `setup-institution`):

```text
starter       -> 30 alunos, 3 salas, IA basica (50), sem cenarios IA, sem peers, sem badges, sem relatorios completos
professional  -> 150 alunos, ilimitadas salas, IA avancada (500), cenarios IA, peers, badges, relatorios completos
enterprise    -> ilimitado tudo, white-label
```

### Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/...` | Nova coluna `assigned_plan` em `admin_invites` |
| `supabase/functions/invite-admin/index.ts` | Acao `invite` aceita `plan_name`, nova acao `update_plan`, lista retorna `assigned_plan` |
| `supabase/functions/setup-institution/index.ts` | Acao `setup-invited` busca e aplica `assigned_plan` do convite |
| `src/components/admin/InviteAdminTab.tsx` | Seletor de plano no formulario, exibicao de plano na lista, botoes de alterar plano e revogar |
| `src/components/admin/SubscriptionTab.tsx` | Exibir plano real para convidados em vez de "Cortesia" generico |
| `src/integrations/supabase/types.ts` | Atualizar tipos para incluir `assigned_plan` em `admin_invites` |

