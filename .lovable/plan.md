

# Revisao Completa de UX -- Todos os Fluxos do Sistema

## Resumo Executivo

Apos analisar todos os fluxos do sistema, identifiquei **12 problemas de UX** organizados por severidade. A maioria sao gaps na jornada do usuario que causam confusao, becos sem saida ou inconsistencias entre os papeis.

---

## Problemas Encontrados

### Severidade Alta (Bloqueiam ou confundem o usuario)

**1. Login de Aluno/Professor sem senha e seguranca fragil**
- O fluxo de login para alunos e professores usa senha efemera gerada no servidor (Edge Function `login`), o que significa que a cada login a senha do usuario e sobrescrita. Se o usuario tentar fazer "Esqueci minha senha", recebera um link que sera inutil pois a senha muda a cada login.
- O link "Esqueci meu acesso" aparece para aluno/professor mas nao faz sentido no modelo atual onde nao ha senha fixa.
- **Solucao**: Remover o link "Esqueci meu acesso" das abas de aluno e professor, ou repensar o modelo de autenticacao.

**2. Pricing: Checkout sem autenticacao leva a fluxo quebrado**
- Na pagina `/pricing`, o usuario pode clicar "Assinar" sem estar logado. O `create-checkout` aceita requisicoes sem auth. Apos o pagamento no Stripe, o usuario e redirecionado para `/onboarding?session_id=...`.
- Porem, a pagina de Onboarding pede para criar conta com email/senha e depois criar instituicao. Se o usuario ja tiver conta, nao ha opcao de login -- fica preso no formulario de signup.
- **Solucao**: Adicionar opcao "Ja tenho conta" no Onboarding, ou verificar se o email ja existe antes de criar conta.

**3. Onboarding: Criacao de conta sem atribuicao de role**
- No `Onboarding.tsx`, o usuario cria conta via `signUp` mas nenhum role (`institution_admin`) e atribuido automaticamente. A Edge Function `setup-institution` provavelmente faz isso, mas se falhar, o usuario fica sem role e sem acesso ao painel admin.
- **Solucao**: Garantir que o role seja atribuido atomicamente junto com a criacao da instituicao, e mostrar mensagem de erro clara se falhar.

**4. Dashboard vazio para Admin Institucional sem instituicao**
- Um admin institucional que acabou de ser convidado e definiu senha, mas ainda nao criou instituicao, vera o Dashboard vazio (sem salas, cursos, etc.) sem nenhuma orientacao de que precisa ir ao `/admin` para criar sua instituicao.
- **Solucao**: Adicionar banner/card no Dashboard orientando o admin institucional a configurar sua instituicao primeiro.

### Severidade Media (Prejudicam a experiencia)

**5. Pagina `/auth` redireciona para `/` silenciosamente**
- A pagina `Auth.tsx` faz apenas `<Navigate to="/" replace />`, ou seja, se alguem acessar `/auth` diretamente, e redirecionado para a landing sem feedback. Isso e confuso especialmente quando links de email apontam para `/auth`.
- **Solucao**: Redirecionar para `/` e abrir o AuthDialog automaticamente.

**6. Layout sidebar nao responsiva para mobile**
- O `Layout.tsx` usa sidebar fixa de 60px/240px sem hamburger menu ou drawer para mobile. Em telas pequenas, a sidebar ocupa espaco excessivo.
- **Solucao**: Implementar drawer/sheet para mobile com toggle hamburger.

**7. Relatorios acessiveis apenas para "professor" mas nao para "institution_admin"**
- A rota `/reports` exige `requiredRole="professor"`, mas o admin institucional (que tambem deveria ver relatorios de sua instituicao) nao tem acesso.
- O menu lateral inclui `institution_admin` nos roles de Reports, criando inconsistencia: o link aparece mas a rota bloqueia o acesso.
- **Solucao**: Adicionar `institution_admin` ao `requiredRole` da rota `/reports`.

**8. Superadmin pode ver botoes de excluir/ocultar em instituicoes proprias**
- Na `InstitutionExplorer`, as instituicoes "superadmin" (sem owner) ainda mostram botoes de excluir e ocultar. Se a intencao e read-only para superadmin, esses botoes deveriam ser escondidos.
- **Solucao**: Respeitar o mesmo flag `readOnly`/`canCreate` para ocultar acoes destrutivas.

**9. check-subscription nao retorna `plan_name` nem `institution_id`**
- O `AuthContext` espera `plan_name` e `institution_id` do `check-subscription`, mas a Edge Function so retorna `subscribed`, `product_id`, e `subscription_end`. Isso faz com que `subscription.institutionId` seja sempre `null`, quebrando toda a logica de filtragem do admin institucional.
- **Solucao**: Buscar a subscription do banco Supabase (tabela `subscriptions`) dentro da Edge Function e retornar `plan_name` e `institution_id`.

### Severidade Baixa (Melhorias de polimento)

**10. Textos hardcoded em portugues em paginas i18n**
- Varias paginas (Pricing, AdminPanel, InstitutionExplorer) tem textos fixos em portugues ("Planos", "Financeiro", "Convites", "Cadastrar Instituicao") enquanto o restante do sistema usa `t()` para internacionalizacao.
- **Solucao**: Mover todos os textos para os arquivos de traducao.

**11. Google Login redireciona para `/dashboard` independente do role**
- O `signInWithGoogle` redireciona sempre para `/dashboard`. Se o usuario for admin, deveria ir para `/admin`.
- **Solucao**: Apos o redirect do Google OAuth, verificar o role e redirecionar adequadamente.

**12. PDF Export usa `window.print()` sem formatacao dedicada**
- Na pagina de Reports, "Exportar PDF" apenas abre `window.print()`. Classes `print:hidden` existem mas nao ha stylesheet de impressao dedicada, resultando em output pobre.
- **Solucao**: Adicionar estilos `@media print` ou usar biblioteca de geracao de PDF.

---

## Plano de Implementacao

### Fase 1 -- Correcoes Criticas
1. Corrigir `check-subscription` para retornar `plan_name` e `institution_id` da tabela `subscriptions`
2. Corrigir rota `/reports` para aceitar `institution_admin`
3. Remover link "Esqueci meu acesso" das abas aluno/professor no AuthDialog
4. Adicionar banner de orientacao no Dashboard para admin institucional sem instituicao

### Fase 2 -- Melhorias de Fluxo
5. Tratar pagina `/auth` para abrir dialog automaticamente na landing
6. Adicionar opcao "Ja tenho conta" no Onboarding
7. Esconder botoes destrutivos no InstitutionExplorer quando superadmin
8. Corrigir redirecionamento pos-Google OAuth por role

### Fase 3 -- Polimento
9. Internacionalizar textos hardcoded
10. Melhorar responsividade mobile do Layout
11. Melhorar exportacao PDF dos relatorios

---

## Detalhes Tecnicos

### Correcao 1: check-subscription (Mais urgente)

O `check-subscription` precisa:
- Apos obter o email do JWT, buscar na tabela `subscriptions` pelo email (via join com `auth.users`) ou pelo `stripe_customer_id`
- Retornar `plan_name` e `institution_id` alem dos dados do Stripe
- Sem isso, toda a logica de multi-tenancy do admin institucional esta quebrada

### Correcao 7: InstitutionExplorer readOnly

Passar prop `readOnly` (derivada de `isSuperAdmin`) para ocultar:
- Botoes de excluir instituicao
- Botoes de ocultar/reativar
- Mantendo apenas navegacao drill-down

### Correcao 2: Rota Reports

Alterar em `App.tsx`:
```
requiredRole="professor"  -->  requiredRole={["professor", "institution_admin"]}
```
