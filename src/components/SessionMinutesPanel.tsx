import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { FileText, Loader2, RefreshCw, Download } from "lucide-react";

interface Props {
  roomId: string;
  sessionId: string | undefined;
  sessionLabel?: string;
}

export default function SessionMinutesPanel({ roomId, sessionId, sessionLabel }: Props) {
  const { isProfessor } = useAuth();
  const [minutes, setMinutes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const fetchMinutes = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("session_minutes")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      setMinutes(data);
      setLoading(false);
    };
    fetchMinutes();
  }, [sessionId]);

  const generateMinutes = async () => {
    if (!sessionId || !roomId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-minutes", {
        body: { session_id: sessionId, room_id: roomId },
      });

      if (error) {
        toast({ title: "Erro", description: "Falha ao gerar ata.", variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      } else if (data?.minutes) {
        setMinutes(data.minutes);
        toast({ title: "Ata gerada com sucesso!" });
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado ao gerar ata.", variant: "destructive" });
    }
    setGenerating(false);
  };

  const downloadMinutes = () => {
    if (!minutes?.content?.text) return;
    const blob = new Blob([minutes.content.text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ata-${sessionLabel || "sessao"}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!sessionId) return null;

  return (
    <div className="clinical-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Ata da Sessão</h3>
        </div>
        <div className="flex items-center gap-2">
          {minutes && (
            <Button variant="outline" size="sm" onClick={downloadMinutes}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar
            </Button>
          )}
          {isProfessor && (
            <Button
              size="sm"
              onClick={generateMinutes}
              disabled={generating}
            >
              {generating ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Gerando...</>
              ) : minutes ? (
                <><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerar</>
              ) : (
                <><FileText className="mr-1.5 h-3.5 w-3.5" /> Gerar Ata</>
              )}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : minutes?.content?.text ? (
        <div className="prose prose-sm max-w-none rounded-xl bg-muted/30 p-5 text-foreground">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {minutes.content.text}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Gerada em {new Date(minutes.content.generated_at).toLocaleString("pt-BR")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <FileText className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {isProfessor
              ? "Nenhuma ata gerada ainda. Clique em \"Gerar Ata\" para compilar automaticamente."
              : "Nenhuma ata disponível para esta sessão."
            }
          </p>
        </div>
      )}
    </div>
  );
}
