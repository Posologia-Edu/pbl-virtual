import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface Props {
  isCoordinator: boolean;
  channel: any; // Supabase RealtimeChannel
}

export default function TimerPanel({ isCoordinator, channel }: Props) {
  const [seconds, setSeconds] = useState(300); // 5 min default
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Listen for broadcast events
  useEffect(() => {
    if (!channel) return;

    channel.on("broadcast", { event: "timer_sync" }, (payload: any) => {
      const { seconds: s, running: r } = payload.payload;
      setSeconds(s);
      setRunning(r);
    });
  }, [channel]);

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

  const broadcast = useCallback(
    (s: number, r: boolean) => {
      channel?.send({ type: "broadcast", event: "timer_sync", payload: { seconds: s, running: r } });
    },
    [channel]
  );

  const toggleTimer = () => {
    const next = !running;
    setRunning(next);
    broadcast(seconds, next);
  };

  const resetTimer = () => {
    setRunning(false);
    setSeconds(300);
    broadcast(300, false);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="flex items-center gap-3">
      <div className="font-mono text-2xl font-bold text-foreground tabular-nums">
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
