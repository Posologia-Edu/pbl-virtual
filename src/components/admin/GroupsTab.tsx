import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  groups: any[];
  groupMembers: Record<string, any[]>;
  profiles: any[];
  modules: any[];
  courseMembers: any[];
  selectedCourseId: string;
  onRefresh: () => void;
}

export default function GroupsTab({ groups, groupMembers, profiles, modules, courseMembers, selectedCourseId, onRefresh }: Props) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupProfessor, setNewGroupProfessor] = useState("");
  const [newGroupModule, setNewGroupModule] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [addStudentUserId, setAddStudentUserId] = useState("");

  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupProfessor, setEditGroupProfessor] = useState("");
  const [editGroupModule, setEditGroupModule] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter by course
  const filteredGroups = selectedCourseId
    ? groups.filter((g) => g.course_id === selectedCourseId)
    : groups;

  const filteredModules = selectedCourseId
    ? modules.filter((m) => m.course_id === selectedCourseId)
    : modules;

  const courseMemberIds = courseMembers
    .filter((cm) => cm.course_id === selectedCourseId)
    .map((cm) => cm.user_id);

  const allProfessors = profiles.filter(
    (p) => p.user_roles?.some((r: any) => r.role === "professor") &&
      (!selectedCourseId || courseMemberIds.includes(p.user_id))
  );

  // Professors already assigned to a group in a given module
  const getProfessorsUsedInModule = (moduleId: string | null) => {
    if (!moduleId) return [];
    return filteredGroups
      .filter((g) => g.module_id === moduleId)
      .map((g) => g.professor_id);
  };

  // Available professors for creation (exclude those already in the selected module)
  const availableProfessorsForCreate = allProfessors.filter(
    (p) => !getProfessorsUsedInModule(newGroupModule).includes(p.user_id)
  );

  // Available professors for editing (exclude those in the same module, but keep the current one)
  const getAvailableProfessorsForEdit = (moduleId: string | null, currentProfessorId: string) => {
    const usedIds = getProfessorsUsedInModule(moduleId);
    return allProfessors.filter(
      (p) => p.user_id === currentProfessorId || !usedIds.includes(p.user_id)
    );
  };

  const students = profiles.filter(
    (p) => p.user_roles?.some((r: any) => r.role === "student") &&
      (!selectedCourseId || courseMemberIds.includes(p.user_id))
  );

  const createGroup = async () => {
    if (!newGroupName || !newGroupProfessor) return;
    const { error } = await supabase.from("groups").insert({
      name: newGroupName,
      professor_id: newGroupProfessor,
      module_id: newGroupModule || null,
      course_id: selectedCourseId || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Turma criada!" });
      setNewGroupName(""); setNewGroupProfessor(""); setNewGroupModule("");
      onRefresh();
    }
  };

  const updateGroup = async () => {
    if (!editingGroup) return;
    setSaving(true);
    const { error } = await supabase.from("groups").update({
      name: editGroupName,
      professor_id: editGroupProfessor,
      module_id: editGroupModule || null,
    }).eq("id", editingGroup.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Turma atualizada!" });
      setEditingGroup(null);
      onRefresh();
    }
    setSaving(false);
  };

  const deleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`Excluir turma "${name}"?`)) return;
    await supabase.from("group_members").delete().eq("group_id", groupId);
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Turma excluída!" });
      if (expandedGroupId === groupId) setExpandedGroupId(null);
      onRefresh();
    }
  };

  const addStudentToGroup = async (groupId: string) => {
    if (!addStudentUserId) return;
    const { error } = await supabase.from("group_members").insert({ group_id: groupId, student_id: addStudentUserId });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Aluno adicionado!" });
      setAddStudentUserId("");
      onRefresh();
    }
  };

  const removeStudentFromGroup = async (memberId: string) => {
    const { error } = await supabase.from("group_members").delete().eq("id", memberId);
    if (!error) onRefresh();
  };

  const getModuleName = (moduleId: string | null) => {
    if (!moduleId) return null;
    return modules.find((m) => m.id === moduleId)?.name || null;
  };

  if (!selectedCourseId) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Selecione uma instituição e curso acima para gerenciar as turmas.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="clinical-card p-6 max-w-lg mb-8">
        <h3 className="mb-4 text-base font-semibold text-foreground">Criar Turma</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Turma</Label>
            <Input placeholder="Ex: Medicina Turma A" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Professor Facilitador</Label>
            <Select value={newGroupProfessor} onValueChange={setNewGroupProfessor}>
              <SelectTrigger><SelectValue placeholder="Selecionar professor" /></SelectTrigger>
              <SelectContent>
                {availableProfessorsForCreate.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Todos os professores já estão alocados neste módulo</div>
                ) : (
                  availableProfessorsForCreate.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Módulo</Label>
            <Select value={newGroupModule} onValueChange={(val) => {
              setNewGroupModule(val);
              // Reset professor if they're no longer available in this module
              if (val && getProfessorsUsedInModule(val).includes(newGroupProfessor)) {
                setNewGroupProfessor("");
              }
            }}>
              <SelectTrigger><SelectValue placeholder="Selecionar módulo (opcional)" /></SelectTrigger>
              <SelectContent>
                {filteredModules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createGroup} disabled={!newGroupName || !newGroupProfessor}>
            <Plus className="mr-2 h-4 w-4" /> Criar Turma
          </Button>
        </div>
      </div>

      <h3 className="mb-4 text-base font-semibold text-foreground">
        Turmas do Curso <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredGroups.length})</span>
      </h3>
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhuma turma criada neste curso</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroupId === group.id;
            const members = groupMembers[group.id] || [];
            const memberIds = members.map((m: any) => m.student_id);
            const availableStudents = students.filter((s) => !memberIds.includes(s.user_id));
            const moduleName = getModuleName(group.module_id);

            return (
              <div key={group.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all">
                <div className="flex items-center justify-between p-5">
                  <button
                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                    className="flex flex-1 items-center gap-3 text-left hover:opacity-80 transition-opacity"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Prof. {(group.profiles as any)?.full_name || "—"} · {members.length} aluno{members.length !== 1 ? "s" : ""}
                        {moduleName && <> · <span className="text-primary">{moduleName}</span></>}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => { setEditingGroup(group); setEditGroupName(group.name); setEditGroupProfessor(group.professor_id); setEditGroupModule(group.module_id || ""); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteGroup(group.id, group.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <button onClick={() => setExpandedGroupId(isExpanded ? null : group.id)} className="ml-1 p-1">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-5">
                    <div className="mb-4 flex gap-2">
                      <Select value={addStudentUserId} onValueChange={setAddStudentUserId}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar aluno para adicionar..." /></SelectTrigger>
                        <SelectContent>
                          {availableStudents.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">Todos os alunos já estão nesta turma</div>
                          ) : (
                            availableStudents.map((s) => (
                              <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => addStudentToGroup(group.id)} disabled={!addStudentUserId}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {members.length === 0 ? (
                      <p className="text-center py-4 text-xs text-muted-foreground">Nenhum aluno nesta turma.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {members.map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between rounded-xl bg-card border border-border px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--clinical-success))]/10 text-[hsl(var(--clinical-success))]">
                                <BookOpen className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-sm text-foreground">{(m.profiles as any)?.full_name}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeStudentFromGroup(m.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Turma</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Turma</Label>
              <Input value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Professor Facilitador</Label>
              <Select value={editGroupProfessor} onValueChange={setEditGroupProfessor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getAvailableProfessorsForEdit(editGroupModule, editingGroup?.professor_id).map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select value={editGroupModule} onValueChange={setEditGroupModule}>
                <SelectTrigger><SelectValue placeholder="Selecionar módulo (opcional)" /></SelectTrigger>
                <SelectContent>
                  {filteredModules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>Cancelar</Button>
            <Button onClick={updateGroup} disabled={saving || !editGroupName || !editGroupProfessor}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
