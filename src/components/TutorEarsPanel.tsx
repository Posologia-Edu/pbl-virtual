import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Mic, Square, Loader2, Ear, RefreshCw, BookMarked, Users } from "lucide-react";

interface Props {
  roomId: string;
  sessionId?: string;
  isCoordinator: boolean;
  isProfessor: boolean;
}

type Recording = {
  id: string;
  audio_path: string;
  status: "pending" | "processing" | "ready" | "failed";
  duration_seconds: number | null;
  transcript: any;
  participation: any;
  speaker_labels: any;
  label: string | null;
  error_message: string | null;
  started_by: string;
  created_at: string;
};

function fmtTime(s: number) {
  if (!s && s !== 0) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function TutorEarsPanel({ roomId, sessionId, isCoordinator, isProfessor }: Props) {
  const { user } = useAuth();
  const [recs, setRecs] = useState<Recording[]>([]);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const canControl = isCoordinator || isProfessor;

  const fetchRecs = async () => {
    if (!sessionId) return;
    const { data } = await (supabase as any)
      .from("session_audio_recordings")
      .select("*")
      .eq("room_id", roomId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    setRecs(data || []);
    if (!selected && data?.[0]) setSelected(data[0].id);
  };

  useEffect(() => { fetchRecs(); /* eslint-disable-next-line */ }, [sessionId, roomId]);

  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase
      .channel(`audio-rec-${sessionId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "session_audio_recordings", filter: `session_id=eq.${sessionId}` },
        () => fetchRecs(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [sessionId]);

  const startRecording = async () => {
    if (!sessionId) {
      toast({ title: "Inicie a sessão primeiro.", variant: "destructive" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await uploadAndTranscribe(blob);
      };
      mr.start(1000);
      mediaRef.current = mr;
      setRecording(true);
      startTsRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
      }, 1000);
    } catch (e: any) {
      toast({ title: "Permissão de microfone negada", description: e?.message, variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  };

  const uploadAndTranscribe = async (blob: Blob) => {
    if (!user || !sessionId) return;
    setUploading(true);
    try {
      const path = `audio/${roomId}/${sessionId}/${Date.now()}-${user.id.slice(0, 8)}.webm`;
      const { error: upErr } = await supabase.storage.from("references").upload(path, blob, {
        contentType: "audio/webm",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: inserted, error: insErr } = await (supabase as any)
        .from("session_audio_recordings")
        .insert({
          room_id: roomId,
          session_id: sessionId,
          started_by: user.id,
          audio_path: path,
          mime_type: "audio/webm",
          status: "pending",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      setTranscribing(inserted.id);
      toast({ title: "Áudio enviado. Transcrevendo..." });

      const { data, error } = await supabase.functions.invoke("transcribe-session", {
        body: { recording_id: inserted.id },
      });
      if (error || (data as any)?.error) {
        toast({
          title: "Falha ao transcrever",
          description: (data as any)?.error || error?.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Transcrição concluída!" });
      }
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setTranscribing(null);
      fetchRecs();
    }
  };

  const retranscribe = async (id: string) => {
    setTranscribing(id);
    const { data, error } = await supabase.functions.invoke("transcribe-session", { body: { recording_id: id } });
    if (error || (data as any)?.error) {
      toast({ title: "Falha", description: (data as any)?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Retranscrito!" });
    }
    setTranscribing(null);
    fetchRecs();
  };

  const sel = recs.find((r) => r.id === selected) || null;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Ear className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Tutor Ears</h3>
          <Badge variant="secondary" className="ml-auto text-[10px]">Beta</Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Gravação, transcrição com diarização e mapa de participação oral.
        </p>
      </div>

      {canControl && (
        <div className="border-b border-border p-3 space-y-2">
          {!recording ? (
            <Button
              onClick={startRecording}
              disabled={uploading || !sessionId}
              className="w-full"
              size="sm"
            >
              <Mic className="mr-1.5 h-4 w-4" /> Iniciar gravação
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive" className="w-full" size="sm">
              <Square className="mr-1.5 h-4 w-4" /> Parar ({fmtTime(elapsed)})
            </Button>
          )}
          {uploading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Enviando e processando áudio...
            </div>
          )}
          {!sessionId && (
            <p className="text-[11px] text-muted-foreground italic">Aguardando início da sessão.</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto scrollbar-thin">
        {recs.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Nenhuma gravação ainda nesta sessão.
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {recs.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`block w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                  selected === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  Duração: {fmtTime(r.duration_seconds || 0)}
                </div>
              </button>
            ))}
          </div>
        )}

        {sel && (
          <div className="border-t border-border p-3 space-y-3">
            {sel.status === "processing" || transcribing === sel.id ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Transcrevendo...
              </div>
            ) : sel.status === "failed" ? (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{sel.error_message || "Falha."}</p>
                {canControl && (
                  <Button size="sm" variant="outline" onClick={() => retranscribe(sel.id)}>
                    <RefreshCw className="mr-1.5 h-3 w-3" /> Tentar de novo
                  </Button>
                )}
              </div>
            ) : sel.status === "ready" && sel.transcript ? (
              <>
                {sel.participation?.by_speaker?.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <Users className="h-3 w-3" /> Mapa de participação oral
                    </div>
                    <ParticipationBars data={sel.participation.by_speaker} />
                  </div>
                )}

                {sel.transcript.glossary_hits?.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                      <BookMarked className="h-3 w-3" /> Termos do glossário citados
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {sel.transcript.glossary_hits.map((g: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {g.term} <span className="ml-1 opacity-60">· {g.speaker}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-1 text-[11px] font-semibold text-foreground">Transcrição</div>
                  <div className="space-y-1 rounded-md bg-muted/40 p-2 text-xs leading-relaxed max-h-80 overflow-auto scrollbar-thin">
                    {sel.transcript.segments?.map((s: any, i: number) => (
                      <div key={i}>
                        <span className="font-semibold text-primary">{s.speaker}</span>{" "}
                        <span className="text-[10px] text-muted-foreground">[{fmtTime(s.start)}]</span>{" "}
                        <span className="text-foreground">{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Aguardando processamento.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
    processing: { label: "Processando", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    ready: { label: "Pronto", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    failed: { label: "Falha", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status] || map.pending;
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${m.cls}`}>{m.label}</span>;
}

function ParticipationBars({ data }: { data: Array<{ speaker: string; speaking_seconds: number; turns: number }> }) {
  const total = Math.max(1, data.reduce((s, d) => s + d.speaking_seconds, 0));
  return (
    <div className="space-y-1">
      {data
        .slice()
        .sort((a, b) => b.speaking_seconds - a.speaking_seconds)
        .map((d) => {
          const pct = Math.round((d.speaking_seconds / total) * 100);
          return (
            <div key={d.speaker} className="text-[10px]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{d.speaker}</span>
                <span className="text-muted-foreground">
                  {fmtTime(d.speaking_seconds)} · {d.turns} fala{d.turns === 1 ? "" : "s"} · {pct}%
                </span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
    </div>
  );
}
