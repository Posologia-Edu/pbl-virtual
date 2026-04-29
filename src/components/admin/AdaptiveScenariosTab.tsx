import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Target, BookOpen, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  groups: any[];
  scenarios: any[];
  selectedCourseId?: string;
  onRefresh: () => void;
}

interface Diagnosis {
  weakCriteria: { id: string; label: string; phase: string; average: number; samples: number }[];
  pendingObjectives: { id: string; content: string; is_essential: boolean }[];
  coveredScenarios: { scenario_id: string; label: string; snippet: string }[];
  summary: string;
  moduleId?: string | null;
  courseId?: string | null;
}

export default function AdaptiveScenariosTab({ groups, scenarios, selectedCourseId, onRefresh }: Props) {
  const [groupId, setGroupId] = useState<string>("");
  const [baseScenarioId, setBaseScenarioId] = useState<string>("none");
  const [sourceType, setSourceType] = useState<"variation" | "subscenario">("subscenario");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const filteredGroups = useMemo(() => {
    if (!selectedCourseId) return groups;
    return groups.filter((g) => g.course_id === selectedCourseId);
  }, [groups, selectedCourseId]);

  const filteredScenarios = useMemo(() => {
    if (!selectedCourseId) return scenarios;
    return scenarios.filter((s) => s.course_id === selectedCourseId);
  }, [scenarios, selectedCourseId]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("adaptive_scenarios")
      .select("id, source_type, target_type, target_id, created_at, scenario_id, gaps_payload")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory(data || []);
  };

  useEffect(() => { loadHistory(); }, []);

  const runDiagnosis = async () => {
    if (!groupId) { toast({ title: "Selecione um grupo", variant: "destructive" }); return; }
    setAnalyzing(true);
    setDiagnosis(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-performance", { body: { group_id: groupId } });
      if (error) throw error;
      setDiagnosis(data as Diagnosis);
    } catch (e: any) {
      toast({ title: "Erro ao analisar desempenho", description: e?.message || "", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const generate = async () => {
    if (!groupId || !diagnosis) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-adaptive-scenario", {
        body: {
          source_type: sourceType,
          target_type: "group",
          target_id: groupId,
          base_scenario_id: baseScenarioId !== "none" ? baseScenarioId : null,
          gaps_payload: {
            weakCriteria: diagnosis.weakCriteria,
            pendingObjectives: diagnosis.pendingObjectives,
            coveredScenarios: diagnosis.coveredScenarios,
          },
          course_id: diagnosis.courseId,
          module_id: diagnosis.moduleId,
        },
      });
      if (error) throw error;
      toast({ title: "Cenário adaptativo gerado", description: (data as any)?.scenario?.title || "" });
      await loadHistory();
      onRefresh();
    } catch (e: any) {
      const msg = e?.message || "";
      toast({ title: "Falha ao gerar", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Motor de Cenários Adaptativos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Analisa desempenho do grupo e gera cenários PBL focados nas lacunas detectadas.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Grupo</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {filteredGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={sourceType} onValueChange={(v: any) => setSourceType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscenario">Sub-cenário focado (curto)</SelectItem>
                  <SelectItem value="variation">Variação completa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cenário-base (opcional)</Label>
              <Select value={baseScenarioId} onValueChange={setBaseScenarioId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {filteredScenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={runDiagnosis} disabled={!groupId || analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
              Analisar desempenho
            </Button>
            <Button onClick={generate} disabled={!diagnosis || generating} variant="default">
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar com IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {diagnosis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diagnóstico</CardTitle>
            <p className="text-sm text-muted-foreground">{diagnosis.summary}</p>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><Target className="h-4 w-4" /> Critérios fracos</h4>
              {diagnosis.weakCriteria.length === 0 && <p className="text-xs text-muted-foreground">Nenhum.</p>}
              <ul className="space-y-1">
                {diagnosis.weakCriteria.map((c) => (
                  <li key={c.id} className="text-xs">
                    <Badge variant="outline" className="mr-1">{c.average}/100</Badge>
                    {c.label} <span className="text-muted-foreground">({c.phase}, n={c.samples})</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><BookOpen className="h-4 w-4" /> Objetivos pendentes</h4>
              {diagnosis.pendingObjectives.length === 0 && <p className="text-xs text-muted-foreground">Nenhum.</p>}
              <ul className="space-y-1">
                {diagnosis.pendingObjectives.slice(0, 8).map((o) => (
                  <li key={o.id} className="text-xs">
                    {o.is_essential && <Badge className="mr-1" variant="default">essencial</Badge>}
                    {o.content}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1 mb-2"><History className="h-4 w-4" /> Já cursados</h4>
              {diagnosis.coveredScenarios.length === 0 && <p className="text-xs text-muted-foreground">Nenhum.</p>}
              <ul className="space-y-1">
                {diagnosis.coveredScenarios.slice(0, 8).map((s, i) => (
                  <li key={i} className="text-xs truncate">{s.label || "Cenário"}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Histórico de adaptativos</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cenário adaptativo gerado ainda.</p>}
          <ul className="space-y-2">
            {history.map((h) => {
              const sc = scenarios.find((s) => s.id === h.scenario_id);
              return (
                <li key={h.id} className="flex items-center justify-between border rounded p-2 text-sm">
                  <div>
                    <Badge variant="secondary" className="mr-2">{h.source_type === "variation" ? "Variação" : "Sub-cenário"}</Badge>
                    <span className="font-medium">{sc?.title || "(cenário)"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
