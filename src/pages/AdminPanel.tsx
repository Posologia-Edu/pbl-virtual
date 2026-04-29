import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { UserPlus, Users, KeyRound, FileText, FolderOpen, Building2, BookOpen, Palette, CreditCard, MailPlus, Bot, BarChart3, Rocket, Webhook, Sparkles, Search, Settings2, ShieldCheck, LayoutGrid, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import CourseContextSelector from "@/components/admin/CourseContextSelector";
import InstitutionExplorer from "@/components/admin/InstitutionExplorer";
import CoursesTab from "@/components/admin/CoursesTab";
import UsersTab from "@/components/admin/UsersTab";
import GroupsTab from "@/components/admin/GroupsTab";
import ModulesTab from "@/components/admin/ModulesTab";
import ScenariosTab from "@/components/admin/ScenariosTab";
import SecurityTab from "@/components/admin/SecurityTab";
import BrandingTab from "@/components/admin/BrandingTab";
import FinancialDashboard from "@/components/admin/FinancialDashboard";
import InviteAdminTab from "@/components/admin/InviteAdminTab";
import SubscriptionTab from "@/components/admin/SubscriptionTab";
import AIKeysTab from "@/components/admin/AIKeysTab";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import PipelineTab from "@/components/admin/PipelineTab";
import ApiKeysTab from "@/components/admin/ApiKeysTab";
import AdaptiveScenariosTab from "@/components/admin/AdaptiveScenariosTab";

export default function AdminPanel() {
  const { t } = useTranslation();
  const { isAdmin, isInstitutionAdmin, subscription, user, session, loading } = useAuth();
  const isSuperAdmin = isAdmin;

  const [profiles, setProfiles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({});
  const [modules, setModules] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseMembers, setCourseMembers] = useState<any[]>([]);
  const [mySubscription, setMySubscription] = useState<any>(null);

  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  // For institution_admin, resolve institution from subscription OR direct DB query
  useEffect(() => {
    if (!isInstitutionAdmin || !session || loading) return;
    
    if (subscription.institutionId) {
      setSelectedInstitutionId(subscription.institutionId);
      return;
    }
    
    // Fallback: query institution directly from DB if subscription hasn't loaded yet
    const resolveInstitution = async () => {
      const { data } = await supabase
        .from("institutions")
        .select("id")
        .maybeSingle();
      if (data?.id) {
        setSelectedInstitutionId(data.id);
      }
    };
    resolveInstitution();
  }, [isInstitutionAdmin, subscription.institutionId, session, loading]);

  useEffect(() => {
    if (session && !loading) fetchAll();
  }, [session?.access_token, loading, subscription.institutionId]);

  // Fetch subscription for institution_admin
  useEffect(() => {
    if (isInstitutionAdmin && selectedInstitutionId) {
      supabase
        .from("subscriptions")
        .select("*")
        .eq("institution_id", selectedInstitutionId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMySubscription(data);
        });
    }
  }, [isInstitutionAdmin, selectedInstitutionId]);

  const fetchAll = async () => {
    console.log("[AdminPanel] fetchAll started, user:", user?.id);
    const [profilesRes, rolesRes, groupsRes, roomsRes, modulesRes, scenariosRes, instRes, coursesRes, cmRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("groups").select("*, profiles!groups_professor_id_profiles_fkey(full_name)"),
      supabase.from("rooms").select("*"),
      supabase.from("modules").select("*").order("created_at", { ascending: false }),
      supabase.from("scenarios").select("*, modules(name)").order("created_at", { ascending: false }),
      supabase.from("institutions").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("course_members").select("*"),
    ]);

    console.log("[AdminPanel] institutions fetched:", instRes.data?.length, instRes.error, "subscription.institutionId:", subscription.institutionId);

    if (profilesRes.data) {
      const rolesMap: Record<string, any[]> = {};
      (rolesRes.data || []).forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r);
      });
      setProfiles(profilesRes.data.map((p: any) => ({ ...p, user_roles: rolesMap[p.user_id] || [] })));
    }

    if (groupsRes.data) {
      setGroups(groupsRes.data);
      const membersMap: Record<string, any[]> = {};
      for (const g of groupsRes.data) {
        const { data } = await supabase
          .from("group_members")
          .select("*, profiles(full_name)")
          .eq("group_id", g.id);
        membersMap[g.id] = data || [];
      }
      setGroupMembers(membersMap);
    }

    if (roomsRes.data) setRooms(roomsRes.data);
    if (modulesRes.data) setModules(modulesRes.data);
    if (scenariosRes.data) setScenarios(scenariosRes.data);
    if (instRes.data) setInstitutions(instRes.data);
    if (coursesRes.data) setCourses(coursesRes.data);
    if (cmRes.data) setCourseMembers(cmRes.data);
  };

  // For institution_admin, filter data to their institution
  const effectiveInstitutionId = isInstitutionAdmin ? selectedInstitutionId : null;
  
  const visibleInstitutions = effectiveInstitutionId
    ? institutions.filter((i) => i.id === effectiveInstitutionId)
    : institutions;

  const visibleCourses = effectiveInstitutionId
    ? courses.filter((c) => c.institution_id === effectiveInstitutionId)
    : courses;

  const defaultTab = isSuperAdmin ? "institutions" : "courses";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [navQuery, setNavQuery] = useState("");

  type NavItem = { value: string; label: string; icon: any; visible: boolean; badge?: string };
  type NavGroup = { id: string; label: string; icon: any; items: NavItem[] };

  const navGroups: NavGroup[] = useMemo(() => [
    {
      id: "academic",
      label: "Acadêmico",
      icon: GraduationCap,
      items: [
        { value: "institutions", label: t("admin.institutions"), icon: Building2, visible: isSuperAdmin || isInstitutionAdmin },
        { value: "courses", label: t("admin.courses"), icon: BookOpen, visible: true },
        { value: "users", label: t("admin.users"), icon: UserPlus, visible: true },
        { value: "groups", label: t("admin.groups"), icon: Users, visible: true },
        { value: "modules", label: t("admin.modules"), icon: FolderOpen, visible: true },
      ],
    },
    {
      id: "content",
      label: "Conteúdo PBL",
      icon: LayoutGrid,
      items: [
        { value: "scenarios", label: t("admin.scenarios"), icon: FileText, visible: true },
        { value: "adaptive", label: "Adaptativos", icon: Sparkles, visible: true, badge: "IA" },
        { value: "branding", label: t("admin.branding"), icon: Palette, visible: true },
      ],
    },
    {
      id: "ops",
      label: "Operação",
      icon: Settings2,
      items: [
        { value: "financial", label: "Financeiro", icon: CreditCard, visible: isSuperAdmin },
        { value: "invites", label: "Convites", icon: MailPlus, visible: isSuperAdmin },
        { value: "subscription", label: "Assinatura", icon: CreditCard, visible: isInstitutionAdmin && !isSuperAdmin },
        { value: "ai-keys", label: "API Keys IA", icon: Bot, visible: isSuperAdmin },
        { value: "analytics", label: "Analytics", icon: BarChart3, visible: isSuperAdmin },
        { value: "pipeline", label: "Pipeline", icon: Rocket, visible: isSuperAdmin },
        { value: "api", label: "API & Integrações", icon: Webhook, visible: isSuperAdmin || isInstitutionAdmin },
      ],
    },
    {
      id: "security",
      label: "Segurança",
      icon: ShieldCheck,
      items: [
        { value: "security", label: t("admin.security"), icon: KeyRound, visible: true },
      ],
    },
  ], [isSuperAdmin, isInstitutionAdmin, t]);

  const filteredGroups = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    return navGroups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.visible && (!q || i.label.toLowerCase().includes(q))) }))
      .filter((g) => g.items.length > 0);
  }, [navGroups, navQuery]);

  const activeMeta = navGroups.flatMap((g) => g.items).find((i) => i.value === activeTab);

  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        {/* Hero header */}
        <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/10 via-background to-background px-6 lg:px-8 pt-8 pb-6">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="relative animate-fade-in flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground mb-3">
                <Settings2 className="h-3 w-3" />
                {isSuperAdmin ? "Modo Superadmin" : "Painel da Instituição"}
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                {isSuperAdmin ? t("admin.title") : (visibleInstitutions[0]?.name || "Painel da Instituição")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                {isSuperAdmin ? t("admin.subtitle") : "Gerencie cursos, turmas, usuários e cenários da sua instituição."}
              </p>
            </div>
            {activeMeta && (
              <div className="hidden md:flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 backdrop-blur px-4 py-2 shadow-sm">
                <activeMeta.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{activeMeta.label}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 md:px-6 lg:px-8 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Modern sidebar nav */}
              <aside className="lg:w-64 lg:shrink-0">
                <div className="lg:sticky lg:top-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar seção..."
                      value={navQuery}
                      onChange={(e) => setNavQuery(e.target.value)}
                      className="pl-9 h-10 bg-card/60 backdrop-blur border-border/60"
                    />
                  </div>

                  {/* Hidden TabsList for a11y/keyboard — actual UI below */}
                  <TabsList className="sr-only">
                    {navGroups.flatMap((g) => g.items).filter((i) => i.visible).map((i) => (
                      <TabsTrigger key={i.value} value={i.value}>{i.label}</TabsTrigger>
                    ))}
                  </TabsList>

                  <nav className="space-y-5">
                    {filteredGroups.map((group) => (
                      <div key={group.id}>
                        <div className="flex items-center gap-2 px-2 mb-2">
                          <group.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {group.label}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {group.items.map((item) => {
                            const isActive = activeTab === item.value;
                            const Icon = item.icon;
                            return (
                              <li key={item.value}>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab(item.value)}
                                  className={cn(
                                    "group w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                                    "border border-transparent",
                                    isActive
                                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                      : "text-foreground/80 hover:bg-accent hover:text-foreground hover:border-border/60"
                                  )}
                                >
                                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                                  <span className="flex-1 text-left truncate">{item.label}</span>
                                  {item.badge && (
                                    <Badge
                                      variant={isActive ? "secondary" : "outline"}
                                      className="text-[10px] px-1.5 py-0 h-4"
                                    >
                                      {item.badge}
                                    </Badge>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                    {filteredGroups.length === 0 && (
                      <p className="px-2 text-xs text-muted-foreground">Nenhuma seção encontrada.</p>
                    )}
                  </nav>
                </div>
              </aside>

              {/* Content area */}
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm p-4 md:p-6 shadow-sm">

          {(isSuperAdmin || isInstitutionAdmin) && (
            <TabsContent value="institutions">
              <InstitutionExplorer
                onRefresh={fetchAll}
                canCreate={isSuperAdmin || (isInstitutionAdmin && !selectedInstitutionId)}
                readOnly={false}
                isSuperAdmin={isSuperAdmin}
              />
            </TabsContent>
          )}

          <TabsContent value="courses">
            <CoursesTab courses={visibleCourses} institutions={visibleInstitutions} modules={modules} groups={groups} groupMembers={groupMembers} profiles={profiles} courseMembers={courseMembers} scenarios={scenarios} onRefresh={fetchAll} readOnly={false} />
          </TabsContent>

          <TabsContent value="users">
            <CourseContextSelector
              institutions={visibleInstitutions} courses={visibleCourses}
              selectedInstitutionId={selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={isSuperAdmin ? setSelectedInstitutionId : () => {}} onCourseChange={setSelectedCourseId}
              lockInstitution={isInstitutionAdmin && !isSuperAdmin}
            />
            <UsersTab profiles={profiles} courseMembers={courseMembers} selectedCourseId={selectedCourseId} selectedInstitutionId={selectedInstitutionId} institutions={visibleInstitutions} courses={visibleCourses} onRefresh={fetchAll} readOnly={false} subscription={mySubscription} />
          </TabsContent>

          <TabsContent value="groups">
            <CourseContextSelector
              institutions={visibleInstitutions} courses={visibleCourses}
              selectedInstitutionId={selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={isSuperAdmin ? setSelectedInstitutionId : () => {}} onCourseChange={setSelectedCourseId}
              lockInstitution={isInstitutionAdmin && !isSuperAdmin}
            />
            <GroupsTab
              groups={groups} groupMembers={groupMembers} profiles={profiles}
              modules={modules} courseMembers={courseMembers}
              selectedCourseId={selectedCourseId} onRefresh={fetchAll} readOnly={false}
              subscription={mySubscription}
            />
          </TabsContent>

          <TabsContent value="modules">
            <CourseContextSelector
              institutions={visibleInstitutions} courses={visibleCourses}
              selectedInstitutionId={selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={isSuperAdmin ? setSelectedInstitutionId : () => {}} onCourseChange={setSelectedCourseId}
              lockInstitution={isInstitutionAdmin && !isSuperAdmin}
            />
            <ModulesTab modules={modules} scenarios={scenarios} groups={groups} profiles={profiles} groupMembers={groupMembers} selectedCourseId={selectedCourseId} onRefresh={fetchAll} readOnly={false} />
          </TabsContent>

          <TabsContent value="scenarios">
            <CourseContextSelector
              institutions={visibleInstitutions} courses={visibleCourses}
              selectedInstitutionId={selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={isSuperAdmin ? setSelectedInstitutionId : () => {}} onCourseChange={setSelectedCourseId}
              lockInstitution={isInstitutionAdmin && !isSuperAdmin}
            />
            <ScenariosTab
              scenarios={scenarios} modules={modules} rooms={rooms}
              courses={visibleCourses} institutions={visibleInstitutions} groups={groups}
              selectedCourseId={selectedCourseId} onRefresh={fetchAll} readOnly={false}
            />
          </TabsContent>

          <TabsContent value="adaptive">
            <CourseContextSelector
              institutions={visibleInstitutions} courses={visibleCourses}
              selectedInstitutionId={selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={isSuperAdmin ? setSelectedInstitutionId : () => {}} onCourseChange={setSelectedCourseId}
              lockInstitution={isInstitutionAdmin && !isSuperAdmin}
            />
            <AdaptiveScenariosTab
              groups={groups} scenarios={scenarios} selectedCourseId={selectedCourseId} onRefresh={fetchAll}
            />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingTab institutions={visibleInstitutions} onRefresh={fetchAll} readOnly={false} />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="financial">
              <FinancialDashboard />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="invites">
              <InviteAdminTab />
            </TabsContent>
          )}

          {isInstitutionAdmin && !isSuperAdmin && (
            <TabsContent value="subscription">
              <SubscriptionTab subscription={mySubscription} onRefresh={fetchAll} />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="ai-keys">
              <AIKeysTab />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="analytics">
              <AnalyticsDashboard />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="pipeline">
              <PipelineTab />
            </TabsContent>
          )}

          {(isSuperAdmin || isInstitutionAdmin) && (
            <TabsContent value="api">
              <ApiKeysTab institutionId={selectedInstitutionId} />
            </TabsContent>
          )}

          <TabsContent value="security">
            <SecurityTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
