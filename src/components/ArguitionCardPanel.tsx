import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Brain, RefreshCw } from "lucide-react";

interface Props {
  sessionId: string;
  roomId: string;
  presentationId: string | null;
}

export default function ArguitionCardPanel({ sessionId, roomId, presentationId }: Props) {
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchCard = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("arguition_cards").select("*").eq("session_id", sessionId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    setCard(data || null);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { if (sessionId) fetchCard(); }, [sessionId, fetchCard]);

  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase.channel(`arg-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "arguition_cards", filter: `session_id=eq.${sessionId}` }, () => fetchCard())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, fetchCard]);

  const generate = async () => {
    if (!presentationId) {
      toast({ title: "Aguarde o upload da apresentação", variant: "destructive" });
      return;
    }
    setGenerating(true);
    const { error } = await supabase.functions.invoke("generate-arguition", {
      body: { sessionId, roomId, presentationId },
    });
    setGenerating(false);
    if (error) toast({ title: "Erro IA", description: error.message, variant: "destructive" });
    else toast({ title: "Card de arguição gerado!" });
  };

  return (
    <div className="clinical-card p-5 border-purple-500/30 bg-purple-500/5">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-5 w-5 text-purple-700" />
        <h3 className="text-base font-semibold text-foreground flex-1">Card de Arguição IA <span className="text-[10px] font-normal text-muted-foreground">(somente tutor)</span></h3>
        <Button size="sm" variant="outline" onClick={generate} disabled={generating || !presentationId}>
          {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : card ? <RefreshCw className="h-3.5 w-3.5 mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
          {card ? "Regenerar" : "Gerar"}
        </Button>
      </div>

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
      ) : !card ? (
        <p className="text-xs text-muted-foreground py-2">
          Após o upload da apresentação, gere perguntas de aprofundamento confrontando o conteúdo com os objetivos do P5.
        </p>
      ) : (
        <div className="space-y-3">
          {card.coverage_summary && (
            <div className="rounded-lg bg-background/70 p-3 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
              <span className="font-semibold text-purple-700">Cobertura: </span>
              {card.coverage_summary}
            </div>
          )}
          <ol className="list-decimal list-inside space-y-2 text-sm text-foreground/90">
            {(card.questions || []).map((q: string, i: number) => (
              <li key={i} className="leading-relaxed">{q}</li>
            ))}
          </ol>
          <p className="text-[10px] text-muted-foreground italic">
            Gerado em {new Date(card.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
      )}
    </div>
  );
}
