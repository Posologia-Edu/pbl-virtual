import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  isCoordinator: boolean;
  roomId: string;
}

export default function TimerPanel({ isCoordinator, roomId }: Props) {
  const [seconds, setSeconds] = useState(300);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Load timer state from DB on mount + subscribe to changes
  useEffect(() => {
    if (!roomId) return;

    const loadTimerState = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("timer_end_at, timer_running")
        .eq("id", roomId)
        .single();
      if (data) {
        if (data.timer_running && data.timer_end_at) {
          const remaining = Math.max(0, Math.round((new Date(data.timer_end_at).getTime() - Date.now()) / 1000));
          setSeconds(remaining);
          setRunning(remaining > 0);
        } else if (!data.timer_running && data.timer_end_at) {
          // Paused: timer_end_at stores remaining seconds as a future offset from epoch 0
          // We store remaining seconds directly when paused
          const remaining = Math.max(0, Math.round((new Date(data.timer_end_at).getTime() - Date.now()) / 1000));
          setSeconds(remaining > 0 ? remaining : 300);
          setRunning(false);
        } else {
          setSeconds(300);
          setRunning(false);
        }
      }
    };
    loadTimerState();

    // Listen for DB changes to timer fields
    const channel = supabase
      .channel(`timer-db-${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        const r = payload.new as any;
        if (r.timer_running && r.timer_end_at) {
          const remaining = Math.max(0, Math.round((new Date(r.timer_end_at).getTime() - Date.now()) / 1000));
          setSeconds(remaining);
          setRunning(remaining > 0);
        } else if (!r.timer_running && r.timer_end_at) {
          // Paused with saved remaining time
          const remaining = Math.max(0, Math.round((new Date(r.timer_end_at).getTime() - Date.now()) / 1000));
          setSeconds(remaining > 0 ? remaining : 0);
          setRunning(false);
        } else {
          setSeconds(300);
          setRunning(false);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Local countdown
  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, seconds]);

  const persistTimer = useCallback(
    async (remainingSeconds: number, isRunning: boolean) => {
      if (!roomId) return;
      if (isRunning) {
        // Store the absolute end time
        const endAt = new Date(Date.now() + remainingSeconds * 1000).toISOString();
        await supabase.from("rooms").update({
          timer_end_at: endAt,
          timer_running: true,
        }).eq("id", roomId);
      } else {
        // Store remaining time as a future timestamp so we can recover it
        const endAt = remainingSeconds > 0
          ? new Date(Date.now() + remainingSeconds * 1000).toISOString()
          : null;
        await supabase.from("rooms").update({
          timer_end_at: endAt,
          timer_running: false,
        }).eq("id", roomId);
      }
    },
    [roomId]
  );

  const toggleTimer = () => {
    const next = !running;
    setRunning(next);
    persistTimer(seconds, next);
  };

  const resetTimer = () => {
    setRunning(false);
    setSeconds(300);
    persistTimer(300, false);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds <= 10 && seconds > 0;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`font-mono text-2xl font-bold tabular-nums transition-opacity ${
          isUrgent ? "animate-pulse text-destructive" : "text-foreground"
        }`}
      >
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>
      {isCoordinator && (
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={toggleTimer}>
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={resetTimer}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
