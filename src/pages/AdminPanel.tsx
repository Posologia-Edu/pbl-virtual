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
import { UserPlus, Users, Trash2, Plus, KeyRound, GraduationCap, BookOpen, ChevronDown, ChevronUp, User, Pencil, FileText, Sparkles, Send, Eye, Loader2, FolderOpen } from "lucide-react";

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
  const [newGroupModule, setNewGroupModule] = useState("");

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
  const [editGroupModule, setEditGroupModule] = useState("");

  // Modules
  const [modules, setModules] = useState<any[]>([]);
  const [newModuleName, setNewModuleName] = useState("");
  const [editingModule, setEditingModule] = useState<any | null>(null);
  const [editModuleName, setEditModuleName] = useState("");

  // Scenarios library
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioText, setScenarioText] = useState("");
  const [scenarioModuleId, setScenarioModuleId] = useState("");
  const [scenarioMode, setScenarioMode] = useState<"manual" | "ai">("manual");
  const [aiObjectives, setAiObjectives] = useState("");
  const [generatingScenario, setGeneratingScenario] = useState(false);
  const [aiGlossary, setAiGlossary] = useState<any[]>([]);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [editingScenario, setEditingScenario] = useState<any | null>(null);
  const [editScenarioTitle, setEditScenarioTitle] = useState("");
  const [editScenarioContent, setEditScenarioContent] = useState("");
  const [editScenarioModuleId, setEditScenarioModuleId] = useState("");

  // Release scenario
  const [rooms, setRooms] = useState<any[]>([]);
  const [releasingScenario, setReleasingScenario] = useState(false);
  const [releaseScenarioId, setReleaseScenarioId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [profilesRes, rolesRes, groupsRes, roomsRes, modulesRes, scenariosRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      supabase.from("groups").select("*, profiles!groups_professor_id_profiles_fkey(full_name)"),
      supabase.from("rooms").select("*"),
      supabase.from("modules").select("*").order("created_at", { ascending: false }),
      supabase.from("scenarios").select("*, modules(name)").order("created_at", { ascending: false }),
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
    if (modulesRes.data) setModules(modulesRes.data);
    if (scenariosRes.data) setScenarios(scenariosRes.data);
  };

  // ── User CRUD ──
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

  // ── Group CRUD ──
  const createGroup = async () => {
    if (!newGroupName || !newGroupProfessor) return;
    const { error } = await supabase.from("groups").insert({
      name: newGroupName,
      professor_id: newGroupProfessor,
      module_id: newGroupModule || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Turma criada!" });
      setNewGroupName(""); setNewGroupProfessor(""); setNewGroupModule("");
      fetchAll();
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
      fetchAll();
    }
    setSaving(false);
  };

  const deleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a turma "${name}"? Todos os vínculos de alunos serão removidos.`)) return;
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

  // ── Module CRUD ──
  const createModule = async () => {
    if (!newModuleName.trim()) return;
    const { error } = await supabase.from("modules").insert({ name: newModuleName.trim() });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Módulo criado!" });
      setNewModuleName("");
      fetchAll();
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
      fetchAll();
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
      fetchAll();
    }
  };

  // ── Scenario CRUD ──
  const saveScenario = async () => {
    if (!scenarioTitle.trim() || !scenarioText.trim()) return;
    const { error } = await supabase.from("scenarios").insert({
      title: scenarioTitle.trim(),
      content: scenarioText.trim(),
      module_id: scenarioModuleId || null,
      tutor_glossary: aiGlossary.length > 0 ? aiGlossary : null,
      tutor_questions: aiQuestions.length > 0 ? aiQuestions : null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cenário salvo na biblioteca!" });
      setScenarioTitle(""); setScenarioText(""); setScenarioModuleId("");
      setAiGlossary([]); setAiQuestions([]); setAiObjectives("");
      fetchAll();
    }
  };

  const updateScenario = async () => {
    if (!editingScenario) return;
    setSaving(true);
    const { error } = await supabase.from("scenarios").update({
      title: editScenarioTitle.trim(),
      content: editScenarioContent.trim(),
      module_id: editScenarioModuleId || null,
    }).eq("id", editingScenario.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cenário atualizado!" });
      setEditingScenario(null);
      fetchAll();
    }
    setSaving(false);
  };

  const deleteScenario = async (id: string, title: string) => {
    if (!confirm(`Excluir cenário "${title}"?`)) return;
    const { error } = await supabase.from("scenarios").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cenário excluído!" });
      fetchAll();
    }
  };

  const releaseScenarioToRooms = async (scenario: any) => {
    setReleasingScenario(true);
    try {
      const activeRooms = rooms.filter(r => r.status === "active");
      const updates = activeRooms.map((r) =>
        supabase.from("rooms").update({
          scenario: scenario.content,
          is_scenario_visible_to_professor: true,
          is_scenario_released: false,
          tutor_glossary: scenario.tutor_glossary || null,
          tutor_questions: scenario.tutor_questions || null,
        }).eq("id", r.id)
      );
      await Promise.all(updates);
      toast({ title: "Cenário liberado!", description: `Enviado para ${activeRooms.length} sala(s). Professores podem visualizar.` });
      setReleaseScenarioId(null);
      fetchAll();
    } catch {
      toast({ title: "Erro", description: "Falha ao liberar cenário.", variant: "destructive" });
    }
    setReleasingScenario(false);
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

  const getModuleName = (moduleId: string | null) => {
    if (!moduleId) return null;
    return modules.find(m => m.id === moduleId)?.name || null;
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Administração</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie usuários, papéis, turmas, módulos e cenários</p>
        </div>

        <Tabs defaultValue="users" className="animate-fade-in">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="users"><UserPlus className="mr-2 h-4 w-4" /> Cadastrar</TabsTrigger>
            <TabsTrigger value="groups"><Users className="mr-2 h-4 w-4" /> Turmas</TabsTrigger>
            <TabsTrigger value="modules"><FolderOpen className="mr-2 h-4 w-4" /> Módulos</TabsTrigger>
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
                <div className="space-y-2">
                  <Label>Módulo</Label>
                  <Select value={newGroupModule} onValueChange={setNewGroupModule}>
                    <SelectTrigger><SelectValue placeholder="Selecionar módulo (opcional)" /></SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
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
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => { setEditingGroup(group); setEditGroupName(group.name); setEditGroupProfessor(group.professor_id); setEditGroupModule(group.module_id || ""); }}
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

          {/* ═══════ MÓDULOS ═══════ */}
          <TabsContent value="modules">
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
              Módulos Cadastrados <span className="ml-2 text-xs font-normal text-muted-foreground">({modules.length})</span>
            </h3>
            {modules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
                <FolderOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhum módulo criado ainda</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((m) => {
                  const scenarioCount = scenarios.filter(s => s.module_id === m.id).length;
                  const groupCount = groups.filter(g => g.module_id === m.id).length;
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
          </TabsContent>

          {/* ═══════ CENÁRIOS ═══════ */}
          <TabsContent value="scenarios">
            <div className="max-w-3xl space-y-6">
              {/* Create scenario */}
              <div className="clinical-card p-6">
                <h3 className="mb-4 text-base font-semibold text-foreground">Criar Cenário Clínico</h3>
                <div className="flex gap-2 mb-4">
                  <Button variant={scenarioMode === "manual" ? "default" : "outline"} size="sm" onClick={() => setScenarioMode("manual")}>
                    <Pencil className="mr-2 h-4 w-4" /> Inserir Manualmente
                  </Button>
                  <Button variant={scenarioMode === "ai" ? "default" : "outline"} size="sm" onClick={() => setScenarioMode("ai")}>
                    <Sparkles className="mr-2 h-4 w-4" /> Gerar com IA
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título do Cenário</Label>
                      <Input placeholder="Ex: Caso Hipertensão Arterial" value={scenarioTitle} onChange={(e) => setScenarioTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Módulo</Label>
                      <Select value={scenarioModuleId} onValueChange={setScenarioModuleId}>
                        <SelectTrigger><SelectValue placeholder="Associar a um módulo (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {modules.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {scenarioMode === "manual" ? (
                    <div className="space-y-2">
                      <Label>Texto do Problema / Caso Clínico</Label>
                      <Textarea
                        placeholder="Cole ou escreva o cenário clínico aqui..."
                        value={scenarioText}
                        onChange={(e) => setScenarioText(e.target.value)}
                        className="min-h-[200px]"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Objetivos de Aprendizagem</Label>
                        <Textarea
                          placeholder="Liste os objetivos de aprendizagem. Ex:&#10;- Compreender a fisiopatologia da hipertensão arterial&#10;- Identificar fatores de risco cardiovascular"
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
                              toast({ title: "Cenário gerado!", description: "Revise o texto antes de salvar." });
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
                    </>
                  )}

                  {/* AI extras preview */}
                  {aiGlossary.length > 0 && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <h4 className="mb-2 text-sm font-semibold text-primary">📖 Glossário do Tutor</h4>
                      <div className="space-y-1">
                        {aiGlossary.map((g: any, i: number) => (
                          <p key={i} className="text-xs text-foreground/70"><strong>{g.term}:</strong> {g.definition}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiQuestions.length > 0 && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <h4 className="mb-2 text-sm font-semibold text-primary">❓ Perguntas Socráticas</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {aiQuestions.map((q: string, i: number) => (
                          <li key={i} className="text-xs text-foreground/70">{q}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <Button onClick={saveScenario} disabled={!scenarioTitle.trim() || !scenarioText.trim()}>
                    <Plus className="mr-2 h-4 w-4" /> Salvar Cenário na Biblioteca
                  </Button>
                </div>
              </div>

              {/* Scenario library */}
              <div>
                <h3 className="mb-4 text-base font-semibold text-foreground">
                  Biblioteca de Cenários <span className="ml-2 text-xs font-normal text-muted-foreground">({scenarios.length})</span>
                </h3>
                {scenarios.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
                    <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Nenhum cenário salvo ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scenarios.map((s) => (
                      <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{s.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(s.modules as any)?.name ? <span className="text-primary">{(s.modules as any).name}</span> : "Sem módulo"}
                              {" · "}{s.content.length} caracteres
                              {s.tutor_glossary && " · Com glossário"}
                              {s.tutor_questions && " · Com perguntas"}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2">{s.content}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                              title="Liberar para turmas"
                              onClick={() => setReleaseScenarioId(s.id)}>
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => { setEditingScenario(s); setEditScenarioTitle(s.title); setEditScenarioContent(s.content); setEditScenarioModuleId(s.module_id || ""); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteScenario(s.id, s.title)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

        {/* ═══════ EDIT GROUP DIALOG ═══════ */}
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
                    {professors.map((p) => (
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
                    {modules.map((m) => (
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

        {/* ═══════ EDIT MODULE DIALOG ═══════ */}
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

        {/* ═══════ EDIT SCENARIO DIALOG ═══════ */}
        <Dialog open={!!editingScenario} onOpenChange={(open) => !open && setEditingScenario(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Editar Cenário</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={editScenarioTitle} onChange={(e) => setEditScenarioTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Módulo</Label>
                  <Select value={editScenarioModuleId} onValueChange={setEditScenarioModuleId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar módulo (opcional)" /></SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea value={editScenarioContent} onChange={(e) => setEditScenarioContent(e.target.value)} className="min-h-[200px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingScenario(null)}>Cancelar</Button>
              <Button onClick={updateScenario} disabled={saving || !editScenarioTitle.trim() || !editScenarioContent.trim()}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════ RELEASE SCENARIO DIALOG ═══════ */}
        <Dialog open={!!releaseScenarioId} onOpenChange={(open) => !open && setReleaseScenarioId(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Liberar Cenário para Turmas</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              O cenário será enviado para todas as salas ativas. Apenas os <strong>professores</strong> poderão visualizá-lo inicialmente.
            </p>
            <div className="my-4 space-y-2">
              {rooms.filter(r => r.status === "active").map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-2">
                  <span className="text-sm text-foreground">{r.name}</span>
                  {r.scenario ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {r.is_scenario_released ? "Visível p/ alunos" : r.is_scenario_visible_to_professor ? "Visível p/ professor" : "Com cenário"}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Sem cenário</span>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReleaseScenarioId(null)}>Cancelar</Button>
              <Button
                onClick={() => {
                  const sc = scenarios.find(s => s.id === releaseScenarioId);
                  if (sc) releaseScenarioToRooms(sc);
                }}
                disabled={releasingScenario}
              >
                {releasingScenario ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Liberando...</> : <><Send className="mr-2 h-4 w-4" /> Liberar para Professores</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
