import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FolderOpen, ArrowLeft, Users, FileText, GraduationCap, User } from "lucide-react";

interface Props {
  modules: any[];
  scenarios: any[];
  groups: any[];
  profiles: any[];
  groupMembers: Record<string, any[]>;
  selectedCourseId: string;
  onRefresh: () => void;
  readOnly?: boolean;
}

export default function ModulesTab({ modules, scenarios, groups, profiles, groupMembers, selectedCourseId, onRefresh, readOnly }: Props) {
  const [newModuleName, setNewModuleName] = useState("");
  const [editingModule, setEditingModule] = useState<any | null>(null);
  const [editModuleName, setEditModuleName] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const filteredModules = selectedCourseId
    ? modules.filter((m) => m.course_id === selectedCourseId)
    : modules;

  const createModule = async () => {
    if (!newModuleName.trim()) return;
    const { error } = await supabase.from("modules").insert({
      name: newModuleName.trim(),
      course_id: selectedCourseId || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Módulo criado!" });
      setNewModuleName("");
      onRefresh();
    }
  };

  const updateModule = async () => {
    if (!editingModule) return;
    setSaving(true);
    const { error } = await supabase.from("modules").update({ name: editModuleName.trim() }).eq("id", editingModule.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Módulo atualizado!" });
      setEditingModule(null);
      onRefresh();
    }
    setSaving(false);
  };

  const deleteModule = async (id: string, name: string) => {
    if (!confirm(`Excluir módulo "${name}"?`)) return;
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Módulo excluído!" });
      if (selectedModuleId === id) setSelectedModuleId(null);
      onRefresh();
    }
  };

  const selectedModule = filteredModules.find((m) => m.id === selectedModuleId);

  // Detail view for a selected module
  if (selectedModule) {
    const moduleGroups = groups.filter((g) => g.module_id === selectedModuleId);
    const moduleScenarios = scenarios.filter((s) => s.module_id === selectedModuleId);

    // Get unique professor IDs from groups in this module
    const professorIds = [...new Set(moduleGroups.map((g) => g.professor_id))];
    const moduleProfessors = profiles.filter((p) => professorIds.includes(p.user_id));

    // Get unique student IDs from group members in this module's groups
    const studentIds = new Set<string>();
    moduleGroups.forEach((g) => {
      const members = groupMembers[g.id] || [];
      members.forEach((m: any) => studentIds.add(m.student_id));
    });
    const moduleStudents = profiles.filter((p) => studentIds.has(p.user_id));

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedModuleId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Módulo</p>
            <h2 className="text-lg font-semibold text-foreground">{selectedModule.name}</h2>
          </div>
        </div>

        {/* Groups */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Turmas</h3>
            <span className="text-xs text-muted-foreground">({moduleGroups.length})</span>
          </div>
          {moduleGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Nenhuma turma vinculada a este módulo</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {moduleGroups.map((g) => {
                const members = groupMembers[g.id] || [];
                return (
                  <div key={g.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <p className="text-sm font-medium text-foreground">{g.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Prof. {(g.profiles as any)?.full_name || "—"} · {members.length} aluno{members.length !== 1 ? "s" : ""}
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
            <h3 className="text-sm font-semibold text-foreground">Professores Facilitadores</h3>
            <span className="text-xs text-muted-foreground">({moduleProfessors.length})</span>
          </div>
          {moduleProfessors.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Nenhum professor neste módulo</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {moduleProfessors.map((p) => (
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
            <span className="text-xs text-muted-foreground">({moduleStudents.length})</span>
          </div>
          {moduleStudents.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Nenhum aluno neste módulo</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {moduleStudents.map((p) => (
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
            <span className="text-xs text-muted-foreground">({moduleScenarios.length})</span>
          </div>
          {moduleScenarios.length === 0 ? (
            <p className="text-xs text-muted-foreground pl-6">Nenhum cenário vinculado a este módulo</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {moduleScenarios.map((s) => (
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
  if (!selectedCourseId) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
        <FolderOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Selecione uma instituição e curso acima para gerenciar os módulos.</p>
      </div>
    );
  }

  return (
    <div>
      {!readOnly && (
      <div className="clinical-card p-6 max-w-lg mb-8">
        <h3 className="mb-4 text-base font-semibold text-foreground">Criar Módulo</h3>
        <div className="flex gap-2">
          <Input placeholder="Ex: Cardiologia" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} />
          <Button onClick={createModule} disabled={!newModuleName.trim()}>
            <Plus className="mr-2 h-4 w-4" /> Criar
          </Button>
        </div>
      </div>
      )}

      <h3 className="mb-4 text-base font-semibold text-foreground">
        Módulos do Curso <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredModules.length})</span>
      </h3>
      {filteredModules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <FolderOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhum módulo criado neste curso</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map((m) => {
            const scenarioCount = scenarios.filter((s) => s.module_id === m.id).length;
            const groupCount = groups.filter((g) => g.module_id === m.id).length;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedModuleId(m.id)}
                className="group relative cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scenarioCount} cenário{scenarioCount !== 1 ? "s" : ""} · {groupCount} turma{groupCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {!readOnly && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={(e) => { e.stopPropagation(); setEditingModule(m); setEditModuleName(m.name); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteModule(m.id, m.name); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editingModule} onOpenChange={(open) => !open && setEditingModule(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Módulo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Módulo</Label>
              <Input value={editModuleName} onChange={(e) => setEditModuleName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingModule(null)}>Cancelar</Button>
            <Button onClick={updateModule} disabled={saving || !editModuleName.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
