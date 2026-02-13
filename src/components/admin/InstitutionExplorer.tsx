import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Building2, BookOpen, FolderOpen, Users, ChevronRight, ArrowLeft, GraduationCap, User, Eye, EyeOff, Plus } from "lucide-react";

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
  const [newName, setNewName] = useState("");

  const createInstitution = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("institutions").insert({ name: newName.trim() });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Instituição criada!" });
      setNewName("");
      loadData();
    }
  };

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
        const { data: allCourses } = await supabase.from("courses").select("id, institution_id");
        const courseCounts: Record<string, number> = {};
        (allCourses || []).forEach((c) => {
          courseCounts[c.institution_id] = (courseCounts[c.institution_id] || 0) + 1;
        });
        setInstitutions((data || []).map((i) => ({ ...i, courseCount: courseCounts[i.id] || 0 })));
      } else if (currentLevel === "courses") {
        const instId = breadcrumbs[0].id;
        const { data } = await supabase.from("courses").select("*").eq("institution_id", instId).order("name");
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
        const groupIds = (data || []).map((g) => g.id);
        const { data: allMembers } = await supabase.from("group_members").select("id, group_id").in("group_id", groupIds.length ? groupIds : ["__none__"]);
        const memberCounts: Record<string, number> = {};
        (allMembers || []).forEach((m) => {
          memberCounts[m.group_id] = (memberCounts[m.group_id] || 0) + 1;
        });
        setGroups((data || []).map((g) => ({ ...g, memberCount: memberCounts[g.id] || 0 })));
      } else if (currentLevel === "members") {
        const groupId = breadcrumbs[3].id;
        const { data: group } = await supabase
          .from("groups")
          .select("*, profiles!groups_professor_id_profiles_fkey(full_name, user_id, is_hidden)")
          .eq("id", groupId)
          .single();
        setProfessorProfile(group?.profiles || null);
        const { data } = await supabase
          .from("group_members")
          .select("*, profiles(full_name, user_id, is_hidden)")
          .eq("group_id", groupId);
        setMembers(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleHidden = async (table: "institutions" | "courses" | "modules" | "groups" | "scenarios", id: string, currentHidden: boolean) => {
    const { error } = await supabase.from(table).update({ is_hidden: !currentHidden } as any).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !currentHidden ? "Ocultado com sucesso" : "Reativado com sucesso" });
      loadData();
    }
  };

  const toggleProfileHidden = async (userId: string, currentHidden: boolean) => {
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userId).single();
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ is_hidden: !currentHidden }).eq("id", profile.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !currentHidden ? "Usuário ocultado" : "Usuário reativado" });
      loadData();
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
            <>
              <div className="clinical-card p-6 max-w-lg mb-6">
                <h4 className="mb-3 text-sm font-semibold text-foreground">Cadastrar Instituição</h4>
                <div className="flex gap-2">
                  <Input placeholder="Nome da instituição" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <Button onClick={createInstitution} disabled={!newName.trim()}>
                    <Plus className="mr-2 h-4 w-4" /> Criar
                  </Button>
                </div>
              </div>
              {institutions.length === 0 ? (
                <EmptyState icon={<Building2 />} message="Nenhuma instituição cadastrada" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {institutions.map((inst) => (
                    <DrillCard
                      key={inst.id}
                      icon={<Building2 className="h-5 w-5" />}
                      title={inst.name}
                      subtitle={`${inst.courseCount} curso${inst.courseCount !== 1 ? "s" : ""}`}
                      isHidden={inst.is_hidden}
                      onToggleHidden={(e) => { e.stopPropagation(); toggleHidden("institutions", inst.id, inst.is_hidden); }}
                      onClick={() => navigateTo("courses", inst.id, inst.name)}
                    />
                  ))}
                </div>
              )}
            </>
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
                    isHidden={c.is_hidden}
                    onToggleHidden={(e) => { e.stopPropagation(); toggleHidden("courses", c.id, c.is_hidden); }}
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
                    isHidden={m.is_hidden}
                    onToggleHidden={(e) => { e.stopPropagation(); toggleHidden("modules", m.id, m.is_hidden); }}
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
                    isHidden={g.is_hidden}
                    onToggleHidden={(e) => { e.stopPropagation(); toggleHidden("groups", g.id, g.is_hidden); }}
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
                  <div className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
                    (professorProfile as any)?.is_hidden
                      ? "border-destructive/20 bg-destructive/5 opacity-60"
                      : "border-primary/20 bg-primary/5"
                  }`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{(professorProfile as any)?.full_name}</p>
                      {(professorProfile as any)?.is_hidden && (
                        <p className="text-[10px] text-destructive font-medium mt-0.5">Ocultado</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${(professorProfile as any)?.is_hidden ? "text-destructive hover:text-destructive" : "text-muted-foreground hover:text-primary"}`}
                      title={(professorProfile as any)?.is_hidden ? "Reativar professor" : "Ocultar professor"}
                      onClick={() => toggleProfileHidden((professorProfile as any)?.user_id, (professorProfile as any)?.is_hidden)}
                    >
                      {(professorProfile as any)?.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">
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
                    {members.map((m) => {
                      const isHidden = (m.profiles as any)?.is_hidden;
                      return (
                        <div key={m.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                          isHidden
                            ? "border-destructive/20 bg-destructive/5 opacity-60"
                            : "border-border bg-card"
                        }`}>
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isHidden
                              ? "bg-destructive/10 text-destructive"
                              : "bg-[hsl(var(--clinical-success))]/10 text-[hsl(var(--clinical-success))]"
                          }`}>
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-foreground">{(m.profiles as any)?.full_name}</p>
                            {isHidden && (
                              <p className="text-[10px] text-destructive font-medium mt-0.5">Ocultado</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${isHidden ? "text-destructive hover:text-destructive" : "text-muted-foreground hover:text-primary"}`}
                            title={isHidden ? "Reativar aluno" : "Ocultar aluno"}
                            onClick={() => toggleProfileHidden((m.profiles as any)?.user_id, isHidden)}
                          >
                            {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                            isHidden
                              ? "border-destructive/20 bg-destructive/10 text-destructive"
                              : "border-[hsl(var(--clinical-success))]/20 bg-[hsl(var(--clinical-success))]/10 text-[hsl(var(--clinical-success))]"
                          }`}>
                            Aluno
                          </span>
                        </div>
                      );
                    })}
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

function DrillCard({ icon, title, subtitle, isHidden, onToggleHidden, onClick }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  isHidden?: boolean;
  onToggleHidden?: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md text-left w-full ${
        isHidden
          ? "border-destructive/20 bg-destructive/5 opacity-60 hover:border-destructive/30"
          : "border-border bg-card hover:border-primary/30"
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        isHidden ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
      }`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        {isHidden && <p className="text-[10px] text-destructive font-medium mt-0.5">Ocultado</p>}
      </div>
      {onToggleHidden && (
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
            isHidden ? "text-destructive hover:text-destructive" : "text-muted-foreground hover:text-primary"
          }`}
          title={isHidden ? "Reativar" : "Ocultar"}
          onClick={onToggleHidden}
        >
          {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      )}
      <ChevronRight className={`h-4 w-4 shrink-0 transition-colors ${
        isHidden ? "text-destructive/30" : "text-muted-foreground/50 group-hover:text-primary"
      }`} />
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
