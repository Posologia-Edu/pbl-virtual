import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";

interface Props {
  courses: any[];
  institutions: any[];
  onRefresh: () => void;
}

export default function CoursesTab({ courses, institutions, onRefresh }: Props) {
  const [name, setName] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editInstitutionId, setEditInstitutionId] = useState("");
  const [saving, setSaving] = useState(false);

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
      onRefresh();
    }
  };

  const getInstitutionName = (id: string) => institutions.find((i) => i.id === id)?.name || "—";

  return (
    <div>
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
                    .map((c) => (
                      <div
                        key={c.id}
                        className="group relative rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-medium text-foreground truncate pt-1">{c.name}</p>
                          </div>
                          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => {
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
                              onClick={() => remove(c.id, c.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
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
