import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Send, Mic, MicOff, UserCircle2, Loader2, Quote } from "lucide-react";

interface Props {
  roomId: string;
  sessionId?: string;
}

interface Msg { role: "user" | "assistant"; content: string; id?: string; created_at?: string; }

export default function PatientSimulatorPanel({ roomId, sessionId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const q = supabase.from("patient_interviews" as any)
        .select("id, role, content, created_at")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(100);
      const { data } = sessionId
        ? await q.eq("session_id", sessionId)
        : await q.is("session_id", null);
      if (data) setMessages(data.filter((m: any) => m.role !== "system") as any);
    })();
  }, [roomId, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setMessages((p) => [...p, { role: "user", content }]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("patient-simulator", {
        body: { room_id: roomId, session_id: sessionId, message: content },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Erro");
      }
      setMessages((p) => [...p, { role: "assistant", content: (data as any).reply }]);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      setMessages((p) => p.slice(0, -1));
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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3 flex items-center gap-2">
        <UserCircle2 className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Entrevistar Paciente</h3>
          <p className="text-[11px] text-muted-foreground">Simulador clínico — IA em personagem</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && !loading && (
          <div className="text-center text-xs text-muted-foreground py-8 px-4">
            Comece se apresentando e fazendo perguntas de anamnese.
            <br />Ex: "Bom dia, o que trouxe você aqui hoje?"
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <p className="text-[11px] text-muted-foreground mb-0.5">
              {m.role === "user" ? "Você" : "🧑‍⚕️ Paciente"}
            </p>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
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
          disabled={loading}
          className="shrink-0"
          title={listening ? "Parar gravação" : "Falar"}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Input
          placeholder="Pergunte ao paciente..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
          className="text-sm"
        />
        <Button size="icon" onClick={() => send()} disabled={loading || !input.trim()} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
