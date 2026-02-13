import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Users, Trash2, Plus, KeyRound, GraduationCap, BookOpen, ChevronDown, ChevronUp, User, Pencil, FileText, Sparkles, Send, Eye, Loader2 } from "lucide-react";

export default function AdminPanel() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({});

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("");
  const [creating, setCreating] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupProfessor, setNewGroupProfessor] = useState("");

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [addStudentUserId, setAddStudentUserId] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Edit user dialog
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit group dialog
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupProfessor, setEditGroupProfessor] = useState("");

  // Scenario management
  const [rooms, setRooms] = useState<any[]>([]);
  const [scenarioText, setScenarioText] = useState("");
  const [scenarioMode, setScenarioMode] = useState<"manual" | "ai">("manual");
  const [aiObjectives, setAiObjectives] = useState("");
  const [generatingScenario, setGeneratingScenario] = useState(false);
  const [aiGlossary, setAiGlossary] = useState<any[]>([]);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [releasingScenario, setReleasingScenario] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [profilesRes, rolesRes, groupsRes, roomsRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("groups").select("*, profiles(full_name)"),
      supabase.from("rooms").select("*"),
    ]);
    if (profilesRes.data) {
      const rolesMap: Record<string, any[]> = {};
      (rolesRes.data || []).forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r);
      });
      const merged = profilesRes.data.map((p: any) => ({
        ...p,
        user_roles: rolesMap[p.user_id] || [],
      }));
      setProfiles(merged);
    }

    if (groupsRes.data) {
      setGroups(groupsRes.data);
      const membersMap: Record<string, any[]> = {};
      for (const g of groupsRes.data) {
        const { data } = await supabase
          .from("group_members")
          .select("*, profiles(full_name)")
          .eq("group_id", g.id);
        membersMap[g.id] = data || [];
      }
      setGroupMembers(membersMap);
    }

    if (roomsRes.data) setRooms(roomsRes.data);
  };

  const createUser = async () => {
    if (!newUserEmail || !newUserRole || !newUserName) return;
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "create_user", email: newUserEmail, full_name: newUserName, role: newUserRole },
      });
      if (res.error || res.data?.error) {
        toast({ title: "Erro", description: res.data?.error || res.error?.message, variant: "destructive" });
      } else {
        toast({ title: "Usuário criado!", description: `${newUserName} cadastrado como ${newUserRole}.` });
        setNewUserName(""); setNewUserEmail(""); setNewUserRole("");
        fetchAll();
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
        fetchAll();
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
      fetchAll();
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "change_password", new_password: newPassword },
      });
      if (res.error || res.data?.error) {
        toast({ title: "Erro", description: res.data?.error || res.error?.message, variant: "destructive" });
      } else {
        toast({ title: "Senha alterada com sucesso!" });
        setNewPassword(""); setConfirmPassword("");
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao alterar senha.", variant: "destructive" });
    }
    setChangingPassword(false);
  };

  const createGroup = async () => {
    if (!newGroupName || !newGroupProfessor) return;
    const { error } = await supabase.from("groups").insert({ name: newGroupName, professor_id: newGroupProfessor });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Turma criada!" });
      setNewGroupName(""); setNewGroupProfessor("");
      fetchAll();
    }
  };

  const updateGroup = async () => {
    if (!editingGroup) return;
    setSaving(true);
    const { error } = await supabase.from("groups").update({
      name: editGroupName,
      professor_id: editGroupProfessor,
    }).eq("id", editingGroup.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Turma atualizada!" });
      setEditingGroup(null);
      fetchAll();
    }
    setSaving(false);
  };

  const deleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a turma "${name}"? Todos os vínculos de alunos serão removidos.`)) return;
    // Delete members first, then group
    await supabase.from("group_members").delete().eq("group_id", groupId);
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Turma excluída!" });
      if (expandedGroupId === groupId) setExpandedGroupId(null);
      fetchAll();
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
      fetchAll();
    }
  };

  const removeStudentFromGroup = async (memberId: string) => {
    const { error } = await supabase.from("group_members").delete().eq("id", memberId);
    if (!error) fetchAll();
  };

  const professors = profiles.filter((p) => p.user_roles?.some((r: any) => r.role === "professor"));
  const students = profiles.filter((p) => p.user_roles?.some((r: any) => r.role === "student"));

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

  return (
    <Layout>
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Administração</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie usuários, papéis e turmas</p>
        </div>

        <Tabs defaultValue="users" className="animate-fade-in">
          <TabsList className="mb-6">
            <TabsTrigger value="users"><UserPlus className="mr-2 h-4 w-4" /> Cadastrar</TabsTrigger>
            <TabsTrigger value="groups"><Users className="mr-2 h-4 w-4" /> Turmas</TabsTrigger>
            <TabsTrigger value="scenarios"><FileText className="mr-2 h-4 w-4" /> Cenários</TabsTrigger>
            <TabsTrigger value="security"><KeyRound className="mr-2 h-4 w-4" /> Segurança</TabsTrigger>
          </TabsList>

          {/* ═══════ CADASTRAR ═══════ */}
          <TabsContent value="users">
            <div className="clinical-card p-6 max-w-lg mb-8">
              <h3 className="mb-4 text-base font-semibold text-foreground">Cadastrar Novo Usuário</h3>
              <p className="text-xs text-muted-foreground mb-4">Crie contas de alunos e professores.</p>
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

            {/* User cards */}
            <div>
              <h3 className="mb-4 text-base font-semibold text-foreground">
                Usuários Cadastrados <span className="ml-2 text-xs font-normal text-muted-foreground">({profiles.length})</span>
              </h3>
              {profiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {profiles.map((p) => {
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
                          {/* Edit / Delete buttons (hidden for admin) */}
                          {!isAdmin && (
                            <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => { setEditingUser(p); setEditName(p.full_name); setEditEmail(""); setEditRole(primaryRole); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteUser(p.user_id, p.full_name)}
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
              )}
            </div>
          </TabsContent>

          {/* ═══════ TURMAS ═══════ */}
          <TabsContent value="groups">
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
                      {professors.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createGroup} disabled={!newGroupName || !newGroupProfessor}>
                  <Plus className="mr-2 h-4 w-4" /> Criar Turma
                </Button>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-base font-semibold text-foreground">
                Turmas Criadas <span className="ml-2 text-xs font-normal text-muted-foreground">({groups.length})</span>
              </h3>
              {groups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Nenhuma turma criada ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => {
                    const isExpanded = expandedGroupId === group.id;
                    const members = groupMembers[group.id] || [];
                    const memberIds = members.map((m: any) => m.student_id);
                    const availableStudents = students.filter((s) => !memberIds.includes(s.user_id));

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
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => { setEditingGroup(group); setEditGroupName(group.name); setEditGroupProfessor(group.professor_id); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteGroup(group.id, group.name)}
                            >
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
            </div>
          </TabsContent>

          {/* ═══════ CENÁRIOS ═══════ */}
          <TabsContent value="scenarios">
            <div className="max-w-3xl space-y-6">
              {/* Mode selector */}
              <div className="clinical-card p-6">
                <h3 className="mb-4 text-base font-semibold text-foreground">Criar Cenário Clínico</h3>
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={scenarioMode === "manual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setScenarioMode("manual")}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Inserir Manualmente
                  </Button>
                  <Button
                    variant={scenarioMode === "ai" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setScenarioMode("ai")}
                  >
                    <Sparkles className="mr-2 h-4 w-4" /> Gerar com IA
                  </Button>
                </div>

                {scenarioMode === "manual" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Texto do Problema / Caso Clínico</Label>
                      <Textarea
                        placeholder="Cole ou escreva o cenário clínico aqui..."
                        value={scenarioText}
                        onChange={(e) => setScenarioText(e.target.value)}
                        className="min-h-[200px]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Objetivos de Aprendizagem</Label>
                      <Textarea
                        placeholder="Liste os objetivos de aprendizagem. Ex:&#10;- Compreender a fisiopatologia da hipertensão arterial&#10;- Identificar fatores de risco cardiovascular&#10;- Conhecer as classes de anti-hipertensivos"
                        value={aiObjectives}
                        onChange={(e) => setAiObjectives(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        if (!aiObjectives.trim()) return;
                        setGeneratingScenario(true);
                        try {
                          const { data, error } = await supabase.functions.invoke("generate-scenario", {
                            body: { objectives: aiObjectives },
                          });
                          if (error || data?.error) {
                            toast({ title: "Erro", description: data?.error || error?.message, variant: "destructive" });
                          } else {
                            setScenarioText(data.scenario || "");
                            setAiGlossary(data.glossary || []);
                            setAiQuestions(data.questions || []);
                            toast({ title: "Cenário gerado!", description: "Revise o texto antes de liberar." });
                          }
                        } catch {
                          toast({ title: "Erro", description: "Falha ao gerar cenário.", variant: "destructive" });
                        }
                        setGeneratingScenario(false);
                      }}
                      disabled={generatingScenario || !aiObjectives.trim()}
                    >
                      {generatingScenario ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                      ) : (
                        <><Sparkles className="mr-2 h-4 w-4" /> Gerar Cenário</>
                      )}
                    </Button>

                    {scenarioText && (
                      <div className="space-y-2">
                        <Label>Cenário Gerado (editável)</Label>
                        <Textarea
                          value={scenarioText}
                          onChange={(e) => setScenarioText(e.target.value)}
                          className="min-h-[200px]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI extras preview */}
              {aiGlossary.length > 0 && (
                <div className="clinical-card border-primary/20 p-5">
                  <h4 className="mb-2 text-sm font-semibold text-primary">📖 Glossário do Tutor (visível apenas para professores)</h4>
                  <div className="space-y-1">
                    {aiGlossary.map((g: any, i: number) => (
                      <p key={i} className="text-xs text-foreground/70">
                        <strong>{g.term}:</strong> {g.definition}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {aiQuestions.length > 0 && (
                <div className="clinical-card border-primary/20 p-5">
                  <h4 className="mb-2 text-sm font-semibold text-primary">❓ Perguntas Socráticas (visível apenas para professores)</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {aiQuestions.map((q: string, i: number) => (
                      <li key={i} className="text-xs text-foreground/70">{q}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Release to all rooms */}
              {scenarioText.trim() && (
                <div className="clinical-card p-6">
                  <h3 className="mb-3 text-base font-semibold text-foreground">Liberar Cenário para Turmas</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    O cenário será enviado para todas as salas ativas. Apenas os <strong>professores</strong> poderão visualizá-lo inicialmente. Cada professor decidirá quando liberar para seus alunos.
                  </p>

                  {/* Room status */}
                  <div className="mb-4 space-y-2">
                    {rooms.filter(r => r.status === "active").map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-2">
                        <span className="text-sm text-foreground">{r.name}</span>
                        <div className="flex items-center gap-2">
                          {r.scenario ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {r.is_scenario_released ? "Visível p/ alunos" : r.is_scenario_visible_to_professor ? "Visível p/ professor" : "Com cenário"}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Sem cenário</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={async () => {
                      setReleasingScenario(true);
                      try {
                        const activeRooms = rooms.filter(r => r.status === "active");
                        const updates = activeRooms.map((r) =>
                          supabase.from("rooms").update({
                            scenario: scenarioText.trim(),
                            is_scenario_visible_to_professor: true,
                            is_scenario_released: false,
                            tutor_glossary: aiGlossary.length > 0 ? aiGlossary : null,
                            tutor_questions: aiQuestions.length > 0 ? aiQuestions : null,
                          }).eq("id", r.id)
                        );
                        await Promise.all(updates);
                        toast({ title: "Cenário liberado!", description: `Enviado para ${activeRooms.length} sala(s). Professores podem visualizar.` });
                        fetchAll();
                      } catch {
                        toast({ title: "Erro", description: "Falha ao liberar cenário.", variant: "destructive" });
                      }
                      setReleasingScenario(false);
                    }}
                    disabled={releasingScenario}
                  >
                    {releasingScenario ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Liberando...</>
                    ) : (
                      <><Send className="mr-2 h-4 w-4" /> Liberar para Professores</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════ SEGURANÇA ═══════ */}
          <TabsContent value="security">
            <div className="clinical-card p-6 max-w-lg">
              <h3 className="mb-4 text-base font-semibold text-foreground">Alterar Senha do Administrador</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input type="password" placeholder="Repita a senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <Button onClick={changePassword} disabled={changingPassword || !newPassword || !confirmPassword}>
                  <KeyRound className="mr-2 h-4 w-4" />{changingPassword ? "Alterando..." : "Alterar Senha"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ═══════ EDIT USER DIALOG ═══════ */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
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

        {/* ═══════ EDIT GROUP DIALOG ═══════ */}
        <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Turma</DialogTitle>
            </DialogHeader>
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
                    {professors.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
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
    </Layout>
  );
}
