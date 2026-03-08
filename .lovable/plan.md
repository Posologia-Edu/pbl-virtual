

# Plano: Sistema de Consentimento de Cookies + Coleta e Uso Estratégico

## Visão Geral

Implementar um banner de consentimento de cookies (LGPD/GDPR compliant), um sistema de gerenciamento de preferências, e a coleta efetiva de cookies que podem ser usados para analytics, personalização e conversão.

## Categorias de Cookies

| Categoria | Exemplos | Finalidade estratégica |
|-----------|----------|----------------------|
| **Essenciais** | Sessão Supabase, CSRF | Funcionamento do sistema (não desativável) |
| **Analíticos** | Páginas visitadas, tempo na página, cliques em CTAs | Entender comportamento do visitante para otimizar conversão |
| **Funcionais** | Idioma preferido, tema, último plano visualizado | Melhorar experiência e personalização |
| **Marketing** | UTM params, origem do tráfego, plano de interesse | Remarketing, segmentação de leads, medir ROI de campanhas |

## Como Usar os Cookies a Seu Favor

1. **Funil de conversão**: Rastrear quais páginas o visitante acessou antes de criar conta (Features? Pricing? Documentação?) para entender o que convence mais
2. **Personalização**: Mostrar o plano mais adequado baseado no comportamento (ex: visitou Features de IA → destacar plano com IA)
3. **Remarketing**: Salvar UTM params para saber de qual campanha veio o lead
4. **Otimização de produto**: Saber quais funcionalidades geram mais interesse na página pública
5. **Retenção**: Lembrar preferências de idioma e última ação do visitante

## Implementação Técnica

### 1. Componente CookieConsentBanner
- Banner fixo na parte inferior da tela com design consistente ao sistema
- Botões: "Aceitar todos", "Apenas essenciais", "Personalizar"
- Modal de personalização com toggles por categoria
- Preferências salvas em `localStorage` (chave `cookie_consent`)
- Exibido apenas na primeira visita ou se preferências não existirem

### 2. Hook `useCookieConsent`
- Gerencia estado do consentimento
- Expõe funções: `acceptAll()`, `rejectNonEssential()`, `updatePreferences()`
- Retorna categorias aceitas para que outros componentes saibam o que podem rastrear

### 3. Serviço de Analytics (`cookieAnalytics.ts`)
- Funções para registrar eventos: `trackPageView()`, `trackCTAClick()`, `trackPlanView()`
- Só executa se o cookie analítico foi autorizado
- Salva dados em `localStorage` temporariamente
- Ao criar conta, envia dados acumulados para uma tabela `visitor_analytics` no Supabase (vinculando ao novo `user_id`)

### 4. Tabela Supabase `visitor_analytics`
- Campos: `id`, `user_id` (nullable), `session_fingerprint`, `pages_visited`, `utm_source`, `utm_medium`, `utm_campaign`, `preferred_language`, `plan_interest`, `created_at`
- Permite consultar de onde vieram os usuários que converteram

### 5. Integração no App
- `CookieConsentBanner` renderizado no `App.tsx` (fora das rotas, sempre visível)
- Analytics tracking nas páginas públicas: LandingPage, Features, Pricing, Documentation
- UTM params capturados automaticamente na LandingPage

### 6. Atualização da página de Cookies
- Atualizar `src/pages/Cookies.tsx` para refletir as categorias reais de cookies coletados
- Adicionar link "Gerenciar preferências" que reabre o modal de consentimento

## Arquivos a Criar/Editar

- **Criar**: `src/hooks/useCookieConsent.ts`
- **Criar**: `src/components/CookieConsentBanner.tsx`
- **Criar**: `src/lib/cookieAnalytics.ts`
- **Criar**: Migration para tabela `visitor_analytics`
- **Editar**: `src/App.tsx` (adicionar banner)
- **Editar**: `src/pages/Cookies.tsx` (link para gerenciar preferências)
- **Editar**: `src/pages/LandingPage.tsx` (captura UTM, tracking)
- **Editar**: `src/pages/Features.tsx`, `Pricing.tsx` (tracking de visualização)

