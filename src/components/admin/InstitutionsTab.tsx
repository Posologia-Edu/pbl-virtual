import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";

interface Props {
  institutions: any[];
  onRefresh: () => void;
}

export default function InstitutionsTab({ institutions, onRefresh }: Props) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("institutions").insert({ name: name.trim() });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Instituição criada!" });
      setName("");
      onRefresh();
    }
  };

  const update = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from("institutions").update({ name: editName.trim() }).eq("id", editing.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Instituição atualizada!" });
      setEditing(null);
      onRefresh();
    }
    setSaving(false);
  };

  const remove = async (id: string, n: string) => {
    if (!confirm(`Excluir instituição "${n}"? Todos os cursos vinculados serão removidos.`)) return;
    const { error } = await supabase.from("institutions").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Instituição excluída!" });
      onRefresh();
    }
  };

  return (
    <div>
      <div className="clinical-card p-6 max-w-lg mb-8">
        <h3 className="mb-4 text-base font-semibold text-foreground">Cadastrar Instituição</h3>
        <div className="flex gap-2">
          <Input placeholder="Nome da instituição" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={create} disabled={!name.trim()}>
            <Plus className="mr-2 h-4 w-4" /> Criar
          </Button>
        </div>
      </div>

      <h3 className="mb-4 text-base font-semibold text-foreground">
        Instituições Cadastradas <span className="ml-2 text-xs font-normal text-muted-foreground">({institutions.length})</span>
      </h3>
      {institutions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Nenhuma instituição cadastrada ainda</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {institutions.map((inst) => (
            <div key={inst.id} className="group relative rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{inst.name}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => { setEditing(inst); setEditName(inst.name); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(inst.id, inst.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Instituição</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Instituição</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={update} disabled={saving || !editName.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
