import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Send, Mic, MicOff, UserCircle2, Loader2, Quote, Timer, PlayCircle, Lock } from "lucide-react";

interface Props {
  roomId: string;
  sessionId?: string;
  isProfessor: boolean;
  currentStep: number;
  interviewPhase?: "opening" | "closing" | null;
  interviewEndAt?: string | null;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  id?: string;
  created_at?: string;
  user_id?: string;
}

const WINDOW_SECONDS = 5 * 60;

export default function PatientSimulatorPanel({
  roomId,
  sessionId,
  isProfessor,
  currentStep,
  interviewPhase,
  interviewEndAt,
}: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [names, setNames] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const currentPhase: "opening" | "closing" = currentStep === 7 ? "closing" : "opening";
  const endMs = interviewEndAt ? new Date(interviewEndAt).getTime() : 0;
  const remaining = Math.max(0, Math.floor((endMs - now) / 1000));
  const active = !!interviewEndAt && interviewPhase === currentPhase && remaining > 0;

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // Load history + realtime
  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    const load = async () => {
      const q = supabase.from("patient_interviews" as any)
        .select("id, role, content, created_at, user_id")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(200);
      const { data } = sessionId
        ? await q.eq("session_id", sessionId)
        : await q.is("session_id", null);
      if (alive && data) setMessages(data.filter((m: any) => m.role !== "system") as any);
    };
    load();
    const ch = supabase
      .channel(`patient-${roomId}-${sessionId || "none"}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "patient_interviews",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const m = payload.new as any;
        if (m.role === "system") return;
        if ((sessionId && m.session_id !== sessionId) || (!sessionId && m.session_id)) return;
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [roomId, sessionId]);

  // Fetch missing author names
  useEffect(() => {
    const missing = Array.from(new Set(messages.map((m) => m.user_id).filter((id): id is string => !!id && !names[id])));
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", missing);
      if (data) {
        setNames((prev) => {
          const next = { ...prev };
          for (const p of data as any[]) next[p.user_id] = p.full_name || "Participante";
          return next;
        });
      }
    })();
  }, [messages, names]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading || !active) return;
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("patient-simulator", {
        body: { room_id: roomId, session_id: sessionId, message: content },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Erro");
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setInput(content);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: "Voz indisponível", description: "Seu navegador não suporta reconhecimento de voz.", variant: "destructive" });
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setListening(false);
      setTimeout(() => send(text), 50);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  const citeInP7 = async (text: string) => {
    if (!user) return;
    const snippet = text.length > 200 ? text.slice(0, 200) + "…" : text;
    const { error } = await supabase.from("session_references").insert({
      room_id: roomId,
      session_id: sessionId,
      author_id: user.id,
      ref_type: "patient_interview",
      url: "",
      title: `Entrevista com paciente: "${snippet}"`,
    } as any);
    if (error) toast({ title: "Erro ao citar", description: error.message, variant: "destructive" });
    else toast({ title: "Citado no P7", description: "Trecho da entrevista adicionado às referências." });
  };

  const releaseInterview = async () => {
    if (!sessionId) {
      toast({ title: "Sessão necessária", description: "Inicie a sessão tutorial primeiro.", variant: "destructive" });
      return;
    }
    const endAt = new Date(Date.now() + WINDOW_SECONDS * 1000).toISOString();
    const { error } = await (supabase as any)
      .from("tutorial_sessions")
      .update({ patient_interview_phase: currentPhase, patient_interview_end_at: endAt })
      .eq("id", sessionId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entrevista liberada", description: "5 minutos para o grupo entrevistar o paciente." });
    }
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const phaseLabel = currentPhase === "opening" ? "Abertura" : "Fechamento";
  const nameOf = (uid?: string) => (uid && (uid === user?.id ? "Você" : names[uid])) || "Participante";

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3 flex items-center gap-2">
        <UserCircle2 className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Entrevistar Paciente</h3>
          <p className="text-[11px] text-muted-foreground">Simulador clínico — IA em personagem</p>
        </div>
        {active && (
          <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-mono tabular-nums ${
            remaining <= 30 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-primary/10 text-primary"
          }`}>
            <Timer className="h-3 w-3" />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        )}
      </div>

      {!active && (
        <div className="border-b border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              A entrevista com o paciente está <strong>bloqueada</strong>. O professor precisa liberar
              uma janela de <strong>5 minutos</strong> ({phaseLabel.toLowerCase()}) para o grupo perguntar.
            </p>
          </div>
          {isProfessor && (
            <Button size="sm" onClick={releaseInterview} className="w-full gap-2" disabled={!sessionId}>
              <PlayCircle className="h-4 w-4" />
              Liberar entrevista — {phaseLabel} (5 min)
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && !loading && (
          <div className="text-center text-xs text-muted-foreground py-8 px-4">
            {active
              ? <>Combinem com o coordenador a ordem das perguntas.<br />Ex: "Bom dia, o que trouxe você aqui hoje?"</>
              : <>Nenhuma entrevista realizada ainda nesta fase.</>}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={m.id || i} className={`flex flex-col ${m.user_id === user?.id && m.role === "user" ? "items-end" : "items-start"}`}>
            <p className="text-[11px] text-muted-foreground mb-0.5">
              {m.role === "user" ? nameOf(m.user_id) : "🧑‍⚕️ Paciente"}
            </p>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? m.user_id === user?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}>
              {m.content}
            </div>
            {m.role === "assistant" && (
              <button
                onClick={() => citeInP7(m.content)}
                className="mt-1 text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <Quote className="h-3 w-3" /> Citar no P7
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Paciente está respondendo…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <Button
          size="icon"
          variant={listening ? "destructive" : "outline"}
          onClick={toggleVoice}
          disabled={loading || !active}
          className="shrink-0"
          title={listening ? "Parar gravação" : "Falar"}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Input
          placeholder={active ? "Pergunte ao paciente..." : "Aguardando liberação do professor..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading || !active}
          className="text-sm"
        />
        <Button size="icon" onClick={() => send()} disabled={loading || !input.trim() || !active} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
