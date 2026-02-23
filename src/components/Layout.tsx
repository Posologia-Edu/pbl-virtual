import { ReactNode, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, LayoutDashboard, Settings, LogOut, Users,
  DoorOpen, ChevronLeft, ChevronRight, BarChart3, Menu, X,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Layout({ children }: { children: ReactNode }) {
  const { user, profile, roles, signOut, isAdmin, isProfessor, isInstitutionAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  const navItems = [
    { label: t("nav.dashboard"), path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "professor", "student", "institution_admin"] },
    { label: t("nav.reports"), path: "/reports", icon: BarChart3, roles: ["admin", "professor", "institution_admin"] },
    { label: t("nav.admin"), path: "/admin", icon: Settings, roles: ["admin", "institution_admin"] },
    { label: t("nav.rooms"), path: "/rooms", icon: DoorOpen, roles: ["professor", "student", "institution_admin"] },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const visibleNav = navItems.filter((item) =>
    item.roles.some((r) => roles.includes(r as any))
  );

  const roleLabel = isAdmin ? t("roles.admin") : isInstitutionAdmin ? t("roles.institutionAdmin", "Admin Institucional") : isProfessor ? t("roles.professor") : t("roles.student");

  const sidebarContent = (onNavigate?: () => void) => (
    <>
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <GraduationCap className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        {(!collapsed || isMobile) && <span className="text-sm font-semibold text-sidebar-foreground">{t("app.name")}</span>}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {visibleNav.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {(!collapsed || isMobile) && (
          <div className="mb-3 px-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || user?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60">{roleLabel}</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
          <LanguageSwitcher collapsed={!isMobile && collapsed} />
          {(!collapsed || isMobile) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleSignOut();
                onNavigate?.();
              }}
              className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="mr-1 h-4 w-4" />
              {t("nav.signOut")}
            </Button>
          )}
        </div>
        {(!collapsed || isMobile) && (
          <p className="mt-3 px-1 text-[10px] leading-tight text-sidebar-foreground/40">
            {t("app.credits")}
          </p>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile hamburger */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 h-10 w-10 rounded-xl bg-sidebar/90 backdrop-blur-md border border-sidebar-border shadow-md text-sidebar-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile Sheet Sidebar */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border flex flex-col">
            <SheetTitle className="sr-only">{t("nav.dashboard")}</SheetTitle>
            {sidebarContent(() => setMobileOpen(false))}
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={`flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
            collapsed ? "w-16" : "w-60"
          }`}
        >
          {sidebarContent()}
        </aside>
      )}

      {/* Main content */}
      <main className={`flex flex-1 flex-col min-h-0 overflow-auto ${isMobile ? "pt-14" : ""}`}>
        {children}
      </main>
    </div>
  );
}
