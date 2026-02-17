import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, User, Users, Eye, Archive, History } from "lucide-react";

const GRADES = [
  { label: "O", value: 0 },
  { label: "I", value: 25 },
  { label: "PS", value: 50 },
  { label: "S", value: 75 },
  { label: "MS", value: 100 },
];

const gradeToValue = (g: string | null) => GRADES.find((gr) => gr.label === g)?.value ?? null;
const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

interface Props {
  roomId: string;
  sessionId?: string;
  isProfessor: boolean;
}

export default function PeerEvaluationPanel({ roomId, sessionId, isProfessor }: Props) {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [allCriteria, setAllCriteria] = useState<any[]>([]);
  const [peerEvals, setPeerEvals] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"opening" | "closing">("opening");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  // Professor 360° view
  const [allPeerEvals, setAllPeerEvals] = useState<any[]>([]);
  const [profEvals, setProfEvals] = useState<any[]>([]);
  const [selectedStudentResult, setSelectedStudentResult] = useState<string | null>(null);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [archivedPeerEvals, setArchivedPeerEvals] = useState<any[]>([]);
  const [archivedProfEvals, setArchivedProfEvals] = useState<any[]>([]);
  const [historyStudent, setHistoryStudent] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: room } = await supabase.from("rooms").select("group_id").eq("id", roomId).single();
    if (!room) return;

    const [membersRes, critRes, allCritRes] = await Promise.all([
      supabase
        .from("group_members")
        .select("student_id, profiles!group_members_student_id_profiles_fkey(full_name)")
        .eq("group_id", room.group_id),
      supabase
        .from("evaluation_criteria")
        .select("*")
        .eq("room_id", roomId)
        .eq("phase", phase)
        .order("sort_order"),
      supabase
        .from("evaluation_criteria")
        .select("*")
        .eq("room_id", roomId)
        .order("sort_order"),
    ]);

    if (membersRes.data) setStudents(membersRes.data);
    if (critRes.data) setCriteria(critRes.data);
    if (allCritRes.data) setAllCriteria(allCritRes.data);

    // Student: fetch own peer evaluations (active, non-archived)
    if (user && !isProfessor) {
      const q = supabase
        .from("peer_evaluations")
        .select("*")
        .eq("room_id", roomId)
        .eq("evaluator_id", user.id)
        .eq("archived", false);
      const { data: evals } = sessionId ? await q.eq("session_id", sessionId) : await q;
      if (evals) {
        const map: Record<string, string> = {};
        evals.forEach((e: any) => { map[`${e.target_id}-${e.criterion_id}`] = e.grade; });
        setPeerEvals(map);
      }
    }

    // Professor: fetch ALL peer evals and professor evals (active)
    if (isProfessor) {
      const peerQ = supabase.from("peer_evaluations").select("*").eq("room_id", roomId).eq("archived", false);
      const profQ = supabase.from("evaluations").select("*").eq("room_id", roomId).eq("archived", false);
      const [peerRes, profRes] = await Promise.all([
        sessionId ? peerQ.eq("session_id", sessionId) : peerQ,
        sessionId ? profQ.eq("session_id", sessionId) : profQ,
      ]);
      if (peerRes.data) setAllPeerEvals(peerRes.data);
      if (profRes.data) setProfEvals(profRes.data);
    }
  }, [roomId, phase, sessionId, user, isProfessor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchArchivedData = useCallback(async () => {
    const [peerRes, profRes] = await Promise.all([
      supabase
        .from("peer_evaluations")
        .select("*")
        .eq("room_id", roomId)
        .eq("archived", true)
        .not("problem_number", "is", null)
        .order("problem_number"),
      supabase
        .from("evaluations")
        .select("*")
        .eq("room_id", roomId)
        .eq("archived", true)
        .not("problem_number", "is", null)
        .order("problem_number"),
    ]);
    if (peerRes.data) setArchivedPeerEvals(peerRes.data);
    if (profRes.data) setArchivedProfEvals(profRes.data);
  }, [roomId]);

  useEffect(() => { if (showHistory) fetchArchivedData(); }, [showHistory, fetchArchivedData]);

  // --- Set grade (student) ---
  const setGrade = async (targetId: string, criterionId: string, grade: string) => {
    if (!user || !roomId) return;
    const key = `${targetId}-${criterionId}`;
    const isSelf = targetId === user.id;
    setPeerEvals((prev) => ({ ...prev, [key]: grade }));

    const q = supabase
      .from("peer_evaluations")
      .select("id")
      .eq("room_id", roomId)
      .eq("evaluator_id", user.id)
      .eq("target_id", targetId)
      .eq("criterion_id", criterionId)
      .eq("archived", false);
    const { data: existing } = sessionId
      ? await q.eq("session_id", sessionId).maybeSingle()
      : await q.maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase.from("peer_evaluations").update({ grade }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("peer_evaluations").insert({
        room_id: roomId,
        evaluator_id: user.id,
        target_id: targetId,
        criterion_id: criterionId,
        grade,
        is_self: isSelf,
        ...(sessionId ? { session_id: sessionId } : {}),
      }));
    }

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
  };

  // --- Archive peer evaluations (professor) ---
  const archivePeerEvaluations = async () => {
    if (!user) return;

    // Find next problem_number
    const { data: maxData } = await supabase
      .from("peer_evaluations")
      .select("problem_number")
      .eq("room_id", roomId)
      .eq("archived", true)
      .not("problem_number", "is", null)
      .order("problem_number", { ascending: false })
      .limit(1);

    const nextProblem = maxData?.length && maxData[0].problem_number != null
      ? maxData[0].problem_number + 1
      : 1;

    const { error } = await supabase
      .from("peer_evaluations")
      .update({ archived: true, problem_number: nextProblem })
      .eq("room_id", roomId)
      .eq("archived", false);

    if (!error) {
      toast({ title: `Avaliação por pares arquivada como P${nextProblem}!` });
      setAllPeerEvals([]);
      fetchData();
    } else {
      toast({ title: "Erro ao arquivar", description: error.message, variant: "destructive" });
    }
  };

  // --- Score helpers ---
  const getScore = (targetId: string, evalsMap: Record<string, string>) => {
    const grades = criteria
      .map((c) => evalsMap[`${targetId}-${c.id}`])
      .filter(Boolean)
      .map((g) => gradeToValue(g))
      .filter((v): v is number => v !== null);
    return avg(grades);
  };

  const evaluatedCount = useMemo(() => {
    if (!user) return 0;
    const targets = new Set<string>();
    Object.entries(peerEvals).forEach(([key, val]) => {
      if (val) targets.add(key.split("-")[0]);
    });
    return targets.size;
  }, [peerEvals, user]);

  // --- 360° data for a student (active evals) ---
  const get360Data = (targetStudentId: string) => {
    const selfEvals = allPeerEvals.filter((e) => e.evaluator_id === targetStudentId && e.target_id === targetStudentId);
    const peerEvalsForTarget = allPeerEvals.filter((e) => e.target_id === targetStudentId && e.evaluator_id !== targetStudentId);
    const profEvalsForTarget = profEvals.filter((e) => e.student_id === targetStudentId);

    return criteria.map((c) => {
      const selfGrade = selfEvals.find((e) => e.criterion_id === c.id)?.grade;
      const peerGrades = peerEvalsForTarget
        .filter((e) => e.criterion_id === c.id && e.grade)
        .map((e) => gradeToValue(e.grade))
        .filter((v): v is number => v !== null);
      const profGrade = profEvalsForTarget.find((e) => e.criterion_id === c.id)?.grade;

      return {
        criterion: c.label,
        selfScore: gradeToValue(selfGrade ?? null),
        selfLabel: selfGrade || null,
        peerAvg: avg(peerGrades),
        peerCount: peerGrades.length,
        profScore: gradeToValue(profGrade ?? null),
        profLabel: profGrade || null,
      };
    });
  };

  // --- Archived 360° data for a student on a specific problem ---
  const getArchived360 = (targetStudentId: string, problemNumber: number, phaseFilter: string) => {
    const phaseCriteria = allCriteria.filter((c) => c.phase === phaseFilter);
    const peerEvalsForProblem = archivedPeerEvals.filter((e) => e.problem_number === problemNumber);
    const profEvalsForProblem = archivedProfEvals.filter((e) => e.problem_number === problemNumber);

    const selfEvals = peerEvalsForProblem.filter((e) => e.evaluator_id === targetStudentId && e.target_id === targetStudentId);
    const peerOnly = peerEvalsForProblem.filter((e) => e.target_id === targetStudentId && e.evaluator_id !== targetStudentId);
    const profOnly = profEvalsForProblem.filter((e) => e.student_id === targetStudentId);

    const selfGrades = phaseCriteria.map((c) => gradeToValue(selfEvals.find((e) => e.criterion_id === c.id)?.grade ?? null)).filter((v): v is number => v !== null);
    const peerGrades = phaseCriteria.flatMap((c) =>
      peerOnly.filter((e) => e.criterion_id === c.id && e.grade).map((e) => gradeToValue(e.grade)).filter((v): v is number => v !== null)
    );
    const profGrades = phaseCriteria.map((c) => gradeToValue(profOnly.find((e) => e.criterion_id === c.id)?.grade ?? null)).filter((v): v is number => v !== null);

    return { selfAvg: avg(selfGrades), peerAvg: avg(peerGrades), profAvg: avg(profGrades) };
  };

  const archivedProblemNumbers = useMemo(() => {
    const fromPeer = archivedPeerEvals.map((e) => e.problem_number);
    const fromProf = archivedProfEvals.map((e) => e.problem_number);
    return [...new Set([...fromPeer, ...fromProf])].sort((a, b) => a - b);
  }, [archivedPeerEvals, archivedProfEvals]);

  // ===== SCORE CELL COMPONENT =====
  const ScoreCell = ({ label, score, colorClass }: { label: string; score: number | null; colorClass: string }) => (
    <div className="rounded-lg bg-secondary/50 p-2 text-center">
      <span className="text-[10px] text-muted-foreground block">{label}</span>
      <span className={`text-sm font-bold ${colorClass}`}>
        {score != null ? `${score}%` : "—"}
      </span>
    </div>
  );

  // ===== HISTORY VIEW =====
  if (showHistory) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border px-4 py-3 flex items-center gap-2">
          <button onClick={() => { setShowHistory(false); setHistoryStudent(null); }} className="text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-semibold text-foreground">Histórico — Avaliação 360°</h3>
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

              {archivedProblemNumbers.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma avaliação arquivada</p>
              ) : (
                <div className="space-y-3">
                  {archivedProblemNumbers.map((pn) => {
                    const opening = getArchived360(historyStudent, pn, "opening");
                    const closing = getArchived360(historyStudent, pn, "closing");
                    return (
                      <div key={pn} className="rounded-xl border border-border p-3">
                        <h4 className="text-sm font-semibold text-foreground mb-2">P{pn}</h4>
                        {/* Opening */}
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Abertura</p>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <ScoreCell label="Auto" score={opening.selfAvg} colorClass="text-primary" />
                          <ScoreCell label="Pares" score={opening.peerAvg} colorClass="text-accent-foreground" />
                          <ScoreCell label="Tutor" score={opening.profAvg} colorClass="text-primary" />
                        </div>
                        {/* Closing */}
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Fechamento</p>
                        <div className="grid grid-cols-3 gap-2">
                          <ScoreCell label="Auto" score={closing.selfAvg} colorClass="text-primary" />
                          <ScoreCell label="Pares" score={closing.peerAvg} colorClass="text-accent-foreground" />
                          <ScoreCell label="Tutor" score={closing.profAvg} colorClass="text-primary" />
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

  // ===== PROFESSOR 360° VIEW =====
  if (isProfessor) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Visão 360°
          </h3>
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
          {!selectedStudentResult ? (
            <div className="space-y-1">
              {students.map((s) => {
                const peerCount = allPeerEvals.filter((e) => e.target_id === s.student_id && e.evaluator_id !== s.student_id).length;
                const hasSelf = allPeerEvals.some((e) => e.target_id === s.student_id && e.evaluator_id === s.student_id);
                const hasProf = profEvals.some((e) => e.student_id === s.student_id);
                return (
                  <button
                    key={s.student_id}
                    onClick={() => setSelectedStudentResult(s.student_id)}
                    className="flex w-full items-center justify-between rounded-xl bg-secondary/50 px-3 py-2.5 text-left hover:bg-secondary transition-colors"
                  >
                    <span className="text-sm text-foreground">{(s.profiles as any)?.full_name}</span>
                    <div className="flex items-center gap-1.5">
                      {hasSelf && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Auto</span>
                      )}
                      {peerCount > 0 && (
                        <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">{peerCount} par{peerCount > 1 ? "es" : ""}</span>
                      )}
                      {hasProf && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">Tutor</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="animate-fade-in">
              <button onClick={() => setSelectedStudentResult(null)} className="mb-3 text-xs text-primary hover:underline">
                ← Voltar à lista
              </button>
              <p className="mb-3 text-sm font-medium text-foreground">
                {students.find((s) => s.student_id === selectedStudentResult)?.profiles?.full_name}
              </p>

              <div className="space-y-3">
                {get360Data(selectedStudentResult).map((row, i) => (
                  <div key={i} className="rounded-xl border border-border p-3">
                    <p className="text-xs font-medium text-foreground mb-2">{row.criterion}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <span className="text-[10px] text-muted-foreground block">Auto</span>
                        <span className="text-sm font-bold text-primary">
                          {row.selfScore != null ? `${row.selfScore}%` : "—"}
                        </span>
                        {row.selfLabel && <span className="text-[10px] text-muted-foreground block">{row.selfLabel}</span>}
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <span className="text-[10px] text-muted-foreground block">Pares ({row.peerCount})</span>
                        <span className="text-sm font-bold text-accent-foreground">
                          {row.peerAvg != null ? `${row.peerAvg}%` : "—"}
                        </span>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <span className="text-[10px] text-muted-foreground block">Tutor</span>
                        <span className="text-sm font-bold text-primary">
                          {row.profScore != null ? `${row.profScore}%` : "—"}
                        </span>
                        {row.profLabel && <span className="text-[10px] text-muted-foreground block">{row.profLabel}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              {(() => {
                const data = get360Data(selectedStudentResult);
                const selfScores = data.map((d) => d.selfScore).filter((v): v is number => v !== null);
                const peerScores = data.map((d) => d.peerAvg).filter((v): v is number => v !== null);
                const profScores = data.map((d) => d.profScore).filter((v): v is number => v !== null);
                return (
                  <div className="mt-3 rounded-xl bg-secondary/30 p-3">
                    <p className="text-xs font-medium text-foreground mb-2">Resumo</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Auto</span>
                        <span className="text-sm font-bold text-primary">{avg(selfScores) != null ? `${avg(selfScores)}%` : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Pares</span>
                        <span className="text-sm font-bold text-accent-foreground">{avg(peerScores) != null ? `${avg(peerScores)}%` : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Tutor</span>
                        <span className="text-sm font-bold text-primary">{avg(profScores) != null ? `${avg(profScores)}%` : "—"}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Archive & History buttons */}
        <div className="border-t border-border p-3 space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={archivePeerEvaluations}>
            <Archive className="mr-2 h-4 w-4" /> Arquivar Registro
          </Button>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowHistory(true)}>
            <History className="mr-2 h-4 w-4" /> Histórico
          </Button>
        </div>
      </div>
    );
  }

  // ===== STUDENT VIEW =====
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Avaliação por Pares
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Avalie a si mesmo e seus colegas
        </p>
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
        {!selectedTarget ? (
          <div className="space-y-1">
            {students
              .sort((a, b) => {
                if (a.student_id === user?.id) return -1;
                if (b.student_id === user?.id) return 1;
                return 0;
              })
              .map((s) => {
                const isSelf = s.student_id === user?.id;
                const score = getScore(s.student_id, peerEvals);
                return (
                  <button
                    key={s.student_id}
                    onClick={() => setSelectedTarget(s.student_id)}
                    className="flex w-full items-center justify-between rounded-xl bg-secondary/50 px-3 py-2.5 text-left hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isSelf ? (
                        <User className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-sm text-foreground">
                        {isSelf ? `${(s.profiles as any)?.full_name} (Você)` : (s.profiles as any)?.full_name}
                      </span>
                    </div>
                    {score !== null && (
                      <span className="text-xs font-semibold text-primary">{score}%</span>
                    )}
                  </button>
                );
              })}
          </div>
        ) : (
          <div className="animate-fade-in">
            <button onClick={() => setSelectedTarget(null)} className="mb-3 text-xs text-primary hover:underline">
              ← Voltar à lista
            </button>

            <div className="flex items-center gap-2 mb-3">
              {selectedTarget === user?.id ? (
                <User className="h-4 w-4 text-primary" />
              ) : (
                <Users className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-sm font-medium text-foreground">
                {selectedTarget === user?.id
                  ? "Autoavaliação"
                  : students.find((s) => s.student_id === selectedTarget)?.profiles?.full_name}
              </p>
            </div>

            <div className="space-y-3">
              {criteria.map((crit) => {
                const key = `${selectedTarget}-${crit.id}`;
                const currentGrade = peerEvals[key];
                return (
                  <div key={crit.id} className="rounded-xl border border-border p-3">
                    <p className="mb-2 text-xs text-foreground">{crit.label}</p>
                    <div className="flex gap-1">
                      {GRADES.map((g) => (
                        <button
                          key={g.label}
                          onClick={() => setGrade(selectedTarget, crit.id, g.label)}
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

            <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/30 p-3">
              <span className="text-xs font-medium text-foreground">Score</span>
              <span className="text-sm font-bold text-primary">
                {getScore(selectedTarget, peerEvals) ?? "—"}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <p className="text-[11px] text-muted-foreground text-center">
          {evaluatedCount} de {students.length} avaliado(s)
        </p>
      </div>
    </div>
  );
}
