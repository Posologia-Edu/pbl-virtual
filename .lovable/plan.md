
# Login e Cadastro Flutuante + Login com Google

## Resumo
Transformar o login/cadastro atual (pagina inteira `/auth`) em um **modal/dialog flutuante** que abre sobre a Landing Page, e adicionar um botao de **Login com Google** via Supabase OAuth.

---

## Mudancas Planejadas

### 1. Criar componente `AuthDialog.tsx`
- Novo componente que encapsula todo o conteudo atual de `Auth.tsx` dentro de um `Dialog` (Radix UI) com overlay translucido e backdrop blur
- O modal sera centralizado, com animacao suave de entrada (scale + fade)
- Mantém as 3 abas (Aluno, Professor, Admin) e toda a logica existente
- Adiciona botao "Entrar com Google" usando `supabase.auth.signInWithOAuth({ provider: 'google' })`
- O botao Google aparece acima das abas como opcao rapida, com separador "ou"

### 2. Atualizar `LandingPage.tsx`
- O botao "Entrar" na navbar e o CTA "Comecar Agora" abrem o `AuthDialog` ao inves de navegar para `/auth`
- Controle de estado `open/setOpen` local na Landing Page
- O usuario permanece na Landing Page enquanto o modal esta aberto

### 3. Atualizar `App.tsx`
- Manter a rota `/auth` funcionando como fallback (redireciona para `/` se acessada diretamente, ou renderiza o dialog)
- Atualizar `PublicRoute` para redirecionar `/auth` para `/` ja que o login agora e flutuante

### 4. Adicionar funcao `signInWithGoogle` no `AuthContext.tsx`
- Nova funcao que chama `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/dashboard' } })`
- Exportada pelo contexto para uso em qualquer lugar

### 5. Atualizar traducoes i18n
- Adicionar chaves: `auth.orContinueWith`, `auth.googleLogin`, `auth.signUpTab`, `auth.loginTab`
- Nos 3 arquivos: `pt.json`, `en.json`, `es.json`

---

## Detalhes Tecnicos

### Estrutura do AuthDialog
```text
+----------------------------------+
|         [X] Fechar               |
|                                  |
|    [G] Entrar com Google         |
|    ─────── ou ───────            |
|                                  |
|  [Aluno] [Professor] [Admin]     |
|                                  |
|  (formulario da aba ativa)       |
|                                  |
+----------------------------------+
```

### Google OAuth
- Usa `supabase.auth.signInWithOAuth({ provider: 'google' })` que redireciona para o Google e volta para a aplicacao
- O usuario precisa configurar o Google Provider no Supabase Dashboard (Authentication > Providers > Google) com Client ID e Secret do Google Cloud Console
- O `redirectTo` sera `window.location.origin/dashboard`

### Arquivos modificados
| Arquivo | Acao |
|---------|------|
| `src/components/AuthDialog.tsx` | Criar - dialog flutuante com login/cadastro + Google |
| `src/pages/LandingPage.tsx` | Editar - abrir dialog ao inves de navegar |
| `src/pages/Auth.tsx` | Editar - redirecionar para `/` com dialog aberto |
| `src/contexts/AuthContext.tsx` | Editar - adicionar `signInWithGoogle` |
| `src/App.tsx` | Editar - ajustar rota `/auth` |
| `src/i18n/locales/pt.json` | Editar - novas chaves |
| `src/i18n/locales/en.json` | Editar - novas chaves |
| `src/i18n/locales/es.json` | Editar - novas chaves |

---

## Pre-requisito: Configuracao do Google no Supabase
Apos a implementacao, voce precisara:
1. Criar um projeto no Google Cloud Console
2. Configurar a tela de consentimento OAuth
3. Criar credenciais OAuth (Client ID + Secret)
4. Adicionar no Supabase Dashboard em Authentication > Providers > Google
5. Configurar as URLs de redirect autorizadas
