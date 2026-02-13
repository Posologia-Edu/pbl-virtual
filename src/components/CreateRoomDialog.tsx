import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  groups: any[];
  onClose: () => void;
  onCreated: (room: any) => void;
}

export default function CreateRoomDialog({ groups, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groupId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("rooms")
      .insert({ name, group_id: groupId, professor_id: user.id })
      .select("*, groups(name)")
      .single();

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao criar sala", description: error.message, variant: "destructive" });
    } else if (data) {
      onCreated(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div className="clinical-card-elevated w-full max-w-md p-6 animate-fade-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Nova Sala PBL</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Sessão</Label>
            <Input placeholder="Ex: Caso Clínico — Cardiologia" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Turma</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || !groupId}>
              {loading ? "Criando..." : "Criar Sala"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
