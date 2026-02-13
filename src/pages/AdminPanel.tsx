import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, Trash2, Plus, Shield } from "lucide-react";

export default function AdminPanel() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({});

  // Role assignment
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  // Group creation
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupProfessor, setNewGroupProfessor] = useState("");

  // Add student to group
  const [addStudentGroupId, setAddStudentGroupId] = useState("");
  const [addStudentUserId, setAddStudentUserId] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [profilesRes, groupsRes] = await Promise.all([
      supabase.from("profiles").select("*, user_roles(role)"),
      supabase.from("groups").select("*, profiles!groups_professor_id_fkey(full_name)"),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (groupsRes.data) {
      setGroups(groupsRes.data);
      // fetch members for each group
      const membersMap: Record<string, any[]> = {};
      for (const g of groupsRes.data) {
        const { data } = await supabase
          .from("group_members")
          .select("*, profiles!group_members_student_id_fkey(full_name)")
          .eq("group_id", g.id);
        membersMap[g.id] = data || [];
      }
      setGroupMembers(membersMap);
    }
  };

  const assignRole = async () => {
    if (!selectedUserId || !selectedRole) return;
    const { error } = await supabase.from("user_roles").insert({
      user_id: selectedUserId,
      role: selectedRole as any,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Papel atribuído com sucesso!" });
      setSelectedUserId("");
      setSelectedRole("");
      fetchAll();
    }
  };

  const createGroup = async () => {
    if (!newGroupName || !newGroupProfessor) return;
    const { error } = await supabase.from("groups").insert({
      name: newGroupName,
      professor_id: newGroupProfessor,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Turma criada!" });
      setNewGroupName("");
      setNewGroupProfessor("");
      fetchAll();
    }
  };

  const addStudentToGroup = async () => {
    if (!addStudentGroupId || !addStudentUserId) return;
    const { error } = await supabase.from("group_members").insert({
      group_id: addStudentGroupId,
      student_id: addStudentUserId,
    });
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

  const professors = profiles.filter((p) =>
    p.user_roles?.some((r: any) => r.role === "professor")
  );
  const students = profiles.filter((p) =>
    p.user_roles?.some((r: any) => r.role === "student")
  );

  return (
    <Layout>
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Administração</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie usuários, papéis e turmas</p>
        </div>

        <Tabs defaultValue="roles" className="animate-fade-in">
          <TabsList className="mb-6">
            <TabsTrigger value="roles">
              <Shield className="mr-2 h-4 w-4" /> Papéis
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Users className="mr-2 h-4 w-4" /> Turmas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <div className="clinical-card p-6 max-w-lg">
              <h3 className="mb-4 text-base font-semibold text-foreground">Atribuir Papel</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.full_name} ({p.user_roles?.map((r: any) => r.role).join(", ") || "sem papel"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Papel</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger><SelectValue placeholder="Selecionar papel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="professor">Professor</SelectItem>
                      <SelectItem value="student">Aluno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={assignRole} disabled={!selectedUserId || !selectedRole}>
                  <UserPlus className="mr-2 h-4 w-4" /> Atribuir
                </Button>
              </div>
            </div>

            {/* User list */}
            <div className="mt-6 clinical-card p-6">
              <h3 className="mb-4 text-base font-semibold text-foreground">Usuários Cadastrados</h3>
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.user_roles?.map((r: any) => r.role).join(", ") || "Sem papel"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="groups">
            {/* Create group */}
            <div className="clinical-card p-6 max-w-lg mb-6">
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

            {/* Groups list */}
            {groups.map((group) => (
              <div key={group.id} className="clinical-card p-6 mb-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{group.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Prof. {(group.profiles as any)?.full_name || "—"}
                    </p>
                  </div>
                </div>

                {/* Add student */}
                <div className="mb-3 flex gap-2">
                  <Select
                    value={addStudentGroupId === group.id ? addStudentUserId : ""}
                    onValueChange={(v) => { setAddStudentGroupId(group.id); setAddStudentUserId(v); }}
                  >
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Adicionar aluno..." /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => { setAddStudentGroupId(group.id); addStudentToGroup(); }}
                    disabled={addStudentGroupId !== group.id || !addStudentUserId}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Members */}
                <div className="space-y-1">
                  {(groupMembers[group.id] || []).map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                      <span className="text-sm text-foreground">{(m.profiles as any)?.full_name}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeStudentFromGroup(m.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(groupMembers[group.id] || []).length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum aluno nesta turma</p>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
