import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Trash2, Loader2, ExternalLink, ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  roomId: string;
  sessionId: string;
  isReporter: boolean;
  userId: string | null;
  onPresentationLoaded?: (presentationId: string | null) => void;
  currentSlide?: number;
  onSlideChange?: (n: number) => void;
}

interface Presentation {
  id: string;
  file_name: string;
  file_url: string;
  file_path: string;
  mime_type: string;
  uploaded_by: string;
}

export default function PresentationPanel({ roomId, sessionId, isReporter, userId, onPresentationLoaded }: Props) {
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPres = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("session_presentations")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPresentation(data || null);
    setLoading(false);
    onPresentationLoaded?.(data?.id || null);
  };

  useEffect(() => {
    if (!sessionId) return;
    fetchPres();

    const ch = supabase.channel(`pres-${sessionId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "session_presentations", filter: `session_id=eq.${sessionId}`,
      }, () => fetchPres())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Use PDF ou PPTX.", variant: "destructive" });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 50MB.", variant: "destructive" });
      return;
    }
    setUploading(true);

    // Delete previous if exists
    if (presentation) {
      await supabase.storage.from("presentations").remove([presentation.file_path]);
      await (supabase as any).from("session_presentations").delete().eq("id", presentation.id);
    }

    const ext = file.name.split(".").pop();
    const path = `${userId}/${sessionId}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("presentations").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    if (upErr) {
      toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("presentations").getPublicUrl(path);

    const { error: insErr } = await (supabase as any).from("session_presentations").insert({
      room_id: roomId,
      session_id: sessionId,
      uploaded_by: userId,
      file_url: urlData.publicUrl,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
    });
    if (insErr) {
      toast({ title: "Erro ao registrar", description: insErr.message, variant: "destructive" });
    } else {
      toast({ title: "Apresentação enviada!" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDelete = async () => {
    if (!presentation) return;
    await supabase.storage.from("presentations").remove([presentation.file_path]);
    await (supabase as any).from("session_presentations").delete().eq("id", presentation.id);
    toast({ title: "Apresentação removida" });
  };

  const isPdf = presentation?.mime_type === "application/pdf";
  const viewerUrl = presentation
    ? isPdf
      ? presentation.file_url
      : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(presentation.file_url)}`
    : null;

  return (
    <div className="clinical-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Apresentação do Relator
        </h3>
        {isReporter && (
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={onUpload}
            />
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              {presentation ? "Substituir" : "Enviar PPTX/PDF"}
            </Button>
            {presentation && (
              <Button size="sm" variant="outline" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !presentation ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {isReporter
            ? "Envie uma apresentação (PPTX ou PDF) para que todos da sala possam visualizar."
            : "O relator ainda não enviou apresentação para esta sessão."}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate flex-1">{presentation.file_name}</span>
            <a href={presentation.file_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost"><ExternalLink className="h-3.5 w-3.5" /></Button>
            </a>
          </div>
          <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden border border-border">
            <iframe
              src={viewerUrl!}
              className="w-full h-full"
              title={presentation.file_name}
              allow="fullscreen"
            />
          </div>
        </div>
      )}
    </div>
  );
}
