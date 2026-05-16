import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Sparkles, Lightbulb, Target, AlertCircle, TrendingUp, Users,
  MessageSquare, CalendarCheck, Bot, BookOpen, ChevronRight, Compass,
} from "lucide-react";

interface StudentRow {
  name: string;
  evalAvg: number | null;
  peerAvg: number | null;
  chatCount: number;
  stepCount: number;
  attendanceRate: number;
  aiCount: number;
}

interface Metrics {
  groupEvalAvg: number | null;
  groupAttRate: number;
  groupChatAvg: number;
  groupAiAvg: number;
  totalSessions: number;
  totalObjectives: number;
  objectivesCovered: number;
  essentialPending: string[];
  criterionDifficulty: { label: string; phase: string; avg: number | null; samples: number }[];
  students: StudentRow[];
}

interface Insights {
  summary: string;
  strengths: string[];
  difficulty_patterns: string[];
  interventions: string[];
  next_session_focus: string[];
}

interface Props {
  rooms: { id: string; name: string; groups?: any }[];
}

export default function TutorSupportPanel({ rooms }: Props) {
  const { session } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState("");
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [aiPowered, setAiPowered] = useState(false);

  const analyze = async () => {
    if (!selectedRoom || !session?.access_token) return;
    setLoading(true);
    setMetrics(null);
    setInsights(null);
    try {
      const { data, error } = await supabase.functions.invoke("tutor-insights", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { room_id: selectedRoom },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }
      setMetrics(data.metrics);
      setInsights(data.insights);
      setAiPowered(!!data.ai_powered);
    } catch (e: any) {
      toast({ title: "Erro ao gerar insights", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const coveragePct = metrics && metrics.totalObjectives > 0
    ? Math.round((metrics.objectivesCovered / metrics.totalObjectives) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <Select value={selectedRoom} onValueChange={setSelectedRoom}>
          <SelectTrigger className="w-64 rounded-xl">
            <SelectValue placeholder="Selecione uma sala" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map(r => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} {(r.groups as any)?.name ? `(${(r.groups as any).name})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={analyze} disabled={!selectedRoom || loading} className="rounded-xl gap-2">
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Analisando..." : "Gerar Insights"}
        </Button>
      </div>

      {!metrics && !loading && (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <Compass className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Selecione uma sala e gere o painel de apoio para visualizar métricas e recomendações pedagógicas.
            </p>
          </CardContent>
        </Card>
      )}

      {metrics && (
        <>
          {/* Group stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard icon={TrendingUp} label="Média do grupo" value={metrics.groupEvalAvg !== null ? `${metrics.groupEvalAvg}%` : "—"} />
            <StatCard icon={CalendarCheck} label="Frequência" value={`${metrics.groupAttRate}%`} />
            <StatCard icon={MessageSquare} label="Chat médio" value={`${metrics.groupChatAvg}`} />
            <StatCard icon={Bot} label="IA / aluno" value={`${metrics.groupAiAvg}`} />
            <StatCard icon={Users} label="Sessões" value={`${metrics.totalSessions}`} />
          </div>

          {/* AI insights */}
          {insights && (
            <Card className="rounded-2xl border-primary/30 bg-gradient-to-br from-primary/[0.04] to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Diagnóstico do grupo
                  {aiPowered && (
                    <Badge variant="secondary" className="ml-2 text-[10px] font-normal">IA</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground/90 leading-relaxed">{insights.summary}</p>

                {insights.strengths.length > 0 && (
                  <Section icon={TrendingUp} title="Pontos fortes" items={insights.strengths} tone="success" />
                )}
                {insights.difficulty_patterns.length > 0 && (
                  <Section icon={AlertCircle} title="Padrões de dificuldade" items={insights.difficulty_patterns} tone="warning" />
                )}
                {insights.interventions.length > 0 && (
                  <Section icon={Lightbulb} title="Intervenções pedagógicas sugeridas" items={insights.interventions} tone="primary" />
                )}
                {insights.next_session_focus.length > 0 && (
                  <Section icon={Target} title="Foco da próxima sessão" items={insights.next_session_focus} tone="primary" />
                )}
              </CardContent>
            </Card>
          )}

          {/* Objectives coverage */}
          <Card className="rounded-2xl border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Cobertura de objetivos de aprendizagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coveragePct === null ? (
                <p className="text-sm text-muted-foreground">Nenhum objetivo cadastrado neste módulo.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {metrics.objectivesCovered} de {metrics.totalObjectives} objetivos cobertos
                    </span>
                    <span className="font-semibold text-foreground">{coveragePct}%</span>
                  </div>
                  <Progress value={coveragePct} className="h-2" />
                  {metrics.essentialPending.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-[hsl(var(--clinical-warning))] mb-1.5">
                        Objetivos essenciais pendentes
                      </p>
                      <ul className="space-y-1">
                        {metrics.essentialPending.slice(0, 6).map((o, i) => (
                          <li key={i} className="text-sm text-foreground/90 flex gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Criterion difficulty */}
          {metrics.criterionDifficulty.length > 0 && (
            <Card className="rounded-2xl border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[hsl(var(--clinical-warning))]" />
                  Critérios com maior dificuldade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {metrics.criterionDifficulty.map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground/90 truncate">
                        {c.label} <span className="text-xs text-muted-foreground">({c.phase === "opening" ? "abertura" : "fechamento"})</span>
                      </span>
                      <span className="font-medium text-foreground shrink-0 ml-2">{c.avg}%</span>
                    </div>
                    <Progress value={c.avg ?? 0} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Individual snapshot */}
          <Card className="rounded-2xl border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Snapshot individual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-2 font-medium">Aluno</th>
                      <th className="text-right py-2 font-medium">Nota</th>
                      <th className="text-right py-2 font-medium">Pares</th>
                      <th className="text-right py-2 font-medium">Freq.</th>
                      <th className="text-right py-2 font-medium">Chat</th>
                      <th className="text-right py-2 font-medium">Contrib.</th>
                      <th className="text-right py-2 font-medium">IA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.students.map((s, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0">
                        <td className="py-2 text-foreground/90">{s.name}</td>
                        <td className="py-2 text-right font-medium text-foreground">{s.evalAvg !== null ? `${s.evalAvg}%` : "—"}</td>
                        <td className="py-2 text-right text-foreground/80">{s.peerAvg !== null ? `${s.peerAvg}%` : "—"}</td>
                        <td className={`py-2 text-right ${s.attendanceRate < 75 ? "text-[hsl(var(--clinical-warning))]" : "text-foreground/80"}`}>{s.attendanceRate}%</td>
                        <td className="py-2 text-right text-foreground/80">{s.chatCount}</td>
                        <td className="py-2 text-right text-foreground/80">{s.stepCount}</td>
                        <td className="py-2 text-right text-foreground/80">{s.aiCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="rounded-xl border-border/60">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" />
          <span className="truncate">{label}</span>
        </div>
        <p className="text-xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function Section({ icon: Icon, title, items, tone }: { icon: any; title: string; items: string[]; tone: "success" | "warning" | "primary" }) {
  const color = tone === "success"
    ? "text-[hsl(var(--clinical-success))]"
    : tone === "warning"
    ? "text-[hsl(var(--clinical-warning))]"
    : "text-primary";
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-foreground/90 flex gap-2">
            <ChevronRight className={`h-4 w-4 shrink-0 mt-0.5 ${color}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
