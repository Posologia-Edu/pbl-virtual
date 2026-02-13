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

        {/* Active rooms */}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => navigate(`/session/${room.id}`)}
                  className="clinical-card cursor-pointer p-5 transition-all hover:shadow-md animate-fade-in"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-primary">
                      {(room.groups as any)?.name || "Turma"}
                    </span>
                  </div>
                  <h3 className="mb-1 text-base font-semibold text-foreground">{room.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Passo {room.current_step} • {room.status === "active" ? "Em andamento" : "Encerrada"}
                  </p>
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
