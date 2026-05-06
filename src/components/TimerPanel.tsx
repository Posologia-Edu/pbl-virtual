import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Timer as TimerIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  isCoordinator: boolean;
  roomId: string;
  timerPhase?: "opening" | "closing";
}

const PHASE_DURATIONS = {
  opening: 80 * 60,
  closing: 110 * 60,
};

export default function TimerPanel({ isCoordinator, roomId, timerPhase = "opening" }: Props) {
  const phaseDuration = PHASE_DURATIONS[timerPhase];
  const [seconds, setSeconds] = useState(phaseDuration);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Load + subscribe
  useEffect(() => {
    if (!roomId) return;

    const apply = (r: any) => {
      if (r.timer_running && r.timer_end_at) {
        const remaining = Math.max(0, Math.round((new Date(r.timer_end_at).getTime() - Date.now()) / 1000));
        setSeconds(remaining);
        setRunning(remaining > 0);
      } else {
        setSeconds(phaseDuration);
        setRunning(false);
      }
    };

    supabase.from("rooms").select("timer_end_at, timer_running").eq("id", roomId).single().then(({ data }) => {
      if (data) apply(data);
    });

    const channel = supabase
      .channel(`timer-db-${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}`,
      }, (payload) => apply(payload.new))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, phaseDuration]);

  // Local countdown
  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      if (running && seconds === 0) setRunning(false);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, seconds]);

  const startTimer = async () => {
    if (running) return;
    const endAt = new Date(Date.now() + phaseDuration * 1000).toISOString();
    const { error } = await supabase.from("rooms").update({
      timer_end_at: endAt,
      timer_running: true,
    }).eq("id", roomId);
    if (error) {
      toast({ title: "Erro ao iniciar cronômetro", variant: "destructive" });
    } else {
      toast({ title: `Cronômetro iniciado: ${Math.floor(phaseDuration / 60)} minutos` });
    }
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds <= 60 && seconds > 0;
  const phaseLabel = timerPhase === "opening" ? "Abertura · 80 min" : "Fechamento · 110 min";

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-end">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <TimerIcon className="h-3 w-3" /> {phaseLabel}
        </span>
        <div
          className={`font-mono text-2xl font-bold tabular-nums transition-opacity ${
            isUrgent ? "animate-pulse text-destructive" : running ? "text-primary" : "text-foreground"
          }`}
        >
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </div>
      {isCoordinator && !running && seconds === phaseDuration && (
        <Button size="sm" onClick={startTimer} className="gap-1">
          <Play className="h-3.5 w-3.5" /> Iniciar
        </Button>
      )}
    </div>
  );
}
