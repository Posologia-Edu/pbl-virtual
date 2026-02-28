import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Users, Pencil, Trash2, User, GraduationCap, BookOpen, Building2, EyeOff, Eye, AlertTriangle, Upload } from "lucide-react";

interface SubscriptionLimits {
  max_students: number | null;
  max_rooms: number | null;
}

interface Props {
  profiles: any[];
  courseMembers: any[];
  selectedCourseId: string;
  selectedInstitutionId: string;
  institutions: any[];
  courses: any[];
  onRefresh: () => void;
  readOnly?: boolean;
  subscription?: SubscriptionLimits | null;
}

export default function UsersTab({ profiles, courseMembers, selectedCourseId, selectedInstitutionId, institutions, courses, onRefresh, readOnly, subscription }: Props) {
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("");
  const [creating, setCreating] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchRole, setBatchRole] = useState("");
  const [batchCreating, setBatchCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Count students across all courses of the institution for limit check
  const allInstitutionCourseIds = courses
    .filter((c) => c.institution_id === selectedInstitutionId)
    .map((c) => c.id);
  const uniqueStudentIds = new Set(
    courseMembers
      .filter((cm) => allInstitutionCourseIds.includes(cm.course_id))
      .map((cm) => cm.user_id)
      .filter((uid) => profiles.some((p) => p.user_id === uid && p.user_roles?.some((r: any) => r.role === "student")))
  );
  const studentCount = uniqueStudentIds.size;
  const maxStudents = subscription?.max_students ?? null;
  const studentLimitReached = maxStudents !== null && maxStudents < 99999 && studentCount >= maxStudents;
  const studentLimitNear = maxStudents !== null && maxStudents < 99999 && studentCount >= maxStudents * 0.8 && !studentLimitReached;

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
    // Enforce student limit
    if (newUserRole === "student" && studentLimitReached) {
      toast({
        title: "Limite de alunos atingido",
        description: `Seu plano permite no máximo ${maxStudents} alunos. Faça upgrade para cadastrar mais.`,
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "create_user", email: newUserEmail, full_name: newUserName, role: newUserRole, course_id: selectedCourseId },
      });
      if (res.error) {
        // Try to extract the detailed error message from the edge function response
        let errorMsg = "Falha ao criar usuário.";
        try {
          if (res.error.context?.body) {
            const text = await new Response(res.error.context.body).text();
            const parsed = JSON.parse(text);
            if (parsed.error) errorMsg = parsed.error;
          } else if (res.data?.error) {
            errorMsg = res.data.error;
          } else if (res.error.message) {
            errorMsg = res.error.message;
          }
        } catch {}
        toast({ title: "Erro", description: errorMsg, variant: "destructive" });
      } else if (res.data?.error) {
        toast({ title: "Erro", description: res.data.error, variant: "destructive" });
      } else {
        // Link user to course
        const userId = res.data?.user_id;
        if (userId && selectedCourseId) {
          await supabase.from("course_members").upsert({ course_id: selectedCourseId, user_id: userId }, { onConflict: "course_id,user_id" });
        }
        const note = res.data?.note;
        toast({ title: note ? "Usuário vinculado ao curso!" : "Usuário criado e vinculado ao curso!", description: note || undefined });
        setNewUserName(""); setNewUserEmail(""); setNewUserRole("");
        onRefresh();
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao criar usuário.", variant: "destructive" });
    }
    setCreating(false);
  };

  const parseBatchLines = (text: string): { name: string; email: string }[] => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Support: "Name, email" or "Name; email" or "Name\temail"
        const parts = line.split(/[,;\t]+/).map((p) => p.trim());
        if (parts.length >= 2) {
          const emailPart = parts.find((p) => p.includes("@"));
          const namePart = parts.filter((p) => p !== emailPart).join(" ");
          return { name: namePart || parts[0], email: emailPart || parts[1] };
        }
        // If only one part and it's an email, use email prefix as name
        if (line.includes("@")) return { name: line.split("@")[0], email: line };
        return { name: "", email: "" };
      })
      .filter((u) => u.name && u.email && u.email.includes("@"));
  };

  const createBatchUsers = async () => {
    if (!batchText.trim() || !batchRole || !selectedCourseId) {
      toast({ title: "Erro", description: "Preencha todos os campos e selecione um curso.", variant: "destructive" });
      return;
    }
    const users = parseBatchLines(batchText);
    if (users.length === 0) {
      toast({ title: "Erro", description: "Nenhum usuário válido encontrado. Use o formato: Nome, email@exemplo.com", variant: "destructive" });
      return;
    }

    setBatchCreating(true);
    let created = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const u of users) {
      try {
        const res = await supabase.functions.invoke("manage-users", {
          body: { action: "create_user", email: u.email, full_name: u.name, role: batchRole, course_id: selectedCourseId },
        });
        if (res.error || res.data?.error) {
          errors++;
          errorMessages.push(`${u.email}: ${res.data?.error || res.error?.message || "Erro"}`);
        } else {
          const userId = res.data?.user_id;
          if (userId && selectedCourseId) {
            await supabase.from("course_members").upsert({ course_id: selectedCourseId, user_id: userId }, { onConflict: "course_id,user_id" });
          }
          created++;
        }
      } catch {
        errors++;
        errorMessages.push(`${u.email}: Erro de rede`);
      }
    }

    if (created > 0) {
      toast({ title: `${created} usuário(s) cadastrado(s)!`, description: errors > 0 ? `${errors} falha(s)` : undefined });
      setBatchText("");
      onRefresh();
    }
    if (errors > 0 && created === 0) {
      toast({ title: "Falha no cadastro em lote", description: errorMessages.slice(0, 3).join("\n"), variant: "destructive" });
    }
    setBatchCreating(false);
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
      toast({ title: "Erro", description: "Falha ao remover usuário do curso.", variant: "destructive" });
    } else {
      toast({ title: "Usuário removido do curso!" });
      onRefresh();
    }
  };

  const toggleHidden = async (userId: string, currentlyHidden: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_hidden: !currentlyHidden }).eq("user_id", userId);
    if (error) {
      toast({ title: "Erro", description: "Falha ao alterar visibilidade do usuário.", variant: "destructive" });
    } else {
      toast({ title: !currentlyHidden ? "Usuário ocultado!" : "Usuário reativado!" });
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
      {!readOnly && (
      <div className="clinical-card p-6 max-w-lg mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            {batchMode ? "Cadastro em Lote" : "Cadastrar Novo Usuário"}
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setBatchMode(!batchMode)} className="gap-1.5 text-xs">
            {batchMode ? <UserPlus className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
            {batchMode ? "Individual" : "Em Lote"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {batchMode
            ? "Cole uma lista com um usuário por linha no formato: Nome Completo, email@exemplo.com"
            : "O usuário será vinculado ao curso selecionado."}
        </p>

        {/* Student limit banner */}
        {studentLimitReached && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Limite de alunos atingido</p>
                <p className="text-xs text-destructive/80 mt-1">
                  Seu plano permite no máximo <strong>{maxStudents}</strong> alunos ({studentCount} cadastrados). Faça upgrade para cadastrar mais.
                </p>
              </div>
            </div>
          </div>
        )}
        {studentLimitNear && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Próximo do limite de alunos</p>
                <p className="text-xs text-amber-700 mt-1">
                  {studentCount} de {maxStudents} alunos cadastrados.
                </p>
              </div>
            </div>
          </div>
        )}

        {batchMode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={batchRole} onValueChange={setBatchRole}>
                <SelectTrigger><SelectValue placeholder="Selecionar papel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professor">Professor</SelectItem>
                  <SelectItem value="student">Aluno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lista de Usuários</Label>
              <Textarea
                placeholder={"João Silva, joao@email.com\nMaria Santos, maria@email.com\nCarlos Lima, carlos@email.com"}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Formato: <code>Nome Completo, email</code> — um por linha. Também aceita separação por <code>;</code> ou <code>tab</code>.
              </p>
            </div>
            <Button onClick={createBatchUsers} disabled={batchCreating || !batchText.trim() || !batchRole || (batchRole === "student" && studentLimitReached)}>
              <Upload className="mr-2 h-4 w-4" />{batchCreating ? "Cadastrando..." : "Cadastrar em Lote"}
            </Button>
          </div>
        ) : (
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
            <Button onClick={createUser} disabled={creating || !newUserName || !newUserEmail || !newUserRole || (newUserRole === "student" && studentLimitReached)}>
              <UserPlus className="mr-2 h-4 w-4" />{creating ? "Criando..." : "Cadastrar Usuário"}
            </Button>
          </div>
        )}
      </div>
      )}

      <div>
        {(() => {
          const institution = institutions.find((i) => i.id === selectedInstitutionId);
          const course = courses.find((c) => c.id === selectedCourseId);
          return (
            <div className="mb-5">
              {institution && (
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{institution.name}</span>
                </div>
              )}
              <h3 className="text-base font-semibold text-foreground">
                {course?.name || "Curso"} <span className="ml-1 text-xs font-normal text-muted-foreground">({filteredProfiles.length} usuários)</span>
              </h3>
            </div>
          );
        })()}
        {filteredProfiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhum usuário vinculado a este curso</p>
          </div>
        ) : (
          <div className="space-y-6">
            {[
              { key: "professor", label: "Professores", icon: <GraduationCap className="h-4 w-4" /> },
              { key: "student", label: "Alunos", icon: <BookOpen className="h-4 w-4" /> },
              { key: "admin", label: "Administradores", icon: <User className="h-4 w-4" /> },
            ]
              .map((section) => {
                const users = filteredProfiles.filter(
                  (p) => (p.user_roles?.[0]?.role || "unknown") === section.key
                );
                if (users.length === 0) return null;
                return (
                  <div key={section.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md ${
                        section.key === "professor" ? "bg-primary/10 text-primary" :
                        section.key === "student" ? "bg-[hsl(var(--clinical-success))]/10 text-[hsl(var(--clinical-success))]" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {section.icon}
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">{section.label}</h4>
                      <span className="text-xs text-muted-foreground">({users.length})</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {users.map((p) => {
                        const primaryRole = p.user_roles?.[0]?.role || "unknown";
                        const isAdmin = p.user_roles?.some((r: any) => r.role === "admin");
                        return (
                          <div key={p.id} className={`group relative rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${p.is_hidden ? "border-destructive/30 bg-destructive/5 opacity-60" : "border-border bg-card hover:border-primary/30"}`}>
                            <div className="flex items-start gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                primaryRole === "professor" ? "bg-primary/10 text-primary" :
                                primaryRole === "student" ? "bg-[hsl(var(--clinical-success))]/10 text-[hsl(var(--clinical-success))]" :
                                "bg-destructive/10 text-destructive"
                              }`}>
                                <RoleIcon role={primaryRole} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {p.full_name}
                                  {p.is_hidden && <span className="ml-1.5 text-[10px] text-destructive font-semibold">(Oculto)</span>}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {p.user_roles?.map((r: any, i: number) => (
                                    <span key={i} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${roleColor(r.role)}`}>
                                      {roleLabel(r.role)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {!isAdmin && !readOnly && (
                                <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className={`h-7 w-7 ${p.is_hidden ? "text-destructive" : "text-muted-foreground hover:text-amber-600"}`}
                                    title={p.is_hidden ? "Reativar usuário" : "Ocultar usuário"}
                                    onClick={() => toggleHidden(p.user_id, p.is_hidden)}>
                                    {p.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => { setEditingUser(p); setEditName(p.full_name); setEditEmail(""); setEditRole(primaryRole); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
                  </div>
                );
              })
              .filter(Boolean)}
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
