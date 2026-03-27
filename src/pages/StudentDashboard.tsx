import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import BadgesPanel from "@/components/BadgesPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, Trophy, BarChart3, BookOpen, MessageSquare,
  Clock, Star, TrendingUp, Target, Users, CheckCircle2,
} from "lucide-react";

interface EvalSummary {
  criterion_label: string;
  grade: string;
}

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [peerEvals, setPeerEvals] = useState<any[]>([]);
  const [contributions, setContributions] = useState(0);
  const [chatMessages, setChatMessages] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [attendance, setAttendance] = useState<{ total: number; present: number }>({ total: 0, present: 0 });

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [
      roomsRes, evalsRes, peerRes, contribRes, chatRes, attendRes,
    ] = await Promise.all([
      supabase.from("rooms").select("id, name, current_step, status, groups(name)").eq("status", "active"),
      supabase.from("evaluations").select("grade, criterion_id, evaluation_criteria(label, phase)").eq("student_id", user.id).eq("archived", false),
      supabase.from("peer_evaluations").select("grade, criterion_id, evaluation_criteria(label)").eq("target_id", user.id).eq("archived", false),
      supabase.from("step_items").select("id", { count: "exact", head: true }).eq("author_id", user.id),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("student_id", user.id),
    ]);

    if (roomsRes.data) setRooms(roomsRes.data);
    if (evalsRes.data) setEvaluations(evalsRes.data as any[]);
    if (peerRes.data) setPeerEvals(peerRes.data as any[]);
    setContributions(contribRes.count || 0);
    setChatMessages(chatRes.count || 0);
    setAttendance({ total: 0, present: attendRes.count || 0 });

    // Count distinct sessions the student participated in
    const { data: sessionData } = await supabase
      .from("step_items")
      .select("session_id")
      .eq("author_id", user.id)
      .not("session_id", "is", null);
    if (sessionData) {
      const uniqueSessions = new Set(sessionData.map((s: any) => s.session_id));
      setSessionsCount(uniqueSessions.size);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Grade distribution
  const gradeDistribution = useMemo(() => {
    const dist = { A: 0, B: 0, C: 0, D: 0 };
    evaluations.forEach((e) => {
      const g = e.grade as string;
      if (g === "A") dist.A++;
      else if (g === "B") dist.B++;
      else if (g === "C") dist.C++;
      else if (g === "D") dist.D++;
    });
    return dist;
  }, [evaluations]);

  const totalGrades = Object.values(gradeDistribution).reduce((a, b) => a + b, 0);
  const aPercent = totalGrades > 0 ? Math.round((gradeDistribution.A / totalGrades) * 100) : 0;
  const overallScore = totalGrades > 0
    ? Math.round(((gradeDistribution.A * 10 + gradeDistribution.B * 7.5 + gradeDistribution.C * 5 + gradeDistribution.D * 2.5) / totalGrades) * 10) / 10
    : 0;

  const gradeLabels: Record<string, string> = { A: "Excelente", B: "Bom", C: "Regular", D: "Insatisfatório" };
  const gradeColors: Record<string, string> = {
    A: "bg-emerald-500", B: "bg-blue-500", C: "bg-amber-500", D: "bg-red-500",
  };

  const stats = [
    { icon: BookOpen, label: "Sessões", value: sessionsCount, color: "text-blue-500" },
    { icon: MessageSquare, label: "Mensagens", value: chatMessages, color: "text-violet-500" },
    { icon: Target, label: "Contribuições", value: contributions, color: "text-emerald-500" },
    { icon: CheckCircle2, label: "Presenças", value: attendance.present, color: "text-teal-500" },
  ];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Olá, {profile?.full_name?.split(" ")[0] || "Aluno"}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">Acompanhe seu progresso e desempenho nas sessões PBL</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Desempenho Geral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {totalGrades > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold">{overallScore}</p>
                      <p className="text-xs text-muted-foreground">Nota média (0-10)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-emerald-600">{aPercent}%</p>
                      <p className="text-xs text-muted-foreground">Avaliações "Excelente"</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(gradeDistribution).map(([grade, count]) => (
                      <div key={grade} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-24">{gradeLabels[grade]}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${gradeColors[grade]} transition-all`}
                            style={{ width: `${totalGrades > 0 ? (count / totalGrades) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma avaliação registrada ainda.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Peer evaluation summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Avaliação por Pares
              </CardTitle>
            </CardHeader>
            <CardContent>
              {peerEvals.length > 0 ? (
                <div className="space-y-2">
                  {(() => {
                    const byGrade: Record<string, number> = {};
                    peerEvals.forEach((e) => {
                      if (e.grade) byGrade[e.grade] = (byGrade[e.grade] || 0) + 1;
                    });
                    return Object.entries(byGrade).map(([g, c]) => (
                      <div key={g} className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${gradeColors[g] || "bg-muted"}`} />
                        <span className="text-sm flex-1">{gradeLabels[g] || g}</span>
                        <span className="text-sm font-medium">{c}x</span>
                      </div>
                    ));
                  })()}
                  <p className="text-xs text-muted-foreground mt-2">
                    Total: {peerEvals.length} avaliações recebidas dos colegas
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma avaliação por pares recebida.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Salas ativas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Minhas Salas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rooms.map((room) => (
                  <div key={room.id} className="rounded-xl border border-border p-3 hover:bg-muted/30 transition-colors">
                    <p className="font-medium text-sm">{room.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(room.groups as any)?.name || "Grupo"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        Passo {room.current_step || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sala ativa no momento.</p>
            )}
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Minhas Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BadgesPanel userId={user?.id} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
