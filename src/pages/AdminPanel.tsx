import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, KeyRound, FileText, FolderOpen, Building2, BookOpen } from "lucide-react";
import CourseContextSelector from "@/components/admin/CourseContextSelector";
import InstitutionsTab from "@/components/admin/InstitutionsTab";
import InstitutionExplorer from "@/components/admin/InstitutionExplorer";
import CoursesTab from "@/components/admin/CoursesTab";
import UsersTab from "@/components/admin/UsersTab";
import GroupsTab from "@/components/admin/GroupsTab";
import ModulesTab from "@/components/admin/ModulesTab";
import ScenariosTab from "@/components/admin/ScenariosTab";
import SecurityTab from "@/components/admin/SecurityTab";

export default function AdminPanel() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({});
  const [modules, setModules] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseMembers, setCourseMembers] = useState<any[]>([]);

  const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

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

  return (
    <Layout>
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Administração</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie instituições, cursos, usuários, turmas, módulos e cenários</p>
        </div>

        <Tabs defaultValue="institutions" className="animate-fade-in">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="institutions"><Building2 className="mr-2 h-4 w-4" /> Instituições</TabsTrigger>
            <TabsTrigger value="courses"><BookOpen className="mr-2 h-4 w-4" /> Cursos</TabsTrigger>
            <TabsTrigger value="users"><UserPlus className="mr-2 h-4 w-4" /> Usuários</TabsTrigger>
            <TabsTrigger value="groups"><Users className="mr-2 h-4 w-4" /> Turmas</TabsTrigger>
            <TabsTrigger value="modules"><FolderOpen className="mr-2 h-4 w-4" /> Módulos</TabsTrigger>
            <TabsTrigger value="scenarios"><FileText className="mr-2 h-4 w-4" /> Cenários</TabsTrigger>
            <TabsTrigger value="security"><KeyRound className="mr-2 h-4 w-4" /> Segurança</TabsTrigger>
          </TabsList>

          <TabsContent value="institutions">
            <InstitutionExplorer onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="courses">
            <CoursesTab courses={courses} institutions={institutions} onRefresh={fetchAll} />
          </TabsContent>

          {/* Tabs that need course context */}
          <TabsContent value="users">
            <CourseContextSelector
              institutions={institutions} courses={courses}
              selectedInstitutionId={selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={setSelectedInstitutionId} onCourseChange={setSelectedCourseId}
            />
            <UsersTab profiles={profiles} courseMembers={courseMembers} selectedCourseId={selectedCourseId} onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="groups">
            <CourseContextSelector
              institutions={institutions} courses={courses}
              selectedInstitutionId={selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={setSelectedInstitutionId} onCourseChange={setSelectedCourseId}
            />
            <GroupsTab
              groups={groups} groupMembers={groupMembers} profiles={profiles}
              modules={modules} courseMembers={courseMembers}
              selectedCourseId={selectedCourseId} onRefresh={fetchAll}
            />
          </TabsContent>

          <TabsContent value="modules">
            <CourseContextSelector
              institutions={institutions} courses={courses}
              selectedInstitutionId={selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={setSelectedInstitutionId} onCourseChange={setSelectedCourseId}
            />
            <ModulesTab modules={modules} scenarios={scenarios} groups={groups} selectedCourseId={selectedCourseId} onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="scenarios">
            <CourseContextSelector
              institutions={institutions} courses={courses}
              selectedInstitutionId={selectedInstitutionId} selectedCourseId={selectedCourseId}
              onInstitutionChange={setSelectedInstitutionId} onCourseChange={setSelectedCourseId}
            />
            <ScenariosTab
              scenarios={scenarios} modules={modules} rooms={rooms}
              courses={courses} institutions={institutions}
              selectedCourseId={selectedCourseId} onRefresh={fetchAll}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecurityTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
