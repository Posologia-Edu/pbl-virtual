import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { UserPlus, Users, KeyRound, FileText, FolderOpen, Building2, BookOpen, Palette, CreditCard, MailPlus, Bot } from "lucide-react";
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

export default function AdminPanel() {
  const { t } = useTranslation();
  const { isAdmin, isInstitutionAdmin, subscription } = useAuth();
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

  // For institution_admin, lock to their institution
  useEffect(() => {
    if (isInstitutionAdmin && subscription.institutionId) {
      setSelectedInstitutionId(subscription.institutionId);
    }
  }, [isInstitutionAdmin, subscription.institutionId]);

  useEffect(() => {
    fetchAll();
  }, []);

  // Fetch subscription for institution_admin
  useEffect(() => {
    if (isInstitutionAdmin && subscription.institutionId) {
      supabase
        .from("subscriptions")
        .select("*")
        .eq("institution_id", subscription.institutionId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setMySubscription(data);
        });
    }
  }, [isInstitutionAdmin, subscription.institutionId]);

  const fetchAll = async () => {
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
  const visibleInstitutions = isInstitutionAdmin && subscription.institutionId
    ? institutions.filter((i) => i.id === subscription.institutionId)
    : institutions;

  const visibleCourses = isInstitutionAdmin && subscription.institutionId
    ? courses.filter((c) => c.institution_id === subscription.institutionId)
    : courses;

  const defaultTab = isSuperAdmin ? "institutions" : "courses";

  return (
    <Layout>
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">
            {isSuperAdmin ? t("admin.title") : "Painel da Instituição"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin ? t("admin.subtitle") : visibleInstitutions[0]?.name || "Gerencie sua instituição"}
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="animate-fade-in">
          <TabsList className="mb-6 flex-wrap">
            {(isSuperAdmin || isInstitutionAdmin) && (
              <TabsTrigger value="institutions"><Building2 className="mr-2 h-4 w-4" /> {t("admin.institutions")}</TabsTrigger>
            )}
            <TabsTrigger value="courses"><BookOpen className="mr-2 h-4 w-4" /> {t("admin.courses")}</TabsTrigger>
            <TabsTrigger value="users"><UserPlus className="mr-2 h-4 w-4" /> {t("admin.users")}</TabsTrigger>
            <TabsTrigger value="groups"><Users className="mr-2 h-4 w-4" /> {t("admin.groups")}</TabsTrigger>
            <TabsTrigger value="modules"><FolderOpen className="mr-2 h-4 w-4" /> {t("admin.modules")}</TabsTrigger>
            <TabsTrigger value="scenarios"><FileText className="mr-2 h-4 w-4" /> {t("admin.scenarios")}</TabsTrigger>
            <TabsTrigger value="branding"><Palette className="mr-2 h-4 w-4" /> {t("admin.branding")}</TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="financial"><CreditCard className="mr-2 h-4 w-4" /> Financeiro</TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="invites"><MailPlus className="mr-2 h-4 w-4" /> Convites</TabsTrigger>
            )}
            {isInstitutionAdmin && !isSuperAdmin && (
              <TabsTrigger value="subscription"><CreditCard className="mr-2 h-4 w-4" /> Assinatura</TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="ai-keys"><Bot className="mr-2 h-4 w-4" /> API Keys IA</TabsTrigger>
            )}
            <TabsTrigger value="security"><KeyRound className="mr-2 h-4 w-4" /> {t("admin.security")}</TabsTrigger>
          </TabsList>

          {(isSuperAdmin || isInstitutionAdmin) && (
            <TabsContent value="institutions">
              <InstitutionExplorer
                onRefresh={fetchAll}
                canCreate={isSuperAdmin || (isInstitutionAdmin && !subscription.institutionId)}
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
              selectedInstitutionId={isInstitutionAdmin && subscription.institutionId ? subscription.institutionId : selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={isSuperAdmin ? setSelectedInstitutionId : () => {}} onCourseChange={setSelectedCourseId}
              lockInstitution={isInstitutionAdmin && !isSuperAdmin}
            />
            <UsersTab profiles={profiles} courseMembers={courseMembers} selectedCourseId={selectedCourseId} selectedInstitutionId={isInstitutionAdmin && subscription.institutionId ? subscription.institutionId : selectedInstitutionId} institutions={visibleInstitutions} courses={visibleCourses} onRefresh={fetchAll} readOnly={false} />
          </TabsContent>

          <TabsContent value="groups">
            <CourseContextSelector
              institutions={visibleInstitutions} courses={visibleCourses}
              selectedInstitutionId={isInstitutionAdmin && subscription.institutionId ? subscription.institutionId : selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={isSuperAdmin ? setSelectedInstitutionId : () => {}} onCourseChange={setSelectedCourseId}
              lockInstitution={isInstitutionAdmin && !isSuperAdmin}
            />
            <GroupsTab
              groups={groups} groupMembers={groupMembers} profiles={profiles}
              modules={modules} courseMembers={courseMembers}
              selectedCourseId={selectedCourseId} onRefresh={fetchAll} readOnly={false}
            />
          </TabsContent>

          <TabsContent value="modules">
            <CourseContextSelector
              institutions={visibleInstitutions} courses={visibleCourses}
              selectedInstitutionId={isInstitutionAdmin && subscription.institutionId ? subscription.institutionId : selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={isSuperAdmin ? setSelectedInstitutionId : () => {}} onCourseChange={setSelectedCourseId}
              lockInstitution={isInstitutionAdmin && !isSuperAdmin}
            />
            <ModulesTab modules={modules} scenarios={scenarios} groups={groups} profiles={profiles} groupMembers={groupMembers} selectedCourseId={selectedCourseId} onRefresh={fetchAll} readOnly={false} />
          </TabsContent>

          <TabsContent value="scenarios">
            <CourseContextSelector
              institutions={visibleInstitutions} courses={visibleCourses}
              selectedInstitutionId={isInstitutionAdmin && subscription.institutionId ? subscription.institutionId : selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={isSuperAdmin ? setSelectedInstitutionId : () => {}} onCourseChange={setSelectedCourseId}
              lockInstitution={isInstitutionAdmin && !isSuperAdmin}
            />
            <ScenariosTab
              scenarios={scenarios} modules={modules} rooms={rooms}
              courses={visibleCourses} institutions={visibleInstitutions} groups={groups}
              selectedCourseId={selectedCourseId} onRefresh={fetchAll} readOnly={false}
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

          <TabsContent value="security">
            <SecurityTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
