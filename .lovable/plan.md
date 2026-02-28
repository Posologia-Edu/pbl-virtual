

## Corrigir bug do localStorage e testar fluxo end-to-end

### Problema identificado
Em `DemoSession.tsx` (linha 45), a decisao de mostrar o tour usa apenas `localStorage`:
```typescript
const showOnboarding = !localStorage.getItem("onboarding_completed");
```
Isso ignora o valor `profile.onboarding_completed` do banco de dados, causando inconsistencia entre dispositivos/browsers.

### Alteracoes

**1. `src/pages/DemoSession.tsx`** (linha 45)
- Substituir a verificacao por localStorage pela leitura do `profile` do AuthContext:
```typescript
const showOnboarding = !profile?.onboarding_completed;
```
- Isso garante que o estado venha do banco de dados, nao do storage local

**2. `src/components/OnboardingGuide.tsx`** (linha 162-163)
- Remover a linha `localStorage.setItem("onboarding_completed", "true")` pois nao e mais necessaria -- o banco e a fonte da verdade
- Manter apenas o update no Supabase (`profiles.onboarding_completed = true`)

**3. Teste end-to-end via browser**
- Navegar ate a pagina de auth, criar conta ou fazer login
- Verificar redirect para `/demo` com tour visivel
- Confirmar que apos completar o tour, o redirect vai para `/pricing`
- Verificar que no login subsequente o dashboard mostra o banner de upgrade (sem tour)

### Detalhes tecnicos
- Fonte da verdade: coluna `onboarding_completed` na tabela `profiles`
- O `AuthContext` ja expoe `profile` com esse campo
- Nenhuma migracao de banco necessaria

