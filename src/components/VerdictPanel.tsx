import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Stethoscope, CheckCircle2, Loader2, Save } from "lucide-react";

interface Props {
  roomId: string;
  sessionId: string;
  isReporter: boolean;
  isProfessor: boolean;
  /** Objectives the group must explicitly address (from P5 step_items) */
  objectives: { id: string; content: string }[];
  onChange?: (state: { isFinalized: boolean; addressedAll: boolean; hasContent: boolean }) => void;
}

export default function VerdictPanel({ roomId, sessionId, isReporter, isProfessor, objectives, onChange }: Props) {
  const { user } = useAuth();
  const [verdict, setVerdict] = useState<any>(null);
  const [content, setContent] = useState("");
  const [addressed, setAddressed] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const canEdit = isReporter || isProfessor;

  const fetchVerdict = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("session_verdicts").select("*").eq("session_id", sessionId).maybeSingle();
    setVerdict(data || null);
    setContent(data?.content || "");
    setAddressed((data?.objectives_addressed as string[]) || []);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { if (sessionId) fetchVerdict(); }, [sessionId, fetchVerdict]);

  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase.channel(`verdict-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_verdicts", filter: `session_id=eq.${sessionId}` }, () => fetchVerdict())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, fetchVerdict]);

  // Notify parent of completeness
  useEffect(() => {
    if (!onChange) return;
    const allObjectiveIds = objectives.map((o) => o.id);
    const addressedAll = allObjectiveIds.length > 0 && allObjectiveIds.every((id) => addressed.includes(id));
    onChange({
      isFinalized: !!verdict?.finalized_at,
      addressedAll,
      hasContent: (verdict?.content || "").trim().length > 30,
    });
  }, [verdict, addressed, objectives, onChange]);

  const save = async (finalize = false) => {
    if (!user || !canEdit) return;
    setSaving(true);
    const payload: any = {
      session_id: sessionId,
      room_id: roomId,
      content,
      objectives_addressed: addressed,
      updated_by: user.id,
    };
    if (finalize) {
      if (!isProfessor) { toast({ title: "Apenas o tutor pode finalizar." }); setSaving(false); return; }
      payload.finalized_at = new Date().toISOString();
      payload.finalized_by = user.id;
    }
    const { error } = verdict
      ? await (supabase as any).from("session_verdicts").update(payload).eq("id", verdict.id)
      : await (supabase as any).from("session_verdicts").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: finalize ? "Conduta final consolidada!" : "Conduta salva" });
  };

  const toggleObj = (id: string) =>
    setAddressed((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const isFinalized = !!verdict?.finalized_at;

  if (loading) {
    return (
      <div className="clinical-card p-5 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`clinical-card p-5 ${isFinalized ? "border-emerald-500/40 bg-emerald-500/5" : "border-primary/30"}`}>
      <div className="flex items-start gap-2 mb-3">
        <Stethoscope className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">Conduta Final — Veredito Clínico</h3>
          <p className="text-xs text-muted-foreground">
            Aplique a teoria ao paciente do P1: qual a conduta correta? Cobertura obrigatória de todos os objetivos do P5.
          </p>
        </div>
        {isFinalized && (
          <span className="rounded-full bg-emerald-500/15 text-emerald-700 text-[10px] px-2 py-1 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Consolidado
          </span>
        )}
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={!canEdit || isFinalized}
        placeholder="Descreva a conduta clínica final amarrando a teoria estudada à resolução prática do caso (ex: 'corrigir a dosagem para 50 mg porque…')."
        className="min-h-[140px]"
      />

      {objectives.length > 0 && (
        <div className="mt-3 rounded-xl bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground mb-1">Objetivos do P5 contemplados nesta conduta</p>
          {objectives.map((o) => (
            <label key={o.id} className="flex items-start gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={addressed.includes(o.id)}
                onCheckedChange={() => canEdit && !isFinalized && toggleObj(o.id)}
                disabled={!canEdit || isFinalized}
                className="mt-0.5"
              />
              <span className={addressed.includes(o.id) ? "text-foreground" : "text-muted-foreground"}>{o.content}</span>
            </label>
          ))}
        </div>
      )}

      {canEdit && !isFinalized && (
        <div className="mt-3 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => save(false)} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> Salvar rascunho
          </Button>
          {isProfessor && (
            <Button size="sm" onClick={() => save(true)} disabled={saving || !content.trim()}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Consolidar conduta
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
