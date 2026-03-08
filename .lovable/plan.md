

# Plano: Dashboard de Analytics Completo para Superadmin

## Objetivo

Criar uma nova aba "Analytics" no painel admin (apenas superadmin) com um dashboard abrangente que consolide todas as métricas relevantes do sistema em um único lugar.

## Seções do Dashboard

### 1. Visitor Analytics (Cookies)
- Total de visitantes únicos (por `session_fingerprint`)
- Páginas mais visitadas (ranking)
- CTAs mais clicados
- Origem de tráfego (UTM source/medium/campaign)
- Planos de maior interesse
- Idiomas preferidos dos visitantes
- Gráfico de visitantes por dia (últimos 30 dias)

### 2. Uso de IA
- Total de requisições de IA (últimos 30 dias)
- Tokens consumidos (input + output)
- Custo estimado em USD
- Distribuição por tipo de prompt (cotutor, cenário, ata)
- Distribuição por provedor/modelo
- Gráfico de uso diário

### 3. Métricas da Plataforma
- Total de usuários, professores, alunos, institution_admins
- Usuários ativos (últimos 7 dias — via `profiles.created_at` ou sessions)
- Total de instituições, cursos, módulos, turmas, salas
- Total de sessões tutoriais criadas
- Total de avaliações realizadas
- Total de mensagens no chat

### 4. Métricas de Engajamento
- Salas ativas vs inativas
- Média de alunos por turma
- Média de cenários por curso
- Badges concedidos (total e por categoria)

## Implementação Técnica

### Arquivos a criar
- **`src/components/admin/AnalyticsDashboard.tsx`**: Componente principal com as 4 seções, usando cards KPI + tabelas + gráficos Recharts

### Arquivos a editar
- **`src/pages/AdminPanel.tsx`**: Adicionar nova aba "Analytics" (apenas superadmin), com ícone `BarChart3`, importar o novo componente

### Dados consultados (client-side via Supabase)
- `visitor_analytics` — dados de cookies/visitantes
- `ai_usage_log` — consumo de IA
- `profiles` — contagem de usuários
- `user_roles` — distribuição de papéis
- `institutions`, `courses`, `modules`, `groups`, `rooms` — contagens
- `tutorial_sessions` — sessões ativas
- `evaluations`, `peer_evaluations` — avaliações
- `chat_messages` — mensagens
- `user_badges`, `badge_definitions` — badges

### Componentes visuais
- Cards KPI no topo (estilo similar ao FinancialDashboard)
- Gráficos de barras/linha com Recharts (já instalado)
- Tabelas de ranking (páginas, CTAs, UTMs)
- Filtro de período (7d, 30d, 90d)

