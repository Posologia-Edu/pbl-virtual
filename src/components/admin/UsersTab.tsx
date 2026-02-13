import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Users, Pencil, Trash2, User, GraduationCap, BookOpen } from "lucide-react";

interface Props {
  profiles: any[];
  courseMembers: any[];
  selectedCourseId: string;
  onRefresh: () => void;
}

export default function UsersTab({ profiles, courseMembers, selectedCourseId, onRefresh }: Props) {
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter profiles to show only course members when a course is selected
  const courseMemberIds = courseMembers
    .filter((cm) => cm.course_id === selectedCourseId)
    .map((cm) => cm.user_id);

  const filteredProfiles = selectedCourseId
    ? profiles.filter((p) => courseMemberIds.includes(p.user_id))
    : profiles;

  const createUser = async () => {
    if (!newUserEmail || !newUserRole || !newUserName) return;
    if (!selectedCourseId) {
      toast({ title: "Erro", description: "Selecione um curso antes de cadastrar.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "create_user", email: newUserEmail, full_name: newUserName, role: newUserRole },
      });
      if (res.error || res.data?.error) {
        toast({ title: "Erro", description: res.data?.error || res.error?.message, variant: "destructive" });
      } else {
        // Link user to course
        const userId = res.data?.user_id;
        if (userId && selectedCourseId) {
          await supabase.from("course_members").upsert({ course_id: selectedCourseId, user_id: userId }, { onConflict: "course_id,user_id" });
        }
        toast({ title: "Usuário criado e vinculado ao curso!" });
        setNewUserName(""); setNewUserEmail(""); setNewUserRole("");
        onRefresh();
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao criar usuário.", variant: "destructive" });
    }
    setCreating(false);
  };

  const updateUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "update_user", user_id: editingUser.user_id, full_name: editName, email: editEmail, role: editRole },
      });
      if (res.error || res.data?.error) {
        toast({ title: "Erro", description: res.data?.error || res.error?.message, variant: "destructive" });
      } else {
        toast({ title: "Usuário atualizado!" });
        setEditingUser(null);
        onRefresh();
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao atualizar.", variant: "destructive" });
    }
    setSaving(false);
  };

  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    const res = await supabase.functions.invoke("manage-users", {
      body: { action: "delete_user", user_id: userId },
    });
    if (res.error || res.data?.error) {
      toast({ title: "Erro", description: res.data?.error || res.error?.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário excluído!" });
      onRefresh();
    }
  };

  const removeFromCourse = async (userId: string, name: string) => {
    if (!confirm(`Remover "${name}" deste curso?`)) return;
    const { error } = await supabase.from("course_members").delete().eq("course_id", selectedCourseId).eq("user_id", userId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário removido do curso!" });
      onRefresh();
    }
  };

  const roleLabel = (role: string) => {
    switch (role) { case "admin": return "Administrador"; case "professor": return "Professor"; case "student": return "Aluno"; default: return role; }
  };
  const roleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-destructive/10 text-destructive border-destructive/20";
      case "professor": return "bg-primary/10 text-primary border-primary/20";
      case "student": return "bg-[hsl(var(--clinical-success))]/10 text-[hsl(var(--clinical-success))] border-[hsl(var(--clinical-success))]/20";
      default: return "bg-muted text-muted-foreground";
    }
  };
  const RoleIcon = ({ role }: { role: string }) => {
    switch (role) { case "professor": return <GraduationCap className="h-4 w-4" />; case "student": return <BookOpen className="h-4 w-4" />; default: return <User className="h-4 w-4" />; }
  };

  if (!selectedCourseId) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Selecione uma instituição e curso acima para gerenciar os usuários.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="clinical-card p-6 max-w-lg mb-8">
        <h3 className="mb-4 text-base font-semibold text-foreground">Cadastrar Novo Usuário</h3>
        <p className="text-xs text-muted-foreground mb-4">O usuário será vinculado ao curso selecionado.</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input placeholder="Nome do usuário" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="email@exemplo.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={newUserRole} onValueChange={setNewUserRole}>
              <SelectTrigger><SelectValue placeholder="Selecionar papel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professor">Professor</SelectItem>
                <SelectItem value="student">Aluno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createUser} disabled={creating || !newUserName || !newUserEmail || !newUserRole}>
            <UserPlus className="mr-2 h-4 w-4" />{creating ? "Criando..." : "Cadastrar Usuário"}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">
          Usuários do Curso <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredProfiles.length})</span>
        </h3>
        {filteredProfiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhum usuário vinculado a este curso</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((p) => {
              const primaryRole = p.user_roles?.[0]?.role || "unknown";
              const isAdmin = p.user_roles?.some((r: any) => r.role === "admin");
              return (
                <div key={p.id} className="group relative rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <RoleIcon role={primaryRole} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{p.full_name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {p.user_roles?.map((r: any, i: number) => (
                          <span key={i} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${roleColor(r.role)}`}>
                            {roleLabel(r.role)}
                          </span>
                        ))}
                      </div>
                    </div>
                    {!isAdmin && (
                      <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => { setEditingUser(p); setEditName(p.full_name); setEditEmail(""); setEditRole(primaryRole); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Remover do curso"
                          onClick={() => removeFromCourse(p.user_id, p.full_name)}>
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
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="Novo email (deixe vazio para manter)" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="student">Aluno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={updateUser} disabled={saving || !editName || !editRole}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
