import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Target, Plus, Trash2, Star, StarOff, CheckCircle2,
  Circle, BookOpen, Loader2, Save,
} from "lucide-react";

interface Props {
  moduleId: string | null;
  roomId: string;
  sessionId: string | undefined;
  allSessions: any[];
  isProfessor: boolean;
  /** Step items from step 5 of the current session to suggest adding */
  currentStepItems?: any[];
}

export default function ObjectivesBankPanel({
  moduleId,
  roomId,
  sessionId,
  allSessions,
  isProfessor,
  currentStepItems,
}: Props) {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<any[]>([]);
  const [coverage, setCoverage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newObjective, setNewObjective] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchData = async () => {
    if (!moduleId) { setLoading(false); return; }
    setLoading(true);

    const [objRes, covRes] = await Promise.all([
      (supabase as any)
        .from("learning_objectives")
        .select("*")
        .eq("module_id", moduleId)
        .order("is_essential", { ascending: false })
        .order("created_at"),
      (supabase as any)
        .from("objective_sessions")
        .select("*"),
    ]);

    setObjectives(objRes.data || []);
    setCoverage(covRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [moduleId]);

  const addObjective = async (content: string, sourceSessionId?: string) => {
    if (!content.trim() || !moduleId || !user) return;
    setAdding(true);
    const { error } = await (supabase as any)
      .from("learning_objectives")
      .insert({
        module_id: moduleId,
        content: content.trim(),
        created_by: user.id,
        source_session_id: sourceSessionId || null,
      });
    if (error) {
      toast({ title: "Erro", description: "Falha ao adicionar objetivo.", variant: "destructive" });
    } else {
      setNewObjective("");
      fetchData();
    }
    setAdding(false);
  };

  const toggleEssential = async (id: string, current: boolean) => {
    await (supabase as any)
      .from("learning_objectives")
      .update({ is_essential: !current })
      .eq("id", id);
    fetchData();
  };

  const deleteObjective = async (id: string) => {
    await (supabase as any).from("learning_objectives").delete().eq("id", id);
    fetchData();
  };

  const toggleCoverage = async (objectiveId: string, sessId: string) => {
    if (!user) return;
    const existing = coverage.find(
      (c: any) => c.objective_id === objectiveId && c.session_id === sessId
    );
    if (existing) {
      await (supabase as any).from("objective_sessions").delete().eq("id", existing.id);
    } else {
      await (supabase as any).from("objective_sessions").insert({
        objective_id: objectiveId,
        session_id: sessId,
        confirmed_by: user.id,
      });
    }
    fetchData();
  };

  const isCovered = (objectiveId: string, sessId: string) =>
    coverage.some((c: any) => c.objective_id === objectiveId && c.session_id === sessId);

  const getCoverageCount = (objectiveId: string) =>
    coverage.filter((c: any) => c.objective_id === objectiveId).length;

  // Objectives from step 5 not yet in the bank
  const existingContents = new Set(objectives.map((o: any) => o.content.toLowerCase().trim()));
  const suggestedItems = (currentStepItems || []).filter(
    (item: any) => !existingContents.has(item.content.toLowerCase().trim())
  );

  // Sessions for this room only
  const roomSessions = allSessions.filter((s: any) => s.room_id === roomId);

  if (!moduleId) {
    return (
      <div className="clinical-card p-6 text-center">
        <Target className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          Esta turma não está vinculada a um módulo. Vincule um módulo para usar o banco de objetivos.
        </p>
      </div>
    );
  }

  return (
    <div className="clinical-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Banco de Objetivos de Aprendizagem</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Suggestions from current session */}
          {isProfessor && suggestedItems.length > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Objetivos desta sessão não incluídos no banco
              </p>
              {suggestedItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-foreground/80 flex-1">{item.content}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs h-7"
                    onClick={() => addObjective(item.content, sessionId)}
                  >
                    <Save className="mr-1 h-3 w-3" /> Adicionar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new objective manually */}
          {isProfessor && (
            <div className="flex gap-2">
              <Input
                placeholder="Novo objetivo de aprendizagem..."
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addObjective(newObjective)}
              />
              <Button onClick={() => addObjective(newObjective)} disabled={adding || !newObjective.trim()} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Objectives list */}
          {objectives.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Target className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Nenhum objetivo cadastrado. {isProfessor ? "Adicione objetivos manualmente ou a partir das contribuições dos alunos." : ""}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {objectives.map((obj: any) => {
                const covCount = getCoverageCount(obj.id);
                const totalSessions = roomSessions.length;
                return (
                  <div
                    key={obj.id}
                    className={`rounded-xl border p-3 space-y-2 transition-colors ${
                      obj.is_essential ? "border-primary/30 bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {obj.is_essential ? (
                        <Star className="mt-0.5 h-4 w-4 shrink-0 fill-primary text-primary" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{obj.content}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {obj.is_essential && (
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                              Essencial
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            Coberto em {covCount}/{totalSessions} sessão(ões)
                          </span>
                        </div>
                      </div>
                      {isProfessor && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={obj.is_essential ? "Remover essencial" : "Marcar como essencial"}
                            onClick={() => toggleEssential(obj.id, obj.is_essential)}
                          >
                            {obj.is_essential ? (
                              <StarOff className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Star className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => deleteObjective(obj.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Coverage checkboxes per session (professor only) */}
                    {isProfessor && roomSessions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pl-6">
                        {roomSessions.map((sess: any) => (
                          <label
                            key={sess.id}
                            className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Checkbox
                              checked={isCovered(obj.id, sess.id)}
                              onCheckedChange={() => toggleCoverage(obj.id, sess.id)}
                              className="h-3.5 w-3.5"
                            />
                            {sess.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Coverage summary */}
          {isProfessor && objectives.length > 0 && (
            <div className="rounded-xl bg-muted/30 p-4">
              <p className="text-xs font-semibold text-foreground mb-2">Cobertura Curricular</p>
              {(() => {
                const essential = objectives.filter((o: any) => o.is_essential);
                const coveredEssential = essential.filter((o: any) => getCoverageCount(o.id) > 0);
                const totalCovered = objectives.filter((o: any) => getCoverageCount(o.id) > 0);
                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-muted-foreground">Total de objetivos</span>
                      <span className="font-medium text-foreground">{objectives.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-muted-foreground">Objetivos cobertos</span>
                      <span className="font-medium text-foreground">
                        {totalCovered.length}/{objectives.length}
                      </span>
                    </div>
                    {essential.length > 0 && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Star className="h-3 w-3 fill-primary text-primary" /> Essenciais cobertos
                        </span>
                        <span className={`font-medium ${
                          coveredEssential.length === essential.length
                            ? "text-[hsl(var(--clinical-success))]"
                            : "text-[hsl(var(--clinical-warning))]"
                        }`}>
                          {coveredEssential.length}/{essential.length}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
