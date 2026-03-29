import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle, ShieldCheck, ShieldAlert, Brain, Activity,
  MessageSquare, BookOpen, CalendarCheck, TrendingDown, Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StudentRisk {
  student_id: string;
  name: string;
  evalAvg: number | null;
  peerAvg: number | null;
  chatCount: number;
  stepCount: number;
  attendanceRate: number;
  riskScore: number;
  riskLevel: "alto" | "moderado" | "baixo";
  recommendation: string;
  patterns?: string[];
}

interface RiskAnalysisPanelProps {
  rooms: { id: string; name: string; groups?: any }[];
}

export default function RiskAnalysisPanel({ rooms }: RiskAnalysisPanelProps) {
  const { session } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState("");
  const [students, setStudents] = useState<StudentRisk[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const analyze = async () => {
    if (!selectedRoom || !session?.access_token) return;
    setLoading(true);
    setAnalyzed(false);
    try {
      const { data, error } = await supabase.functions.invoke("predict-risk", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { room_id: selectedRoom },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
        return;
      }
      setStudents((data?.students || []).sort((a: StudentRisk, b: StudentRisk) => b.riskScore - a.riskScore));
      setAiPowered(data?.ai_powered ?? false);
      setAnalyzed(true);
    } catch (e: any) {
      toast({ title: "Erro na análise", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (level: string) => {
    if (level === "alto") return "text-destructive";
    if (level === "moderado") return "text-[hsl(var(--clinical-warning))]";
    return "text-[hsl(var(--clinical-success))]";
  };

  const riskBg = (level: string) => {
    if (level === "alto") return "bg-destructive/10 border-destructive/30";
    if (level === "moderado") return "bg-[hsl(var(--clinical-warning))]/10 border-[hsl(var(--clinical-warning))]/30";
    return "bg-[hsl(var(--clinical-success))]/10 border-[hsl(var(--clinical-success))]/30";
  };

  const RiskIcon = ({ level }: { level: string }) => {
    if (level === "alto") return <ShieldAlert className="h-5 w-5 text-destructive" />;
    if (level === "moderado") return <AlertTriangle className="h-5 w-5 text-[hsl(var(--clinical-warning))]" />;
    return <ShieldCheck className="h-5 w-5 text-[hsl(var(--clinical-success))]" />;
  };

  const highRisk = students.filter(s => s.riskLevel === "alto").length;
  const modRisk = students.filter(s => s.riskLevel === "moderado").length;
  const lowRisk = students.filter(s => s.riskLevel === "baixo").length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
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
        <Button
          onClick={analyze}
          disabled={!selectedRoom || loading}
          className="rounded-xl gap-2"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {loading ? "Analisando..." : "Analisar Risco"}
        </Button>
      </div>

      {/* Summary Cards */}
      {analyzed && students.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-destructive">{highRisk}</p>
              <p className="text-xs text-muted-foreground mt-1">Risco Alto</p>
            </CardContent>
          </Card>
          <Card className="border-[hsl(var(--clinical-warning))]/30 bg-[hsl(var(--clinical-warning))]/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-[hsl(var(--clinical-warning))]">{modRisk}</p>
              <p className="text-xs text-muted-foreground mt-1">Risco Moderado</p>
            </CardContent>
          </Card>
          <Card className="border-[hsl(var(--clinical-success))]/30 bg-[hsl(var(--clinical-success))]/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-[hsl(var(--clinical-success))]">{lowRisk}</p>
              <p className="text-xs text-muted-foreground mt-1">Risco Baixo</p>
            </CardContent>
          </Card>
        </div>
      )}

      {aiPowered && analyzed && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Análise potencializada por IA — padrões identificados automaticamente
        </div>
      )}

      {/* Student Cards */}
      {analyzed && students.length === 0 && (
        <Card className="border-border/60">
          <CardContent className="py-12 text-center">
            <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum aluno encontrado nesta sala.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {students.map(s => (
          <Card key={s.student_id} className={`border ${riskBg(s.riskLevel)} transition-all`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <RiskIcon level={s.riskLevel} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-foreground truncate">{s.name}</h4>
                    <Badge variant="outline" className={`shrink-0 ${riskColor(s.riskLevel)} border-current`}>
                      {s.riskLevel.toUpperCase()} — {s.riskScore}%
                    </Badge>
                  </div>

                  {/* Risk bar */}
                  <Progress
                    value={s.riskScore}
                    className="h-2 mb-3"
                  />

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <MetricChip icon={TrendingDown} label="Avaliação" value={s.evalAvg !== null ? `${s.evalAvg}%` : "N/A"} />
                    <MetricChip icon={MessageSquare} label="Mensagens" value={`${s.chatCount}`} />
                    <MetricChip icon={BookOpen} label="Contribuições" value={`${s.stepCount}`} />
                    <MetricChip icon={CalendarCheck} label="Frequência" value={`${s.attendanceRate}%`} />
                  </div>

                  {/* Recommendation */}
                  <p className="text-sm text-muted-foreground">{s.recommendation}</p>

                  {/* AI patterns */}
                  {s.patterns && s.patterns.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.patterns.map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MetricChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
