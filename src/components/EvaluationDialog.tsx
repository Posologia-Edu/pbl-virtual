import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Sparkles, MessageSquare, BookOpen, FileText, Target, Users, Loader2 } from "lucide-react";

interface Evidence {
  type: "chat" | "reference" | "comment" | "objective" | "peer";
  snippet: string;
  timestamp?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roomId: string;
  sessionId?: string;
  studentId: string;
  studentName: string;
  criterionId: string;
  criterionLabel: string;
  onAccept: (grade: string) => void;
}

const TYPE_META: Record<Evidence["type"], { label: string; Icon: any }> = {
  chat: { label: "Chat", Icon: MessageSquare },
  reference: { label: "Referência", Icon: BookOpen },
  comment: { label: "Comentário", Icon: FileText },
  objective: { label: "Objetivo", Icon: Target },
  peer: { label: "Pares", Icon: Users },
};

export default function EvaluationDialog({
  open, onOpenChange, roomId, sessionId, studentId, studentName,
  criterionId, criterionLabel, onAccept,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    suggestion_id: string;
    grade: string;
    rationale: string;
    evidences: Evidence[];
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setError(null);
      return;
    }
    void fetchSuggestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchSuggestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-evaluation", {
        body: { room_id: roomId, session_id: sessionId, student_id: studentId, criterion_id: criterionId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
    } catch (e: any) {
      setError(e?.message || "Falha ao gerar sugestão");
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    if (!result) return;
    onAccept(result.grade);
    await supabase
      .from("evaluation_suggestions")
      .update({ accepted: true, applied_grade: result.grade } as any)
      .eq("id", result.suggestion_id);
    toast({ title: `Nota ${result.grade} aplicada` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Rubrica Inteligente
          </DialogTitle>
          <DialogDescription>
            Sugestão de nota para <strong>{studentName}</strong> no critério <em>"{criterionLabel}"</em>.
            A IA analisa evidências reais; o tutor decide.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analisando evidências da sessão…</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
            <Button variant="link" size="sm" onClick={fetchSuggestion} className="ml-2 h-auto p-0">
              Tentar de novo
            </Button>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-primary/10 p-4">
              <div>
                <p className="text-xs text-muted-foreground">Nota sugerida</p>
                <p className="text-3xl font-bold text-primary">{result.grade}</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" /> IA assistiva
              </Badge>
            </div>

            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Justificativa</h4>
              <p className="whitespace-pre-wrap text-sm text-foreground">{result.rationale}</p>
            </div>

            {result.evidences?.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Evidências ({result.evidences.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-auto scrollbar-thin pr-1">
                  {result.evidences.map((ev, i) => {
                    const meta = TYPE_META[ev.type] || TYPE_META.chat;
                    const { Icon } = meta;
                    return (
                      <div key={i} className="flex gap-2 rounded-lg border border-border p-2">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div className="flex-1 text-xs">
                          <div className="mb-0.5 flex items-center gap-2">
                            <span className="font-medium text-foreground">{meta.label}</span>
                            {ev.timestamp && (
                              <span className="text-muted-foreground">
                                {new Date(ev.timestamp).toLocaleString("pt-BR", {
                                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-foreground/80">{ev.snippet}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Descartar</Button>
              <Button onClick={accept}>Aceitar e aplicar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
