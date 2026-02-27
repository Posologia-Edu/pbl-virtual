import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { FileText, Loader2, RefreshCw, Download, Eye, EyeOff } from "lucide-react";
import jsPDF from "jspdf";

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

    // Realtime: listen for inserts/updates so students see the ATA instantly when released
    const channel = supabase
      .channel(`session-minutes-${sessionId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "session_minutes",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: any) => {
          if (payload.new) {
            setMinutes(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const toggleRelease = async () => {
    if (!minutes?.id) return;
    const newValue = !minutes.is_released;
    const { error } = await (supabase as any)
      .from("session_minutes")
      .update({ is_released: newValue })
      .eq("id", minutes.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setMinutes((prev: any) => ({ ...prev, is_released: newValue }));
      toast({ title: newValue ? "Ata liberada para os alunos" : "Ata ocultada dos alunos" });
    }
  };

  const downloadMarkdown = () => {
    if (!minutes?.content?.text) return;
    const blob = new Blob([minutes.content.text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ata-${sessionLabel || "sessao"}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    if (!minutes?.content?.text) return;
    const doc = new jsPDF();
    const title = `Ata - ${sessionLabel || "Sessão"}`;
    const date = new Date(minutes.content.generated_at).toLocaleString("pt-BR");

    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Gerada em: ${date}`, 14, 28);
    doc.setTextColor(0);
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(minutes.content.text, 180);
    let y = 36;
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 14;
      }
      doc.text(line, 14, y);
      y += 6;
    }

    doc.save(`ata-${sessionLabel || "sessao"}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!sessionId) return null;

  // Students: only show if released
  if (!isProfessor && (!minutes || !minutes.is_released)) {
    return null;
  }

  return (
    <div className="clinical-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Ata da Sessão</h3>
        </div>
        <div className="flex items-center gap-2">
          {minutes?.content?.text && (
            <>
              <Button variant="outline" size="sm" onClick={downloadMarkdown}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> MD
              </Button>
              <Button variant="outline" size="sm" onClick={downloadPDF}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
              </Button>
            </>
          )}
          {isProfessor && minutes?.content?.text && (
            <Button
              variant={minutes.is_released ? "secondary" : "outline"}
              size="sm"
              onClick={toggleRelease}
              title={minutes.is_released ? "Ocultar dos alunos" : "Liberar para alunos"}
            >
              {minutes.is_released ? (
                <><EyeOff className="mr-1.5 h-3.5 w-3.5" /> Ocultar</>
              ) : (
                <><Eye className="mr-1.5 h-3.5 w-3.5" /> Liberar</>
              )}
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
      ) : isProfessor ? (
        <div className="flex flex-col items-center py-8 text-center">
          <FileText className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Nenhuma ata gerada ainda. Clique em "Gerar Ata" para compilar automaticamente.
          </p>
        </div>
      ) : null}
    </div>
  );
}
