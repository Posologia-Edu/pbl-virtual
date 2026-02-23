import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, BookOpen, ArrowLeft, FolderOpen, Users, FileText, GraduationCap, User } from "lucide-react";

interface Props {
  courses: any[];
  institutions: any[];
  modules: any[];
  groups: any[];
  groupMembers: Record<string, any[]>;
  profiles: any[];
  courseMembers: any[];
  scenarios: any[];
  onRefresh: () => void;
  readOnly?: boolean;
}

export default function CoursesTab({ courses, institutions, modules, groups, groupMembers, profiles, courseMembers, scenarios, onRefresh, readOnly }: Props) {
  const [name, setName] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editInstitutionId, setEditInstitutionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim() || !institutionId) return;
    const { error } = await supabase.from("courses").insert({ name: name.trim(), institution_id: institutionId });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Curso criado!" });
      setName("");
      setInstitutionId("");
      onRefresh();
    }
  };

  const update = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from("courses").update({ name: editName.trim(), institution_id: editInstitutionId }).eq("id", editing.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Curso atualizado!" });
      setEditing(null);
      onRefresh();
    }
    setSaving(false);
  };

  const remove = async (id: string, n: string) => {
    if (!confirm(`Excluir curso "${n}"? Todos os vínculos serão removidos.`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Curso excluído!" });
      if (selectedCourseId === id) setSelectedCourseId(null);
      onRefresh();
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // Detail view for a selected course
  if (selectedCourse) {
    const institution = institutions.find((i) => i.id === selectedCourse.institution_id);
    const courseModules = modules.filter((m) => m.course_id === selectedCourseId);
    const courseGroups = groups.filter((g) => g.course_id === selectedCourseId);
    const courseMemberIds = courseMembers.filter((cm) => cm.course_id === selectedCourseId).map((cm) => cm.user_id);
    const courseProfessors = profiles.filter((p) => courseMemberIds.includes(p.user_id) && p.user_roles?.some((r: any) => r.role === "professor"));
    const courseStudents = profiles.filter((p) => courseMemberIds.includes(p.user_id) && p.user_roles?.some((r: any) => r.role === "student"));
    const courseScenarios = scenarios.filter((s) => s.course_id === selectedCourseId);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCourseId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {institution && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{institution.name}</p>
            )}
            <h2 className="text-lg font-semibold text-foreground">{selectedCourse.name}</h2>
          </div>
        </div>

        {/* Modules */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Módulos</h3>
            <span className="text-xs text-muted-foreground">({courseModules.length})</span>
          </div>
          {courseModules.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Nenhum módulo cadastrado</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {courseModules.map((m) => {
                const sc = scenarios.filter((s) => s.module_id === m.id).length;
                const gc = groups.filter((g) => g.module_id === m.id).length;
                return (
                  <div key={m.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sc} cenário{sc !== 1 ? "s" : ""} · {gc} turma{gc !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Groups */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Turmas</h3>
            <span className="text-xs text-muted-foreground">({courseGroups.length})</span>
          </div>
          {courseGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Nenhuma turma cadastrada</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {courseGroups.map((g) => {
                const members = groupMembers[g.id] || [];
                const moduleName = modules.find((m) => m.id === g.module_id)?.name;
                return (
                  <div key={g.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <p className="text-sm font-medium text-foreground">{g.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Prof. {(g.profiles as any)?.full_name || "—"} · {members.length} aluno{members.length !== 1 ? "s" : ""}
                      {moduleName && <> · <span className="text-primary">{moduleName}</span></>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Professors */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Professores</h3>
            <span className="text-xs text-muted-foreground">({courseProfessors.length})</span>
          </div>
          {courseProfessors.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Nenhum professor vinculado</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {courseProfessors.map((p) => (
                <div key={p.user_id} className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GraduationCap className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-foreground truncate">{p.full_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <User className="h-4 w-4 text-[hsl(var(--clinical-success))]" />
            <h3 className="text-sm font-semibold text-foreground">Alunos</h3>
            <span className="text-xs text-muted-foreground">({courseStudents.length})</span>
          </div>
          {courseStudents.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Nenhum aluno vinculado</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {courseStudents.map((p) => (
                <div key={p.user_id} className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--clinical-success))]/10 text-[hsl(var(--clinical-success))]">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm text-foreground truncate">{p.full_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scenarios */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Cenários</h3>
            <span className="text-xs text-muted-foreground">({courseScenarios.length})</span>
          </div>
          {courseScenarios.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Nenhum cenário cadastrado</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {courseScenarios.map((s) => (
                <div key={s.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      {!readOnly && (
      <div className="clinical-card p-6 max-w-lg mb-8">
        <h3 className="mb-4 text-base font-semibold text-foreground">Cadastrar Curso</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Instituição</Label>
            <Select value={institutionId} onValueChange={setInstitutionId}>
              <SelectTrigger><SelectValue placeholder="Selecionar instituição" /></SelectTrigger>
              <SelectContent>
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome do Curso</Label>
            <Input placeholder="Ex: Medicina" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={create} disabled={!name.trim() || !institutionId}>
            <Plus className="mr-2 h-4 w-4" /> Criar Curso
          </Button>
        </div>
      </div>
      )}

      <h3 className="mb-4 text-base font-semibold text-foreground">
        Cursos Cadastrados <span className="ml-2 text-xs font-normal text-muted-foreground">({courses.length})</span>
      </h3>
      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhum curso cadastrado ainda</p>
        </div>
      ) : (
        <div className="space-y-6">
          {institutions
            .filter((inst) => courses.some((c) => c.institution_id === inst.id))
            .map((inst) => (
              <div key={inst.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h4 className="text-sm font-semibold text-foreground">{inst.name}</h4>
                  <span className="text-xs text-muted-foreground">
                    ({courses.filter((c) => c.institution_id === inst.id).length})
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {courses
                    .filter((c) => c.institution_id === inst.id)
                    .map((c) => {
                      const modCount = modules.filter((m) => m.course_id === c.id).length;
                      const grpCount = groups.filter((g) => g.course_id === c.id).length;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCourseId(c.id)}
                          className="group relative cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <BookOpen className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {modCount} módulo{modCount !== 1 ? "s" : ""} · {grpCount} turma{grpCount !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                            {!readOnly && (
                            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditing(c);
                                  setEditName(c.name);
                                  setEditInstitutionId(c.institution_id);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  remove(c.id, c.name);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Curso</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Instituição</Label>
              <Select value={editInstitutionId} onValueChange={setEditInstitutionId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do Curso</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={update} disabled={saving || !editName.trim() || !editInstitutionId}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
