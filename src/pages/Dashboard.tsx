import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Users, DoorOpen, BookOpen, ChevronRight, Activity,
  GraduationCap, Building2,
} from "lucide-react";
import CreateRoomDialog from "@/components/CreateRoomDialog";
import BadgesPanel from "@/components/BadgesPanel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Dashboard() {
  const { user, isAdmin, isProfessor, isStudent, profile } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [roomsRes, groupsRes, coursesRes, institutionsRes] = await Promise.all([
        supabase.from("rooms").select("*, groups(id, name, course_id)").eq("status", "active").order("created_at", { ascending: false }),
        isProfessor || isAdmin
          ? supabase.from("groups").select("*").order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase.from("courses").select("id, name, institution_id"),
        supabase.from("institutions").select("id, name"),
      ]);
      if (roomsRes.data) setRooms(roomsRes.data);
      if (groupsRes.data) setGroups(groupsRes.data as any[]);
      if (coursesRes.data) setCourses(coursesRes.data as any[]);
      if (institutionsRes.data) setInstitutions(institutionsRes.data as any[]);
    };
    fetchData();
  }, [user, isProfessor, isAdmin]);

  // Build hierarchy: institution -> course -> rooms
  const hierarchy = useMemo(() => {
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const instMap = new Map(institutions.map(i => [i.id, i]));

    // Group rooms by course_id via their group
    const byCourse: Record<string, { course: any; institution: any; rooms: any[] }> = {};
    const uncategorized: any[] = [];

    for (const room of rooms) {
      const group = room.groups as any;
      const courseId = group?.course_id;
      const course = courseId ? courseMap.get(courseId) : null;

      if (!course) {
        uncategorized.push(room);
        continue;
      }

      if (!byCourse[courseId]) {
        const inst = course.institution_id ? instMap.get(course.institution_id) : null;
        byCourse[courseId] = { course, institution: inst, rooms: [] };
      }
      byCourse[courseId].rooms.push(room);
    }

    // Group by institution
    const byInst: Record<string, { institution: any; courses: { course: any; rooms: any[] }[] }> = {};
    for (const entry of Object.values(byCourse)) {
      const instId = entry.institution?.id || "__none__";
      if (!byInst[instId]) {
        byInst[instId] = { institution: entry.institution, courses: [] };
      }
      byInst[instId].courses.push({ course: entry.course, rooms: entry.rooms });
    }

    const result = Object.values(byInst).sort((a, b) =>
      (a.institution?.name || "").localeCompare(b.institution?.name || "")
    );

    if (uncategorized.length > 0) {
      result.push({
        institution: null,
        courses: [{ course: null, rooms: uncategorized }],
      });
    }

    return result;
  }, [rooms, courses, institutions]);

  const getScenarioStatus = (room: any) => {
    if (room.is_scenario_released) return { label: "Cenário visível", variant: "success" as const };
    if (room.scenario) return { label: "Cenário oculto", variant: "warning" as const };
    return { label: "Sem cenário", variant: "neutral" as const };
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.04] to-transparent px-6 py-8 lg:px-10 lg:py-10">
          <div className="max-w-7xl mx-auto">
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
                <Button onClick={() => setShowCreateRoom(true)} className="rounded-xl shadow-sm gap-2 self-start sm:self-auto">
                  <Plus className="h-4 w-4" /> Nova Sala
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="mt-6 flex flex-wrap gap-3 animate-fade-in">
              <StatChip icon={Activity} label="Salas Ativas" value={rooms.length} variant="primary" />
              <StatChip icon={GraduationCap} label="Cursos" value={hierarchy.reduce((s, h) => s + h.courses.length, 0)} variant="accent" />
              {(isProfessor || isAdmin) && (
                <StatChip icon={Users} label="Turmas" value={groups.length} variant="muted" />
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 lg:px-10 lg:py-8 max-w-7xl mx-auto">
          {rooms.length === 0 ? (
            <div className="clinical-card flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <BookOpen className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Nenhuma sala ativa</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isProfessor ? "Crie uma nova sala para iniciar uma sessão PBL." : "Você não possui sessões ativas no momento."}
              </p>
              {isProfessor && (
                <Button className="mt-5 rounded-xl gap-2" onClick={() => setShowCreateRoom(true)}>
                  <Plus className="h-4 w-4" /> Criar Sala
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-10 animate-fade-in">
              {hierarchy.map((instGroup, idx) => (
                <section key={instGroup.institution?.id || `uncategorized-${idx}`}>
                  {/* Institution Header */}
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground truncate">
                      {instGroup.institution?.name || "Sem instituição"}
                    </h2>
                  </div>

                  <div className="space-y-6 pl-2 border-l-2 border-primary/10 ml-4">
                    {instGroup.courses.map((courseGroup, cIdx) => (
                      <div key={courseGroup.course?.id || `no-course-${cIdx}`} className="pl-5">
                        {/* Course Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <GraduationCap className="h-4 w-4 text-accent shrink-0" />
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {courseGroup.course?.name || "Sem curso"}
                          </h3>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground whitespace-nowrap">
                            {courseGroup.rooms.length} {courseGroup.rooms.length === 1 ? "sala" : "salas"}
                          </span>
                        </div>

                        {/* Horizontal scroll of room cards */}
                        <ScrollArea className="w-full">
                          <div className="flex gap-3 pb-3">
                            {courseGroup.rooms.map((room: any) => {
                              const scenario = getScenarioStatus(room);
                              const groupName = (room.groups as any)?.name;
                              return (
                                <button
                                  key={room.id}
                                  onClick={() => navigate(`/session/${room.id}`)}
                                  className="group clinical-card text-left p-0 overflow-hidden transition-all hover:shadow-md hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 w-64"
                                >
                                  {/* Progress bar */}
                                  <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" style={{ width: `${Math.min(((room.current_step || 1) / 7) * 100, 100)}%` }} />

                                  <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                                        {room.name}
                                      </h4>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                                    </div>

                                    {groupName && (
                                      <p className="text-[11px] text-muted-foreground mb-2.5 flex items-center gap-1">
                                        <Users className="h-3 w-3" /> {groupName}
                                      </p>
                                    )}

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                        Passo {room.current_step || 1}
                                      </span>
                                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium ${
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
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Badges section for students */}
          {isStudent && (
            <div className="mt-8 clinical-card p-6 animate-fade-in">
              <BadgesPanel />
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

function StatChip({ icon: Icon, label, value, variant }: { icon: any; label: string; value: number; variant: "primary" | "accent" | "muted" }) {
  const bgMap = { primary: "bg-primary/10", accent: "bg-accent/10", muted: "bg-secondary" };
  const colorMap = { primary: "text-primary", accent: "text-accent", muted: "text-muted-foreground" };
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-card border border-border/60 px-4 py-2.5 shadow-sm">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgMap[variant]}`}>
        <Icon className={`h-4 w-4 ${colorMap[variant]}`} />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
