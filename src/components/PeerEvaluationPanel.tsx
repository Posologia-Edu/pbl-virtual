import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, User, Users, Eye } from "lucide-react";

const GRADES = [
  { label: "O", value: 0 },
  { label: "I", value: 25 },
  { label: "PS", value: 50 },
  { label: "S", value: 75 },
  { label: "MS", value: 100 },
];

interface Props {
  roomId: string;
  sessionId?: string;
  isProfessor: boolean;
}

export default function PeerEvaluationPanel({ roomId, sessionId, isProfessor }: Props) {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [peerEvals, setPeerEvals] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"opening" | "closing">("opening");
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [view, setView] = useState<"evaluate" | "results">(isProfessor ? "results" : "evaluate");

  // For professor 360° view
  const [allPeerEvals, setAllPeerEvals] = useState<any[]>([]);
  const [profEvals, setProfEvals] = useState<any[]>([]);
  const [selectedStudentResult, setSelectedStudentResult] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [roomId, phase, sessionId]);

  const fetchData = async () => {
    const { data: room } = await supabase.from("rooms").select("group_id").eq("id", roomId).single();
    if (!room) return;

    const [membersRes, critRes] = await Promise.all([
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
    ]);

    if (membersRes.data) setStudents(membersRes.data);
    if (critRes.data) setCriteria(critRes.data);

    // Fetch current user's peer evaluations
    if (user && !isProfessor) {
      const queryBuilder = supabase
        .from("peer_evaluations")
        .select("*")
        .eq("room_id", roomId)
        .eq("evaluator_id", user.id)
        .eq("archived", false);
      const { data: evals } = sessionId
        ? await queryBuilder.eq("session_id", sessionId)
        : await queryBuilder;
      if (evals) {
        const map: Record<string, string> = {};
        evals.forEach((e: any) => {
          map[`${e.target_id}-${e.criterion_id}`] = e.grade;
        });
        setPeerEvals(map);
      }
    }

    // For professor: fetch all peer evals and professor evals
    if (isProfessor) {
      const [peerRes, profRes] = await Promise.all([
        sessionId
          ? supabase.from("peer_evaluations").select("*").eq("room_id", roomId).eq("archived", false).eq("session_id", sessionId)
          : supabase.from("peer_evaluations").select("*").eq("room_id", roomId).eq("archived", false),
        sessionId
          ? supabase.from("evaluations").select("*").eq("room_id", roomId).eq("archived", false).eq("session_id", sessionId)
          : supabase.from("evaluations").select("*").eq("room_id", roomId).eq("archived", false),
      ]);
      if (peerRes.data) setAllPeerEvals(peerRes.data);
      if (profRes.data) setProfEvals(profRes.data);
    }
  };

  const setGrade = async (targetId: string, criterionId: string, grade: string) => {
    if (!user || !roomId) return;
    const key = `${targetId}-${criterionId}`;
    const isSelf = targetId === user.id;

    setPeerEvals((prev) => ({ ...prev, [key]: grade }));

    // Check existing
    const queryBuilder = supabase
      .from("peer_evaluations")
      .select("id")
      .eq("room_id", roomId)
      .eq("evaluator_id", user.id)
      .eq("target_id", targetId)
      .eq("criterion_id", criterionId)
      .eq("archived", false);
    const { data: existing } = sessionId
      ? await queryBuilder.eq("session_id", sessionId).maybeSingle()
      : await queryBuilder.maybeSingle();

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

  const getScore = (targetId: string, evals: Record<string, string>) => {
    const grades = criteria
      .map((c) => evals[`${targetId}-${c.id}`])
      .filter(Boolean)
      .map((g) => GRADES.find((gr) => gr.label === g)?.value || 0);
    if (grades.length === 0) return null;
    return Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
  };

  // For 360° view: compute average peer score for a student on a criterion
  const get360Data = (targetStudentId: string) => {
    const selfEvals = allPeerEvals.filter((e) => e.evaluator_id === targetStudentId && e.target_id === targetStudentId);
    const peerEvalsForTarget = allPeerEvals.filter((e) => e.target_id === targetStudentId && e.evaluator_id !== targetStudentId);
    const profEvalsForTarget = profEvals.filter((e) => e.student_id === targetStudentId);

    return criteria.map((c) => {
      const selfGrade = selfEvals.find((e) => e.criterion_id === c.id)?.grade;
      const peerGrades = peerEvalsForTarget
        .filter((e) => e.criterion_id === c.id && e.grade)
        .map((e) => GRADES.find((g) => g.label === e.grade)?.value || 0);
      const profGrade = profEvalsForTarget.find((e) => e.criterion_id === c.id)?.grade;

      const peerAvg = peerGrades.length > 0 ? Math.round(peerGrades.reduce((a, b) => a + b, 0) / peerGrades.length) : null;

      return {
        criterion: c.label,
        selfScore: selfGrade ? GRADES.find((g) => g.label === selfGrade)?.value ?? null : null,
        selfLabel: selfGrade || null,
        peerAvg,
        peerCount: peerGrades.length,
        profScore: profGrade ? GRADES.find((g) => g.label === profGrade)?.value ?? null : null,
        profLabel: profGrade || null,
      };
    });
  };

  // Evaluate peers count
  const evaluatedCount = useMemo(() => {
    if (!user) return 0;
    const targets = new Set<string>();
    Object.keys(peerEvals).forEach((key) => {
      const [targetId] = key.split("-");
      if (peerEvals[key]) targets.add(targetId);
    });
    return targets.size;
  }, [peerEvals, user]);

  // ----- PROFESSOR 360° VIEW -----
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
                return (
                  <button
                    key={s.student_id}
                    onClick={() => setSelectedStudentResult(s.student_id)}
                    className="flex w-full items-center justify-between rounded-xl bg-secondary/50 px-3 py-2.5 text-left hover:bg-secondary transition-colors"
                  >
                    <span className="text-sm text-foreground">{(s.profiles as any)?.full_name}</span>
                    <div className="flex items-center gap-2">
                      {hasSelf && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Auto</span>
                      )}
                      {peerCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">{peerCount} avaliações</span>
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
                        {row.selfLabel && (
                          <span className="text-[10px] text-muted-foreground block">{row.selfLabel}</span>
                        )}
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <span className="text-[10px] text-muted-foreground block">Pares ({row.peerCount})</span>
                        <span className="text-sm font-bold text-accent">
                          {row.peerAvg != null ? `${row.peerAvg}%` : "—"}
                        </span>
                      </div>
                      <div className="rounded-lg bg-secondary/50 p-2 text-center">
                        <span className="text-[10px] text-muted-foreground block">Tutor</span>
                        <span className="text-sm font-bold text-[hsl(var(--clinical-success))]">
                          {row.profScore != null ? `${row.profScore}%` : "—"}
                        </span>
                        {row.profLabel && (
                          <span className="text-[10px] text-muted-foreground block">{row.profLabel}</span>
                        )}
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
                const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
                return (
                  <div className="mt-3 rounded-xl bg-[hsl(var(--clinical-highlight))] p-3">
                    <p className="text-xs font-medium text-foreground mb-2">Resumo</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Auto</span>
                        <span className="text-sm font-bold text-primary">{avg(selfScores) ?? "—"}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Pares</span>
                        <span className="text-sm font-bold text-accent">{avg(peerScores) ?? "—"}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Tutor</span>
                        <span className="text-sm font-bold text-[hsl(var(--clinical-success))]">{avg(profScores) ?? "—"}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----- STUDENT VIEW -----
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
            {/* Self evaluation first */}
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

            <div className="mt-3 flex items-center justify-between rounded-xl bg-[hsl(var(--clinical-highlight))] p-3">
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
