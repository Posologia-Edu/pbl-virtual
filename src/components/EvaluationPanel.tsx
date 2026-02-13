import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Check, Archive, History, ArrowLeft } from "lucide-react";

const GRADES = [
  { label: "O", value: 0 },
  { label: "I", value: 25 },
  { label: "PS", value: 50 },
  { label: "S", value: 75 },
  { label: "MS", value: 100 },
];

interface Props {
  roomId: string;
}

export default function EvaluationPanel({ roomId }: Props) {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [allCriteria, setAllCriteria] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, string>>({});
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [phase, setPhase] = useState<"opening" | "closing">("opening");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [archivedEvals, setArchivedEvals] = useState<any[]>([]);
  const [historyStudent, setHistoryStudent] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [roomId, phase]);

  useEffect(() => {
    if (showHistory) fetchArchivedData();
  }, [showHistory]);

  const fetchData = async () => {
    const { data: room } = await supabase.from("rooms").select("group_id").eq("id", roomId).single();
    if (!room) return;

    const { data: members } = await supabase
      .from("group_members")
      .select("student_id, profiles!group_members_student_id_profiles_fkey(full_name)")
      .eq("group_id", room.group_id);
    if (members) setStudents(members);

    const { data: crit } = await supabase
      .from("evaluation_criteria")
      .select("*")
      .eq("room_id", roomId)
      .eq("phase", phase)
      .order("sort_order");
    if (crit) setCriteria(crit);

    const { data: allCrit } = await supabase
      .from("evaluation_criteria")
      .select("*")
      .eq("room_id", roomId)
      .order("sort_order");
    if (allCrit) setAllCriteria(allCrit);

    const { data: evals } = await supabase
      .from("evaluations")
      .select("*")
      .eq("room_id", roomId)
      .eq("archived", false);
    if (evals) {
      const map: Record<string, string> = {};
      evals.forEach((e: any) => {
        map[`${e.student_id}-${e.criterion_id}`] = e.grade;
      });
      setEvaluations(map);
    }
  };

  const fetchArchivedData = async () => {
    const { data } = await supabase
      .from("evaluations")
      .select("*")
      .eq("room_id", roomId)
      .eq("archived", true)
      .not("problem_number", "is", null)
      .order("problem_number");
    if (data) setArchivedEvals(data);
  };

  const setGrade = async (studentId: string, criterionId: string, grade: string) => {
    if (!user) return;
    const key = `${studentId}-${criterionId}`;
    setEvaluations((prev) => ({ ...prev, [key]: grade }));

    // Check if a non-archived evaluation already exists
    const { data: existing } = await supabase
      .from("evaluations")
      .select("id")
      .eq("room_id", roomId)
      .eq("student_id", studentId)
      .eq("criterion_id", criterionId)
      .eq("archived", false)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase.from("evaluations").update({ grade }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("evaluations").insert({
        room_id: roomId,
        student_id: studentId,
        criterion_id: criterionId,
        grade,
        professor_id: user.id,
        archived: false,
      }));
    }

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
  };

  const saveCriterionLabel = async (id: string) => {
    const { error } = await supabase.from("evaluation_criteria").update({ label: editLabel }).eq("id", id);
    if (!error) {
      setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, label: editLabel } : c)));
      setAllCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, label: editLabel } : c)));
      setEditingCriterion(null);
    }
  };

  const archiveEvaluations = async () => {
    if (!user) return;

    // Determine next problem number
    const { data: maxData } = await supabase
      .from("evaluations")
      .select("problem_number")
      .eq("room_id", roomId)
      .eq("archived", true)
      .not("problem_number", "is", null)
      .order("problem_number", { ascending: false })
      .limit(1);

    const nextProblem = (maxData && maxData.length > 0 && maxData[0].problem_number != null)
      ? maxData[0].problem_number + 1
      : 1;

    const { error } = await supabase
      .from("evaluations")
      .update({ archived: true, problem_number: nextProblem })
      .eq("room_id", roomId)
      .eq("professor_id", user.id)
      .eq("archived", false);

    if (!error) {
      toast({ title: `Avaliação arquivada como P${nextProblem}!` });
      setEvaluations({});
    }
  };

  const getStudentScore = (studentId: string) => {
    const grades = criteria
      .map((c) => evaluations[`${studentId}-${c.id}`])
      .filter(Boolean)
      .map((g) => GRADES.find((gr) => gr.label === g)?.value || 0);
    if (grades.length === 0) return null;
    return Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
  };

  const getArchivedScore = (studentId: string, problemNumber: number, phaseFilter: string) => {
    const phaseCriteria = allCriteria.filter((c) => c.phase === phaseFilter);
    const grades = phaseCriteria
      .map((c) => {
        const ev = archivedEvals.find(
          (e) => e.student_id === studentId && e.criterion_id === c.id && e.problem_number === problemNumber
        );
        return ev?.grade;
      })
      .filter(Boolean)
      .map((g) => GRADES.find((gr) => gr.label === g)?.value || 0);
    if (grades.length === 0) return null;
    return Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
  };

  const problemNumbers = [...new Set(archivedEvals.map((e) => e.problem_number))].sort((a, b) => a - b);

  // ---- HISTORY VIEW ----
  if (showHistory) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border px-4 py-3 flex items-center gap-2">
          <button onClick={() => { setShowHistory(false); setHistoryStudent(null); }} className="text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-semibold text-foreground">Histórico de Avaliações</h3>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-3 scrollbar-thin">
          {!historyStudent ? (
            <div className="space-y-1">
              {students.map((s) => (
                <button
                  key={s.student_id}
                  onClick={() => setHistoryStudent(s.student_id)}
                  className="flex w-full items-center justify-between rounded-xl bg-secondary/50 px-3 py-2.5 text-left hover:bg-secondary transition-colors"
                >
                  <span className="text-sm text-foreground">{(s.profiles as any)?.full_name}</span>
                </button>
              ))}
              {students.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">Nenhum aluno</p>
              )}
            </div>
          ) : (
            <div className="animate-fade-in">
              <button onClick={() => setHistoryStudent(null)} className="mb-3 text-xs text-primary hover:underline">
                ← Voltar à lista
              </button>
              <p className="mb-3 text-sm font-medium text-foreground">
                {students.find((s) => s.student_id === historyStudent)?.profiles?.full_name}
              </p>

              {problemNumbers.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma avaliação arquivada</p>
              ) : (
                <div className="space-y-3">
                  {problemNumbers.map((pn) => {
                    const openingScore = getArchivedScore(historyStudent, pn, "opening");
                    const closingScore = getArchivedScore(historyStudent, pn, "closing");
                    return (
                      <div key={pn} className="rounded-xl border border-border p-3">
                        <h4 className="text-sm font-semibold text-foreground mb-2">P{pn}</h4>
                        <div className="flex gap-4">
                          <div className="flex-1 rounded-lg bg-secondary/50 p-2 text-center">
                            <span className="text-xs text-muted-foreground block">Abertura</span>
                            <span className="text-sm font-bold text-primary">{openingScore ?? "—"}%</span>
                          </div>
                          <div className="flex-1 rounded-lg bg-secondary/50 p-2 text-center">
                            <span className="text-xs text-muted-foreground block">Fechamento</span>
                            <span className="text-sm font-bold text-primary">{closingScore ?? "—"}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- MAIN VIEW ----
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Avaliação Formativa</h3>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <Tabs value={phase} onValueChange={(v) => setPhase(v as any)}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="opening" className="text-xs">Abertura</TabsTrigger>
            <TabsTrigger value="closing" className="text-xs">Fechamento</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3 scrollbar-thin">
        {!selectedStudent ? (
          <div className="space-y-1">
            {students.map((s) => {
              const score = getStudentScore(s.student_id);
              return (
                <button
                  key={s.student_id}
                  onClick={() => setSelectedStudent(s.student_id)}
                  className="flex w-full items-center justify-between rounded-xl bg-secondary/50 px-3 py-2.5 text-left hover:bg-secondary transition-colors"
                >
                  <span className="text-sm text-foreground">{(s.profiles as any)?.full_name}</span>
                  {score !== null && (
                    <span className="text-xs font-semibold text-primary">{score}%</span>
                  )}
                </button>
              );
            })}
            {students.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">Nenhum aluno nesta turma</p>
            )}
          </div>
        ) : (
          <div className="animate-fade-in">
            <button
              onClick={() => setSelectedStudent(null)}
              className="mb-3 text-xs text-primary hover:underline"
            >
              ← Voltar à lista
            </button>

            <p className="mb-3 text-sm font-medium text-foreground">
              {students.find((s) => s.student_id === selectedStudent)?.profiles?.full_name}
            </p>

            <div className="space-y-3">
              {criteria.map((crit) => {
                const key = `${selectedStudent}-${crit.id}`;
                const currentGrade = evaluations[key];
                const isEditing = editingCriterion === crit.id;

                return (
                  <div key={crit.id} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center gap-1">
                      {isEditing ? (
                        <div className="flex flex-1 gap-1">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-7 text-xs"
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveCriterionLabel(crit.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-xs text-foreground">{crit.label}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => { setEditingCriterion(crit.id); setEditLabel(crit.label); }}
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {GRADES.map((g) => (
                        <button
                          key={g.label}
                          onClick={() => setGrade(selectedStudent, crit.id, g.label)}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                            currentGrade === g.label
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-clinical-highlight p-3">
              <span className="text-xs font-medium text-foreground">Score</span>
              <span className="text-sm font-bold text-primary">
                {getStudentScore(selectedStudent) ?? "—"}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <Button variant="outline" size="sm" className="w-full" onClick={archiveEvaluations}>
          <Archive className="mr-2 h-4 w-4" /> Arquivar Registro
        </Button>
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowHistory(true)}>
          <History className="mr-2 h-4 w-4" /> Histórico
        </Button>
      </div>
    </div>
  );
}
