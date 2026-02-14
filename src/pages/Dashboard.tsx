import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Users, DoorOpen, BookOpen, ChevronRight, Activity, Layers, GraduationCap,
} from "lucide-react";
import CreateRoomDialog from "@/components/CreateRoomDialog";
import { Badge } from "@/components/ui/badge";

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

  const grouped = rooms.reduce<Record<string, any[]>>((acc, room) => {
    const groupName = (room.groups as any)?.name || "Sem turma";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(room);
    return acc;
  }, {});

  const groupEntries = Object.entries(grouped);

  const getScenarioStatus = (room: any) => {
    if (room.is_scenario_released) return { label: "Cenário visível", variant: "success" as const };
    if (room.scenario) return { label: "Cenário oculto", variant: "warning" as const };
    return { label: "Sem cenário", variant: "neutral" as const };
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        {/* Hero Header */}
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.04] to-transparent px-6 py-8 lg:px-10 lg:py-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-1">
                  {isProfessor ? "Professor" : isAdmin ? "Administrador" : "Estudante"}
                </p>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  Olá, {profile?.full_name?.split(" ")[0] || "Usuário"} 👋
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {isProfessor ? "Gerencie suas sessões PBL e acompanhe o progresso das turmas" : isAdmin ? "Visão geral do painel administrativo" : "Acompanhe suas sessões de aprendizagem"}
                </p>
              </div>
              {isProfessor && (
                <Button
                  onClick={() => setShowCreateRoom(true)}
                  className="rounded-xl shadow-sm gap-2 self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  Nova Sala
                </Button>
              )}
            </div>

            {/* Stats Row */}
            <div className="mt-6 flex flex-wrap gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5 rounded-xl bg-card border border-border/60 px-4 py-2.5 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground leading-tight">{rooms.length}</p>
                  <p className="text-[11px] text-muted-foreground">Salas Ativas</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-card border border-border/60 px-4 py-2.5 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <Layers className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground leading-tight">{groupEntries.length}</p>
                  <p className="text-[11px] text-muted-foreground">Turmas com Salas</p>
                </div>
              </div>
              {(isProfessor || isAdmin) && (
                <div className="flex items-center gap-2.5 rounded-xl bg-card border border-border/60 px-4 py-2.5 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-tight">{groups.length}</p>
                    <p className="text-[11px] text-muted-foreground">Total Turmas</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 lg:px-10 lg:py-8 max-w-6xl mx-auto">
          {rooms.length === 0 ? (
            <div className="clinical-card flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <BookOpen className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma sala ativa</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isProfessor
                  ? "Crie uma nova sala para iniciar uma sessão PBL com seus alunos."
                  : "Você não possui sessões ativas no momento."}
              </p>
              {isProfessor && (
                <Button className="mt-5 rounded-xl gap-2" onClick={() => setShowCreateRoom(true)}>
                  <Plus className="h-4 w-4" /> Criar Sala
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {groupEntries.map(([groupName, groupRooms]) => (
                <section key={groupName}>
                  {/* Group Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <GraduationCap className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-foreground truncate">{groupName}</h2>
                      <p className="text-xs text-muted-foreground">
                        {groupRooms.length} {groupRooms.length === 1 ? "sala ativa" : "salas ativas"}
                      </p>
                    </div>
                  </div>

                  {/* Room Cards */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {groupRooms.map((room: any) => {
                      const scenario = getScenarioStatus(room);
                      return (
                        <button
                          key={room.id}
                          onClick={() => navigate(`/session/${room.id}`)}
                          className="group clinical-card text-left p-0 overflow-hidden transition-all hover:shadow-md hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {/* Step indicator bar */}
                          <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" style={{ width: `${Math.min(((room.current_step || 1) / 7) * 100, 100)}%` }} />

                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                                {room.name}
                              </h4>
                              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/8 px-2 py-1 text-[11px] font-semibold text-primary">
                                <DoorOpen className="h-3 w-3" />
                                Passo {room.current_step || 1}
                              </span>
                              <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium ${
                                scenario.variant === "success"
                                  ? "bg-[hsl(var(--clinical-success))]/10 text-[hsl(var(--clinical-success))]"
                                  : scenario.variant === "warning"
                                    ? "bg-[hsl(var(--clinical-warning))]/10 text-[hsl(var(--clinical-warning))]"
                                    : "bg-muted text-muted-foreground"
                              }`}>
                                {scenario.label}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
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
