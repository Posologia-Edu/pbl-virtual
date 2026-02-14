import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Users, DoorOpen, BookOpen, GraduationCap,
} from "lucide-react";
import CreateRoomDialog from "@/components/CreateRoomDialog";

export default function Dashboard() {
  const { user, isAdmin, isProfessor, isStudent, profile } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [roomsRes, groupsRes] = await Promise.all([
        supabase.from("rooms").select("*, groups(name)").eq("status", "active").order("created_at", { ascending: false }),
        isProfessor || isAdmin
          ? supabase.from("groups").select("*").order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      if (roomsRes.data) setRooms(roomsRes.data);
      if (groupsRes.data) setGroups(groupsRes.data as any[]);
    };
    fetchData();
  }, [user, isProfessor, isAdmin]);

  const stats = [
    { label: "Salas Ativas", value: rooms.length, icon: DoorOpen, color: "text-primary" },
    { label: "Turmas", value: groups.length, icon: Users, color: "text-accent" },
  ];

  return (
    <Layout>
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {profile?.full_name?.split(" ")[0] || "Usuário"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isProfessor ? "Gerencie suas sessões PBL" : isAdmin ? "Painel administrativo" : "Suas sessões de aprendizagem"}
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="clinical-card p-5 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
          {isProfessor && (
            <div
              onClick={() => setShowCreateRoom(true)}
              className="clinical-card flex cursor-pointer items-center justify-center gap-3 border-dashed p-5 transition-colors hover:border-primary/40 hover:bg-clinical-highlight animate-fade-in"
            >
              <Plus className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Nova Sala</span>
            </div>
          )}
        </div>

        {/* Active rooms grouped by turma */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Salas Ativas</h2>
          {rooms.length === 0 ? (
            <div className="clinical-card flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma sala ativa no momento</p>
              {isProfessor && (
                <Button variant="outline" className="mt-4" onClick={() => setShowCreateRoom(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Criar Sala
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(
                rooms.reduce<Record<string, any[]>>((acc, room) => {
                  const groupName = (room.groups as any)?.name || "Sem turma";
                  if (!acc[groupName]) acc[groupName] = [];
                  acc[groupName].push(room);
                  return acc;
                }, {})
              ).map(([groupName, groupRooms]) => (
                <div key={groupName} className="animate-fade-in">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{groupName}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {groupRooms.length} {groupRooms.length === 1 ? "sala" : "salas"}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {groupRooms.map((room: any) => (
                      <div
                        key={room.id}
                        onClick={() => navigate(`/session/${room.id}`)}
                        className="group clinical-card cursor-pointer p-4 transition-all hover:shadow-md hover:border-primary/30"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <DoorOpen className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-medium text-primary">Passo {room.current_step}</span>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            room.is_scenario_released
                              ? "bg-[hsl(var(--clinical-success))]/10 text-[hsl(var(--clinical-success))]"
                              : room.scenario
                                ? "bg-[hsl(var(--clinical-warning))]/10 text-[hsl(var(--clinical-warning))]"
                                : "bg-muted text-muted-foreground"
                          }`}>
                            {room.is_scenario_released ? "Cenário visível" : room.scenario ? "Cenário oculto" : "Sem cenário"}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {room.name}
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {room.status === "active" ? "Em andamento" : "Encerrada"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateRoom && (
        <CreateRoomDialog
          groups={groups}
          onClose={() => setShowCreateRoom(false)}
          onCreated={(room) => {
            setRooms((prev) => [room, ...prev]);
            setShowCreateRoom(false);
            toast({ title: "Sala criada com sucesso!" });
          }}
        />
      )}
    </Layout>
  );
}
