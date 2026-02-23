

## Problema

O menu lateral (sidebar) nao mostra nenhum item de navegacao para usuarios com o papel `institution_admin`. Isso acontece porque o array `navItems` no componente `Layout.tsx` so lista os papeis `admin`, `professor` e `student` -- o papel `institution_admin` nao esta incluido em nenhum item.

## Solucao

Adicionar `institution_admin` aos items de navegacao relevantes no `Layout.tsx`:

### Alteracoes no arquivo `src/components/Layout.tsx`

1. **Dashboard** - Adicionar `institution_admin` ao array de roles (institution admins precisam ver o dashboard)
2. **Reports** - Adicionar `institution_admin` (institution admins precisam ver relatorios)  
3. **Admin** - Adicionar `institution_admin` (institution admins precisam acessar o painel admin filtrado)
4. **Rooms** - Adicionar `institution_admin` (institution admins podem precisar ver as salas)

O array `navItems` ficara assim:

```typescript
const navItems = [
  { label: t("nav.dashboard"), path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "professor", "student", "institution_admin"] },
  { label: t("nav.reports"), path: "/reports", icon: BarChart3, roles: ["admin", "professor", "institution_admin"] },
  { label: t("nav.admin"), path: "/admin", icon: Settings, roles: ["admin", "institution_admin"] },
  { label: t("nav.rooms"), path: "/rooms", icon: DoorOpen, roles: ["professor", "student", "institution_admin"] },
];
```

5. **Role label** - Atualizar a logica do `roleLabel` para incluir `institution_admin`:

```typescript
const roleLabel = isAdmin ? t("roles.admin") 
  : isInstitutionAdmin ? t("roles.institutionAdmin", "Admin Institucional")
  : isProfessor ? t("roles.professor") 
  : t("roles.student");
```

### Resumo

Apenas um arquivo sera editado (`Layout.tsx`) com alteracoes minimas: adicionar `"institution_admin"` nos arrays de roles dos nav items e ajustar o label do papel exibido no sidebar.

