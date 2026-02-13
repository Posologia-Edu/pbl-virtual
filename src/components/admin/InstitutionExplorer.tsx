import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, BookOpen, FolderOpen, Users, ChevronRight, ArrowLeft, GraduationCap, User } from "lucide-react";

type Level = "institutions" | "courses" | "modules" | "groups" | "members";

interface BreadcrumbItem {
  level: Level;
  id: string;
  label: string;
}

export default function InstitutionExplorer() {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [professorProfile, setProfessorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const currentLevel: Level = breadcrumbs.length === 0
    ? "institutions"
    : breadcrumbs.length === 1
      ? "courses"
      : breadcrumbs.length === 2
        ? "modules"
        : breadcrumbs.length === 3
          ? "groups"
          : "members";

  useEffect(() => {
    loadData();
  }, [breadcrumbs]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (currentLevel === "institutions") {
        const { data } = await supabase.from("institutions").select("*").order("name");
        // Count courses per institution
        const { data: allCourses } = await supabase.from("courses").select("id, institution_id");
        const courseCounts: Record<string, number> = {};
        (allCourses || []).forEach((c) => {
          courseCounts[c.institution_id] = (courseCounts[c.institution_id] || 0) + 1;
        });
        setInstitutions((data || []).map((i) => ({ ...i, courseCount: courseCounts[i.id] || 0 })));
      } else if (currentLevel === "courses") {
        const instId = breadcrumbs[0].id;
        const { data } = await supabase.from("courses").select("*").eq("institution_id", instId).order("name");
        // Count modules per course
        const courseIds = (data || []).map((c) => c.id);
        const { data: allModules } = await supabase.from("modules").select("id, course_id").in("course_id", courseIds.length ? courseIds : ["__none__"]);
        const moduleCounts: Record<string, number> = {};
        (allModules || []).forEach((m) => {
          if (m.course_id) moduleCounts[m.course_id] = (moduleCounts[m.course_id] || 0) + 1;
        });
        setCourses((data || []).map((c) => ({ ...c, moduleCount: moduleCounts[c.id] || 0 })));
      } else if (currentLevel === "modules") {
        const courseId = breadcrumbs[1].id;
        const { data } = await supabase.from("modules").select("*").eq("course_id", courseId).order("name");
        // Count groups per module
        const moduleIds = (data || []).map((m) => m.id);
        const { data: allGroups } = await supabase.from("groups").select("id, module_id").in("module_id", moduleIds.length ? moduleIds : ["__none__"]);
        const groupCounts: Record<string, number> = {};
        (allGroups || []).forEach((g) => {
          if (g.module_id) groupCounts[g.module_id] = (groupCounts[g.module_id] || 0) + 1;
        });
        setModules((data || []).map((m) => ({ ...m, groupCount: groupCounts[m.id] || 0 })));
      } else if (currentLevel === "groups") {
        const moduleId = breadcrumbs[2].id;
        const { data } = await supabase
          .from("groups")
          .select("*, profiles!groups_professor_id_profiles_fkey(full_name)")
          .eq("module_id", moduleId)
          .order("name");
        // Count members per group
        const groupIds = (data || []).map((g) => g.id);
        const { data: allMembers } = await supabase.from("group_members").select("id, group_id").in("group_id", groupIds.length ? groupIds : ["__none__"]);
        const memberCounts: Record<string, number> = {};
        (allMembers || []).forEach((m) => {
          memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1;
        });
        setGroups((data || []).map((g) => ({ ...g, memberCount: memberCounts[g.id] || 0 })));
      } else if (currentLevel === "members") {
        const groupId = breadcrumbs[3].id;
        // Fetch group to get professor
        const { data: group } = await supabase
          .from("groups")
          .select("*, profiles!groups_professor_id_profiles_fkey(full_name, user_id)")
          .eq("id", groupId)
          .single();
        setProfessorProfile(group?.profiles || null);
        // Fetch students
        const { data } = await supabase
          .from("group_members")
          .select("*, profiles(full_name, user_id)")
          .eq("group_id", groupId);
        setMembers(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (level: Level, id: string, label: string) => {
    setBreadcrumbs((prev) => [...prev, { level, id, label }]);
  };

  const navigateBack = () => {
    setBreadcrumbs((prev) => prev.slice(0, -1));
  };

  const navigateToBreadcrumb = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index));
  };

  const levelIcon = (level: Level) => {
    switch (level) {
      case "institutions": return <Building2 className="h-4 w-4" />;
      case "courses": return <BookOpen className="h-4 w-4" />;
      case "modules": return <FolderOpen className="h-4 w-4" />;
      case "groups": return <Users className="h-4 w-4" />;
      case "members": return <User className="h-4 w-4" />;
    }
  };

  const levelTitle = () => {
    switch (currentLevel) {
      case "institutions": return "Instituições";
      case "courses": return `Cursos de ${breadcrumbs[0]?.label}`;
      case "modules": return `Módulos de ${breadcrumbs[1]?.label}`;
      case "groups": return `Turmas de ${breadcrumbs[2]?.label}`;
      case "members": return `Membros de ${breadcrumbs[3]?.label}`;
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-wrap mb-6">
        <button
          onClick={() => navigateToBreadcrumb(0)}
          className={`flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1.5 transition-colors ${
            breadcrumbs.length === 0
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Instituições
        </button>
        {breadcrumbs.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <button
              onClick={() => navigateToBreadcrumb(i + 1)}
              className={`flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1.5 transition-colors ${
                i === breadcrumbs.length - 1
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {levelIcon(b.level)}
              {b.label}
            </button>
          </div>
        ))}
      </div>

      {/* Back button + title */}
      <div className="flex items-center gap-3 mb-5">
        {breadcrumbs.length > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h3 className="text-base font-semibold text-foreground">{levelTitle()}</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Institutions */}
          {currentLevel === "institutions" && (
            institutions.length === 0 ? (
              <EmptyState icon={<Building2 />} message="Nenhuma instituição cadastrada" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {institutions.map((inst) => (
                  <DrillCard
                    key={inst.id}
                    icon={<Building2 className="h-5 w-5" />}
                    title={inst.name}
                    subtitle={`${inst.courseCount} curso${inst.courseCount !== 1 ? "s" : ""}`}
                    onClick={() => navigateTo("courses", inst.id, inst.name)}
                  />
                ))}
              </div>
            )
          )}

          {/* Courses */}
          {currentLevel === "courses" && (
            courses.length === 0 ? (
              <EmptyState icon={<BookOpen />} message="Nenhum curso nesta instituição" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((c) => (
                  <DrillCard
                    key={c.id}
                    icon={<BookOpen className="h-5 w-5" />}
                    title={c.name}
                    subtitle={`${c.moduleCount} módulo${c.moduleCount !== 1 ? "s" : ""}`}
                    onClick={() => navigateTo("modules", c.id, c.name)}
                  />
                ))}
              </div>
            )
          )}

          {/* Modules */}
          {currentLevel === "modules" && (
            modules.length === 0 ? (
              <EmptyState icon={<FolderOpen />} message="Nenhum módulo neste curso" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((m) => (
                  <DrillCard
                    key={m.id}
                    icon={<FolderOpen className="h-5 w-5" />}
                    title={m.name}
                    subtitle={`${m.groupCount} turma${m.groupCount !== 1 ? "s" : ""}`}
                    onClick={() => navigateTo("groups", m.id, m.name)}
                  />
                ))}
              </div>
            )
          )}

          {/* Groups */}
          {currentLevel === "groups" && (
            groups.length === 0 ? (
              <EmptyState icon={<Users />} message="Nenhuma turma neste módulo" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((g) => (
                  <DrillCard
                    key={g.id}
                    icon={<Users className="h-5 w-5" />}
                    title={g.name}
                    subtitle={`Prof. ${(g.profiles as any)?.full_name || "—"} · ${g.memberCount} aluno${g.memberCount !== 1 ? "s" : ""}`}
                    onClick={() => navigateTo("members", g.id, g.name)}
                  />
                ))}
              </div>
            )
          )}

          {/* Members */}
          {currentLevel === "members" && (
            <div className="space-y-4 max-w-2xl">
              {/* Professor */}
              {professorProfile && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Professor Facilitador</h4>
                  <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{(professorProfile as any)?.full_name}</p>
                    <span className="ml-auto inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
                      Professor
                    </span>
                  </div>
                </div>
              )}

              {/* Students */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Alunos ({members.length})
                </h4>
                {members.length === 0 ? (
                  <EmptyState icon={<User />} message="Nenhum aluno nesta turma" />
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--clinical-success))]/10 text-[hsl(var(--clinical-success))]">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <p className="text-sm text-foreground">{(m.profiles as any)?.full_name}</p>
                        <span className="ml-auto inline-flex items-center rounded-full border border-[hsl(var(--clinical-success))]/20 bg-[hsl(var(--clinical-success))]/10 px-2.5 py-0.5 text-[10px] font-medium text-[hsl(var(--clinical-success))]">
                          Aluno
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DrillCard({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 text-left w-full"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
    </button>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
      <div className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50 flex items-center justify-center">{icon}</div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
