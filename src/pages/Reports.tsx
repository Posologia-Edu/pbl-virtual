import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Download, TrendingUp, Users, BarChart3, ArrowLeft, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import UpgradeOverlay from "@/components/UpgradeOverlay";

const GRADES: Record<string, number> = {
  O: 0, I: 25, PS: 50, S: 75, MS: 100,
};

interface StudentData {
  student_id: string;
  full_name: string;
}

interface EvalRow {
  student_id: string;
  criterion_id: string;
  grade: string | null;
  problem_number: number | null;
  archived: boolean;
}

interface CriterionRow {
  id: string;
  label: string;
  phase: string;
  sort_order: number | null;
}

export default function Reports() {
  const { user, isProfessor, isAdmin, subscription } = useAuth();
  const hasFullReports = subscription.fullReportsEnabled || isAdmin;
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("__all__");
  const [evaluations, setEvaluations] = useState<EvalRow[]>([]);
  const [criteria, setCriteria] = useState<CriterionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch rooms for the professor
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("id, name, groups(name)")
        .order("created_at", { ascending: false });
      if (data) setRooms(data);
    };
    fetch();
  }, [user]);

  // Fetch room data when selected
  useEffect(() => {
    if (!selectedRoom) return;
    const fetchRoomData = async () => {
      setLoading(true);

      const { data: room } = await supabase
        .from("rooms")
        .select("group_id")
        .eq("id", selectedRoom)
        .single();
      if (!room) { setLoading(false); return; }

      const [membersRes, criteriaRes, evalsRes] = await Promise.all([
        supabase
          .from("group_members")
          .select("student_id, profiles!group_members_student_id_profiles_fkey(full_name)")
          .eq("group_id", room.group_id),
        supabase
          .from("evaluation_criteria")
          .select("*")
          .eq("room_id", selectedRoom)
          .order("sort_order"),
        supabase
          .from("evaluations")
          .select("student_id, criterion_id, grade, problem_number, archived")
          .eq("room_id", selectedRoom)
          .eq("archived", true)
          .not("problem_number", "is", null),
      ]);

      if (membersRes.data) {
        setStudents(
          membersRes.data.map((m: any) => ({
            student_id: m.student_id,
            full_name: (m.profiles as any)?.full_name || "Sem nome",
          }))
        );
      }
      if (criteriaRes.data) setCriteria(criteriaRes.data);
      if (evalsRes.data) setEvaluations(evalsRes.data as EvalRow[]);

      setSelectedStudent("__all__");
      setLoading(false);
    };
    fetchRoomData();
  }, [selectedRoom]);

  // Compute problem numbers
  const problemNumbers = useMemo(
    () => [...new Set(evaluations.map((e) => e.problem_number!))].sort((a, b) => a - b),
    [evaluations]
  );

  // Helper: get average score for a student in a phase for a problem
  const getScore = (studentId: string, problemNumber: number, phase: string) => {
    const phaseCriteria = criteria.filter((c) => c.phase === phase);
    const grades = phaseCriteria
      .map((c) => {
        const ev = evaluations.find(
          (e) => e.student_id === studentId && e.criterion_id === c.id && e.problem_number === problemNumber
        );
        return ev?.grade ? GRADES[ev.grade] : undefined;
      })
      .filter((v): v is number => v !== undefined);
    if (grades.length === 0) return null;
    return Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
  };

  // Evolution chart data (line chart)
  const evolutionData = useMemo(() => {
    const targetStudents =
      selectedStudent === "__all__" ? students : students.filter((s) => s.student_id === selectedStudent);

    return problemNumbers.map((pn) => {
      const point: Record<string, any> = { name: `P${pn}` };

      if (selectedStudent === "__all__") {
        // Average of all students
        const openScores = targetStudents.map((s) => getScore(s.student_id, pn, "opening")).filter((v): v is number => v !== null);
        const closeScores = targetStudents.map((s) => getScore(s.student_id, pn, "closing")).filter((v): v is number => v !== null);
        point.Abertura = openScores.length ? Math.round(openScores.reduce((a, b) => a + b, 0) / openScores.length) : null;
        point.Fechamento = closeScores.length ? Math.round(closeScores.reduce((a, b) => a + b, 0) / closeScores.length) : null;
      } else {
        point.Abertura = getScore(selectedStudent, pn, "opening");
        point.Fechamento = getScore(selectedStudent, pn, "closing");
      }

      return point;
    });
  }, [problemNumbers, selectedStudent, students, evaluations, criteria]);

  // Bar chart data: comparison per student for latest problem
  const comparisonData = useMemo(() => {
    if (problemNumbers.length === 0) return [];
    const latestPn = problemNumbers[problemNumbers.length - 1];
    return students.map((s) => ({
      name: s.full_name.split(" ")[0],
      Abertura: getScore(s.student_id, latestPn, "opening") ?? 0,
      Fechamento: getScore(s.student_id, latestPn, "closing") ?? 0,
    }));
  }, [problemNumbers, students, evaluations, criteria]);

  // Radar chart data: criteria breakdown for selected student on latest problem
  const radarData = useMemo(() => {
    if (problemNumbers.length === 0 || selectedStudent === "__all__") return [];
    const latestPn = problemNumbers[problemNumbers.length - 1];
    return criteria.map((c) => {
      const ev = evaluations.find(
        (e) => e.student_id === selectedStudent && e.criterion_id === c.id && e.problem_number === latestPn
      );
      return {
        criterion: c.label.length > 20 ? c.label.substring(0, 18) + "…" : c.label,
        value: ev?.grade ? GRADES[ev.grade] : 0,
        fullMark: 100,
      };
    });
  }, [selectedStudent, problemNumbers, evaluations, criteria]);

  // Stats
  const stats = useMemo(() => {
    if (evolutionData.length === 0) return null;
    const lastOpening = evolutionData[evolutionData.length - 1]?.Abertura;
    const lastClosing = evolutionData[evolutionData.length - 1]?.Fechamento;
    const firstOpening = evolutionData[0]?.Abertura;
    const growth = lastClosing != null && firstOpening != null ? lastClosing - firstOpening : null;
    return { lastOpening, lastClosing, growth, problems: problemNumbers.length };
  }, [evolutionData, problemNumbers]);

  const handleExportPDF = () => {
    window.print();
    toast({ title: "Use Ctrl+P ou Cmd+P para salvar como PDF" });
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto print:overflow-visible">
        {/* Header */}
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.04] to-transparent px-6 py-6 lg:px-10 lg:py-8 print:bg-transparent print:border-0">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-1">Analytics</p>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Relatórios de Desempenho</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acompanhe a evolução dos alunos ao longo dos problemas
                </p>
              </div>
              <Button onClick={handleExportPDF} variant="outline" className="gap-2 rounded-xl self-start sm:self-auto print:hidden">
                <Download className="h-4 w-4" /> Exportar PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 lg:px-10 py-4 border-b border-border/40 print:hidden">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-3">
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger className="w-64 rounded-xl">
                <SelectValue placeholder="Selecione uma sala" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} {(r.groups as any)?.name ? `(${(r.groups as any).name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedRoom && students.length > 0 && (
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-56 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os alunos</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.student_id} value={s.student_id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 lg:px-10 py-6 max-w-7xl mx-auto" ref={reportRef}>
          {!selectedRoom ? (
            <div className="clinical-card flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-1">Selecione uma sala</h3>
              <p className="text-sm text-muted-foreground">
                Escolha uma sala para visualizar os relatórios de desempenho.
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : problemNumbers.length === 0 ? (
            <div className="clinical-card flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-1">Sem dados arquivados</h3>
              <p className="text-sm text-muted-foreground">
                Arquive avaliações na sessão PBL para gerar relatórios.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Stats cards */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Problemas Avaliados" value={`${stats.problems}`} />
                  <StatCard label="Última Abertura" value={stats.lastOpening != null ? `${stats.lastOpening}%` : "—"} />
                  <StatCard label="Último Fechamento" value={stats.lastClosing != null ? `${stats.lastClosing}%` : "—"} />
                  <StatCard
                    label="Crescimento"
                    value={stats.growth != null ? `${stats.growth > 0 ? "+" : ""}${stats.growth}%` : "—"}
                    highlight={stats.growth != null && stats.growth > 0}
                  />
                </div>
              )}

              {/* Evolution chart */}
              <Card className="rounded-2xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Evolução por Problema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evolutionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.75rem",
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [`${value}%`]}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="Abertura"
                          stroke="hsl(var(--clinical-warning))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--clinical-warning))", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Fechamento"
                          stroke="hsl(var(--clinical-success))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--clinical-success))", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar chart - comparison */}
                {hasFullReports ? (
                <Card className="rounded-2xl border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Comparativo — P{problemNumbers[problemNumbers.length - 1]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "0.75rem",
                              fontSize: 12,
                            }}
                            formatter={(value: number) => [`${value}%`]}
                          />
                          <Legend />
                          <Bar dataKey="Abertura" fill="hsl(var(--clinical-warning))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Fechamento" fill="hsl(var(--clinical-success))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                ) : (
                  <UpgradeOverlay feature="Comparativo entre Alunos" description="Gráfico comparativo disponível no plano Professional ou superior." />
                )}

                {/* Radar chart - criteria breakdown */}
                {hasFullReports ? (
                <Card className="rounded-2xl border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Critérios — Último Problema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedStudent === "__all__" ? (
                      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                        Selecione um aluno para ver o radar de critérios
                      </div>
                    ) : radarData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                        Sem dados disponíveis
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Radar
                              name="Desempenho"
                              dataKey="value"
                              stroke="hsl(var(--primary))"
                              fill="hsl(var(--primary))"
                              fillOpacity={0.2}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
                ) : (
                  <UpgradeOverlay feature="Radar de Critérios" description="Gráfico radar disponível no plano Professional ou superior." />
                )}
              </div>

              {/* Detailed table */}
              <Card className="rounded-2xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Tabela Detalhada</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Aluno</th>
                        {problemNumbers.map((pn) => (
                          <th key={pn} colSpan={2} className="text-center py-2 px-2 text-muted-foreground font-medium">
                            P{pn}
                          </th>
                        ))}
                      </tr>
                      <tr className="border-b border-border">
                        <th />
                        {problemNumbers.map((pn) => (
                          <Fragment key={pn}>
                            <th className="text-center py-1 px-2 text-[11px] text-muted-foreground/70 font-normal">Abert.</th>
                            <th className="text-center py-1 px-2 text-[11px] text-muted-foreground/70 font-normal">Fech.</th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.student_id} className="border-b border-border/40 hover:bg-secondary/30 transition-colors">
                          <td className="py-2 px-3 font-medium text-foreground">{s.full_name}</td>
                          {problemNumbers.map((pn) => {
                            const opening = getScore(s.student_id, pn, "opening");
                            const closing = getScore(s.student_id, pn, "closing");
                            return (
                              <Fragment key={pn}>
                                <td className="text-center py-2 px-2">
                                  <ScoreBadge value={opening} />
                                </td>
                                <td className="text-center py-2 px-2">
                                  <ScoreBadge value={closing} />
                                </td>
                              </Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Fragment({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
  return <>{children}</>;
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="clinical-card p-4 text-center">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-[hsl(var(--clinical-success))]" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function ScoreBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground/40">—</span>;
  const color =
    value >= 75
      ? "text-[hsl(var(--clinical-success))] bg-[hsl(var(--clinical-success))]/10"
      : value >= 50
      ? "text-[hsl(var(--clinical-warning))] bg-[hsl(var(--clinical-warning))]/10"
      : "text-destructive bg-destructive/10";
  return (
    <span className={`inline-block rounded-lg px-2 py-0.5 text-xs font-semibold ${color}`}>
      {value}%
    </span>
  );
}
