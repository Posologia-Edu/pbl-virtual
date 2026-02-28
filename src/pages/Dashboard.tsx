import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Plus, Users, DoorOpen, BookOpen, Activity,
  GraduationCap, Building2, AlertTriangle, Settings,
  TrendingUp, Clock, FileText, BarChart3, Eye,
  CheckCircle2, XCircle, Layers,
} from "lucide-react";
import CreateRoomDialog from "@/components/CreateRoomDialog";
import BadgesPanel from "@/components/BadgesPanel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Dashboard() {
  const { user, isAdmin, isProfessor, isStudent, isInstitutionAdmin, profile, subscription, isDemoUser } = useAuth();
  const navigate = useNavigate();

  // Redirect demo users to demo session on first load
  // Only for non-subscribers who haven't completed onboarding
  useEffect(() => {
    if (isDemoUser && !profile?.onboarding_completed && !subscription.subscribed && !subscription.institutionId) {
      navigate("/demo", { replace: true });
    }
  }, [isDemoUser, profile?.onboarding_completed, subscription.subscribed, subscription.institutionId, navigate]);
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [roomScenarios, setRoomScenarios] = useState<any[]>([]);
  const [tutorialSessions, setTutorialSessions] = useState<any[]>([]);

  const isAdminView = isAdmin || isInstitutionAdmin;

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [roomsRes, allRoomsRes, groupsRes, coursesRes, institutionsRes, sessionsRes] = await Promise.all([
        supabase.from("rooms").select("*, groups(id, name, course_id)").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("rooms").select("*, groups(id, name, course_id)").order("created_at", { ascending: false }),
        isProfessor || isAdmin || isInstitutionAdmin
          ? supabase.from("groups").select("*, group_members(student_id)").order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase.from("courses").select("id, name, institution_id"),
        supabase.from("institutions").select("id, name"),
        supabase.from("tutorial_sessions").select("id, room_id, status, label, started_at, ended_at").order("started_at", { ascending: false }).limit(50),
      ]);
      if (roomsRes.data) setRooms(roomsRes.data);
      if (allRoomsRes.data) setAllRooms(allRoomsRes.data);
      if (groupsRes.data) setGroups(groupsRes.data as any[]);
      if (coursesRes.data) setCourses(coursesRes.data as any[]);
      if (institutionsRes.data) setInstitutions(institutionsRes.data as any[]);
      if (sessionsRes.data) setTutorialSessions(sessionsRes.data as any[]);
    };
    fetchData();
  }, [user, isProfessor, isAdmin, isInstitutionAdmin]);

  // Fetch details when a room is selected
  useEffect(() => {
    if (!selectedRoom) { setGroupMembers([]); setRoomScenarios([]); return; }
    const groupId = (selectedRoom.groups as any)?.id || selectedRoom.group_id;
    Promise.all([
      groupId
        ? supabase.from("group_members").select("student_id, profiles!group_members_student_id_profiles_fkey(full_name)").eq("group_id", groupId)
        : Promise.resolve({ data: [] }),
      supabase.from("room_scenarios").select("id, label, is_active, scenario_content").eq("room_id", selectedRoom.id).order("sort_order"),
    ]).then(([membersRes, scenariosRes]) => {
      if (membersRes.data) setGroupMembers(membersRes.data as any[]);
      if (scenariosRes.data) setRoomScenarios(scenariosRes.data as any[]);
    });
  }, [selectedRoom?.id]);

  // Build hierarchy
  const hierarchy = useMemo(() => {
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const instMap = new Map(institutions.map(i => [i.id, i]));
    const byCourse: Record<string, { course: any; institution: any; rooms: any[] }> = {};
    const uncategorized: any[] = [];
    for (const room of rooms) {
      const group = room.groups as any;
      const courseId = group?.course_id;
      const course = courseId ? courseMap.get(courseId) : null;
      if (!course) { uncategorized.push(room); continue; }
      if (!byCourse[courseId]) {
        const inst = course.institution_id ? instMap.get(course.institution_id) : null;
        byCourse[courseId] = { course, institution: inst, rooms: [] };
      }
      byCourse[courseId].rooms.push(room);
    }
    const byInst: Record<string, { institution: any; courses: { course: any; rooms: any[] }[] }> = {};
    for (const entry of Object.values(byCourse)) {
      const instId = entry.institution?.id || "__none__";
      if (!byInst[instId]) byInst[instId] = { institution: entry.institution, courses: [] };
      byInst[instId].courses.push({ course: entry.course, rooms: entry.rooms });
    }
    const result = Object.values(byInst).sort((a, b) =>
      (a.institution?.name || "").localeCompare(b.institution?.name || "")
    );
    if (uncategorized.length > 0) {
      result.push({ institution: null, courses: [{ course: null, rooms: uncategorized }] });
    }
    return result;
  }, [rooms, courses, institutions]);

  // Computed stats
  const totalStudents = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach((g: any) => g.group_members?.forEach((m: any) => ids.add(m.student_id)));
    return ids.size;
  }, [groups]);

  const endedRooms = allRooms.filter(r => r.status === "ended").length;
  const activeRooms = rooms.length;
  const activeSessions = tutorialSessions.filter(s => s.status === "active").length;
  const completedSessions = tutorialSessions.filter(s => s.status === "ended" || s.ended_at).length;

  const avgStep = useMemo(() => {
    if (rooms.length === 0) return 0;
    const sum = rooms.reduce((s, r) => s + (r.current_step || 0), 0);
    return Math.round((sum / rooms.length) * 10) / 10;
  }, [rooms]);

  const roomsWithScenario = rooms.filter(r => r.scenario || r.is_scenario_released).length;
  const roomsWithoutScenario = rooms.length - roomsWithScenario;

  const getScenarioStatus = (room: any) => {
    if (room.is_scenario_released) return { label: t("dashboard.scenarioVisible"), variant: "success" as const };
    if (room.scenario) return { label: t("dashboard.scenarioHidden"), variant: "warning" as const };
    return { label: t("dashboard.noScenario"), variant: "neutral" as const };
  };

  const recentSessions = tutorialSessions.slice(0, 5);

  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.04] to-transparent px-6 py-8 lg:px-10 lg:py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-1">
                  {isInstitutionAdmin ? t("roles.admin") : isProfessor ? t("roles.professor") : isAdmin ? t("roles.admin") : t("roles.studentFull")}
                </p>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  {t("dashboard.greeting", { name: profile?.full_name?.split(" ")[0] || "User" })}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {isInstitutionAdmin ? t("dashboard.institutionAdminSubtitle") : isProfessor ? t("dashboard.professorSubtitle") : isAdmin ? t("dashboard.adminSubtitle") : t("dashboard.studentSubtitle")}
                </p>
              </div>
              {isProfessor && (
                <Button onClick={() => setShowCreateRoom(true)} className="rounded-xl shadow-sm gap-2 self-start sm:self-auto">
                  <Plus className="h-4 w-4" /> {t("dashboard.newRoom")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-8">
          {/* Demo user upgrade banner */}
          {isDemoUser && (
            <div className="clinical-card p-6 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground mb-1">Você está no modo demonstração</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Para criar suas próprias salas, turmas e cenários, ative sua assinatura e configure sua instituição.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => navigate("/pricing")} className="rounded-xl gap-2">
                      <TrendingUp className="h-4 w-4" /> Ver Planos
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate("/demo")} className="rounded-xl gap-2">
                      <Eye className="h-4 w-4" /> Voltar à Sala Demo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {isInstitutionAdmin && !subscription.institutionId && rooms.length === 0 && (
            <div className="clinical-card p-6 border-primary/30 bg-primary/5 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground mb-1">{t("dashboard.setupBannerTitle")}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{t("dashboard.setupBannerDesc")}</p>
                  <Button size="sm" onClick={() => navigate("/admin")} className="rounded-xl gap-2">
                    <Settings className="h-4 w-4" /> {t("dashboard.setupBannerAction")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* KPI Grid — visible for admin roles */}
          {isAdminView && (
            <div className="animate-fade-in">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Indicadores Gerais</h2>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <KpiCard icon={Activity} label="Salas Ativas" value={activeRooms} color="primary" />
                <KpiCard icon={XCircle} label="Salas Encerradas" value={endedRooms} color="muted" />
                <KpiCard icon={GraduationCap} label="Cursos" value={courses.length} color="accent" />
                <KpiCard icon={Users} label="Turmas" value={groups.length} color="primary" />
                <KpiCard icon={Users} label="Alunos" value={totalStudents} color="accent" />
                <KpiCard icon={Building2} label="Instituições" value={institutions.length} color="muted" />
              </div>
            </div>
          )}

          {/* Second row of insights */}
          {isAdminView && (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3 animate-fade-in">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Progresso Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">Passo {avgStep}</p>
                  <p className="text-xs text-muted-foreground mt-1">Média das salas ativas (de 7 passos)</p>
                  <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((avgStep / 7) * 100, 100)}%` }} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Cenários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-3">
                    <div>
                      <p className="text-3xl font-bold text-foreground">{roomsWithScenario}</p>
                      <p className="text-xs text-muted-foreground">Com cenário</p>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div>
                      <p className="text-3xl font-bold text-destructive">{roomsWithoutScenario}</p>
                      <p className="text-xs text-muted-foreground">Sem cenário</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Sessões Tutoriais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-3">
                    <div>
                      <p className="text-3xl font-bold text-foreground">{activeSessions}</p>
                      <p className="text-xs text-muted-foreground">Ativas</p>
                    </div>
                    <Separator orientation="vertical" className="h-10" />
                    <div>
                      <p className="text-3xl font-bold text-muted-foreground">{completedSessions}</p>
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Non-admin stat chips */}
          {!isAdminView && (
            <div className="flex flex-wrap gap-3 animate-fade-in">
              <StatChip icon={Activity} label={t("dashboard.activeRooms")} value={rooms.length} variant="primary" />
              <StatChip icon={GraduationCap} label={t("dashboard.courses")} value={courses.length} variant="accent" />
              {isProfessor && <StatChip icon={Users} label={t("dashboard.groups")} value={groups.length} variant="muted" />}
            </div>
          )}

          {/* Recent Sessions — admin view */}
          {isAdminView && recentSessions.length > 0 && (
            <div className="animate-fade-in">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Atividade Recente</h2>
              <Card className="border-border/60">
                <CardContent className="p-0">
                  <div className="divide-y divide-border/60">
                    {recentSessions.map(s => {
                      const room = allRooms.find(r => r.id === s.room_id);
                      return (
                        <div key={s.id} className="flex items-center justify-between px-5 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-2 w-2 rounded-full shrink-0 ${s.status === "active" ? "bg-[hsl(var(--clinical-success))]" : "bg-muted-foreground/30"}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {room?.name || "Sala"} — <span className="text-muted-foreground">{s.label}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {s.started_at ? new Date(s.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </p>
                            </div>
                          </div>
                          <Badge variant={s.status === "active" ? "default" : "secondary"} className="shrink-0 text-[10px]">
                            {s.status === "active" ? "Ativa" : "Encerrada"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Room Hierarchy */}
          {rooms.length === 0 ? (
            <div className="clinical-card flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <BookOpen className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">{t("dashboard.noRooms")}</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {isProfessor ? t("dashboard.noRoomsProf") : t("dashboard.noRoomsStudent")}
              </p>
              {isProfessor && (
                <Button className="mt-5 rounded-xl gap-2" onClick={() => setShowCreateRoom(true)}>
                  <Plus className="h-4 w-4" /> {t("dashboard.createRoom")}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-10 animate-fade-in">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Salas por Instituição</h2>
              {hierarchy.map((instGroup, idx) => (
                <section key={instGroup.institution?.id || `uncategorized-${idx}`}>
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground truncate">
                      {instGroup.institution?.name || t("dashboard.noInstitution")}
                    </h2>
                  </div>

                  <div className="space-y-6 pl-2 border-l-2 border-primary/10 ml-4">
                    {instGroup.courses.map((courseGroup, cIdx) => (
                      <div key={courseGroup.course?.id || `no-course-${cIdx}`} className="pl-5">
                        <div className="flex items-center gap-2 mb-3">
                          <GraduationCap className="h-4 w-4 text-accent shrink-0" />
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {courseGroup.course?.name || t("dashboard.noCourse")}
                          </h3>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground whitespace-nowrap">
                            {courseGroup.rooms.length} {courseGroup.rooms.length === 1 ? t("dashboard.room") : t("dashboard.rooms")}
                          </span>
                        </div>

                        <ScrollArea className="w-full">
                          <div className="flex gap-3 pb-3">
                            {courseGroup.rooms.map((room: any) => {
                              const scenario = getScenarioStatus(room);
                              const groupName = (room.groups as any)?.name;
                              return (
                                <button
                                  key={room.id}
                                  onClick={() => setSelectedRoom(room)}
                                  className="group clinical-card text-left p-0 overflow-hidden transition-all hover:shadow-md hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 w-64"
                                >
                                  <div className="h-1 bg-gradient-to-r from-primary/60 to-primary/20" style={{ width: `${Math.min(((room.current_step || 1) / 7) * 100, 100)}%` }} />
                                  <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                                        {room.name}
                                      </h4>
                                      <Eye className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                                    </div>
                                    {groupName && (
                                      <p className="text-[11px] text-muted-foreground mb-2.5 flex items-center gap-1">
                                        <Users className="h-3 w-3" /> {groupName}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                        {t("dashboard.step")} {room.current_step || 1}
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
          {isStudent && subscription.badgesEnabled && (
            <div className="clinical-card p-6 animate-fade-in">
              <BadgesPanel />
            </div>
          )}
        </div>
      </div>

      {/* Room Detail Dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={(open) => { if (!open) setSelectedRoom(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-primary" />
              {selectedRoom?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedRoom && (
            <div className="space-y-5">
              {/* Status & step */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={selectedRoom.status === "active" ? "default" : "secondary"}>
                  {selectedRoom.status === "active" ? "Ativa" : "Encerrada"}
                </Badge>
                <Badge variant="outline">Passo {selectedRoom.current_step || 1} de 7</Badge>
                <Badge variant="outline" className={
                  selectedRoom.is_scenario_released
                    ? "border-[hsl(var(--clinical-success))]/40 text-[hsl(var(--clinical-success))]"
                    : selectedRoom.scenario
                      ? "border-[hsl(var(--clinical-warning))]/40 text-[hsl(var(--clinical-warning))]"
                      : ""
                }>
                  {getScenarioStatus(selectedRoom).label}
                </Badge>
              </div>

              {/* Progress bar */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Progresso</p>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(((selectedRoom.current_step || 1) / 7) * 100, 100)}%` }} />
                </div>
              </div>

              {/* Group info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <Users className="inline h-3.5 w-3.5 mr-1" />
                  Turma: {(selectedRoom.groups as any)?.name || "—"}
                </p>
                {groupMembers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {groupMembers.map((m: any) => (
                      <span key={m.student_id} className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                        {(m.profiles as any)?.full_name || "Aluno"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum aluno cadastrado</p>
                )}
              </div>

              {/* Scenarios */}
              {roomScenarios.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    <FileText className="inline h-3.5 w-3.5 mr-1" />
                    Cenários ({roomScenarios.length})
                  </p>
                  <div className="space-y-1.5">
                    {roomScenarios.map(sc => (
                      <div key={sc.id} className="flex items-center gap-2 text-xs">
                        {sc.is_active
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--clinical-success))]" />
                          : <div className="h-3.5 w-3.5 rounded-full border border-border" />
                        }
                        <span className={sc.is_active ? "font-medium text-foreground" : "text-muted-foreground"}>
                          {sc.label || "Cenário"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-muted-foreground">
                <p>Criada em: {selectedRoom.created_at ? new Date(selectedRoom.created_at).toLocaleDateString("pt-BR") : "—"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showCreateRoom && (
        <CreateRoomDialog
          groups={groups}
          onClose={() => setShowCreateRoom(false)}
          onCreated={(room) => {
            setRooms((prev) => [room, ...prev]);
            setAllRooms((prev) => [room, ...prev]);
            setShowCreateRoom(false);
            toast({ title: t("dashboard.roomCreated") });
          }}
        />
      )}
    </Layout>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: "primary" | "accent" | "muted" }) {
  const bgMap = { primary: "bg-primary/10", accent: "bg-accent/10", muted: "bg-secondary" };
  const colorMap = { primary: "text-primary", accent: "text-accent", muted: "text-muted-foreground" };
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgMap[color]} shrink-0`}>
          <Icon className={`h-5 w-5 ${colorMap[color]}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
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
