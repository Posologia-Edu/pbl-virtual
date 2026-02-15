import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, LayoutDashboard, Settings, LogOut, Users,
  DoorOpen, ChevronLeft, ChevronRight } from
"lucide-react";
import { useState } from "react";

const navItems = [
{ label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "professor", "student"] },
{ label: "Administração", path: "/admin", icon: Settings, roles: ["admin"] },
{ label: "Salas", path: "/rooms", icon: DoorOpen, roles: ["professor", "student"] }];


export default function Layout({ children }: {children: ReactNode;}) {
  const { user, profile, roles, signOut, isAdmin, isProfessor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const visibleNav = navItems.filter((item) =>
  item.roles.some((r) => roles.includes(r as any))
  );

  const roleLabel = isAdmin ? "Administrador" : isProfessor ? "Professor" : "Aluno";

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"}`
        }>

        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <GraduationCap className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && <span className="text-sm font-semibold text-sidebar-foreground">PBL Virtual</span>}
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {visibleNav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active ?
                "bg-sidebar-accent text-sidebar-primary font-medium" :
                "text-sidebar-foreground hover:bg-sidebar-accent/60"}`
                }>

                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>);

          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {!collapsed &&
          <div className="mb-3 px-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.full_name || user?.email}
              </p>
              <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
            </div>
          }
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent">

              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            {!collapsed &&
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent">

                <LogOut className="mr-1 h-4 w-4" />
                Sair
              </Button>
            }
          </div>
          {!collapsed && (
            <p className="mt-3 px-1 text-[10px] leading-tight text-sidebar-foreground/40">
              Desenvolvido por Sérgio Araújo · Posologia Produções
            </p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col min-h-0 overflow-auto">
        {children}
      </main>
    </div>);

}