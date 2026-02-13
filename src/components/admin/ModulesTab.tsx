import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react";

interface Props {
  modules: any[];
  scenarios: any[];
  groups: any[];
  selectedCourseId: string;
  onRefresh: () => void;
}

export default function ModulesTab({ modules, scenarios, groups, selectedCourseId, onRefresh }: Props) {
  const [newModuleName, setNewModuleName] = useState("");
  const [editingModule, setEditingModule] = useState<any | null>(null);
  const [editModuleName, setEditModuleName] = useState("");
  const [saving, setSaving] = useState(false);

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
      onRefresh();
    }
  };

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
      <div className="clinical-card p-6 max-w-lg mb-8">
        <h3 className="mb-4 text-base font-semibold text-foreground">Criar Módulo</h3>
        <div className="flex gap-2">
          <Input placeholder="Ex: Cardiologia" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} />
          <Button onClick={createModule} disabled={!newModuleName.trim()}>
            <Plus className="mr-2 h-4 w-4" /> Criar
          </Button>
        </div>
      </div>

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
              <div key={m.id} className="group relative rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scenarioCount} cenário{scenarioCount !== 1 ? "s" : ""} · {groupCount} turma{groupCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => { setEditingModule(m); setEditModuleName(m.name); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteModule(m.id, m.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
