import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, FileEdit, User, MoreVertical, StickyNote, ChevronLeft, Save, Loader2, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BadgesPanel from "@/components/BadgesPanel";
import { toast } from "@/hooks/use-toast";

interface Participant {
  student_id: string;
  full_name: string;
}

interface Props {
  participants: Participant[];
  coordinatorId: string | null;
  reporterId: string | null;
  isProfessor: boolean;
  onAssignRole: (studentId: string, role: "coordinator" | "reporter" | "none") => void;
  onlineUserIds?: Set<string>;
  sessionId?: string | null;
  professorId?: string | null;
  roomId?: string | null;
  isCoordinator?: boolean;
  currentStep?: number;
  sessionStartedAt?: string | null;
}

const roleConfig = {
  coordinator: { label: "Coordenador", icon: Crown, color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  reporter: { label: "Relator", icon: FileEdit, color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  participant: { label: "Participante", icon: User, color: "bg-secondary text-muted-foreground border-border" },
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

export default function ParticipantsPanel({
  participants, coordinatorId, reporterId, isProfessor, onAssignRole,
  onlineUserIds = new Set(), sessionId, professorId, roomId, isCoordinator,
  currentStep = 0, sessionStartedAt = null,
}: Props) {
  const [selectedStudent, setSelectedStudent] = useState<Participant | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);

  // Speaking time tracking
  const [speakingTimes, setSpeakingTimes] = useState<Record<string, number>>({});
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval>>();
  const startedAtRef = useRef<number | null>(null);

  // Fetch speaking times + realtime
  const fetchTimes = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await (supabase as any)
      .from("participant_speaking_times")
      .select("student_id, total_seconds")
      .eq("session_id", sessionId);
    if (data) {
      const map: Record<string, number> = {};
      data.forEach((d: any) => { map[d.student_id] = d.total_seconds; });
      setSpeakingTimes(map);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    fetchTimes();
    const ch = supabase.channel(`speak-${sessionId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "participant_speaking_times", filter: `session_id=eq.${sessionId}`,
      }, () => fetchTimes())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, fetchTimes]);

  // Local ticker for active speaker (visual only)
  useEffect(() => {
    if (activeSpeakerId) {
      startedAtRef.current = Date.now();
      tickerRef.current = setInterval(() => {
        setSpeakingTimes((prev) => ({
          ...prev,
          [activeSpeakerId]: (prev[activeSpeakerId] || 0) + 1,
        }));
      }, 1000);
    }
    return () => clearInterval(tickerRef.current);
  }, [activeSpeakerId]);

  const persistDelta = async (studentId: string, addedSeconds: number) => {
    if (!sessionId || !roomId || addedSeconds <= 0) return;
    // Try update; if no row, insert
    const newTotal = (speakingTimes[studentId] || 0);
    const { data: existing } = await (supabase as any)
      .from("participant_speaking_times")
      .select("id, total_seconds")
      .eq("session_id", sessionId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (existing) {
      await (supabase as any).from("participant_speaking_times")
        .update({ total_seconds: existing.total_seconds + addedSeconds, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await (supabase as any).from("participant_speaking_times").insert({
        room_id: roomId,
        session_id: sessionId,
        student_id: studentId,
        total_seconds: addedSeconds,
      });
    }
  };

  const onParticipantClick = async (p: Participant) => {
    // Coordinator: speaking timer toggle
    if (isCoordinator && sessionId && !isProfessor) {
      const now = Date.now();
      if (activeSpeakerId === p.student_id) {
        // Pause
        const elapsed = startedAtRef.current ? Math.round((now - startedAtRef.current) / 1000) : 0;
        clearInterval(tickerRef.current);
        setActiveSpeakerId(null);
        await persistDelta(p.student_id, elapsed);
        return;
      }
      // Switch: persist previous, start new
      if (activeSpeakerId && startedAtRef.current) {
        const elapsed = Math.round((now - startedAtRef.current) / 1000);
        await persistDelta(activeSpeakerId, elapsed);
      }
      clearInterval(tickerRef.current);
      setActiveSpeakerId(p.student_id);
      return;
    }
    // Professor: open notes
    if (isProfessor && sessionId) {
      setSelectedStudent(p);
      loadNote(p.student_id);
    }
  };

  // Persist on unmount
  useEffect(() => {
    return () => {
      if (activeSpeakerId && startedAtRef.current) {
        const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
        persistDelta(activeSpeakerId, elapsed);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpeakerId]);

  const getRole = (id: string) => {
    if (id === coordinatorId) return "coordinator";
    if (id === reporterId) return "reporter";
    return "participant";
  };

  const loadNote = useCallback(async (studentId: string) => {
    if (!sessionId || !professorId) return;
    setLoadingNote(true);
    const { data } = await (supabase as any)
      .from("professor_notes")
      .select("content")
      .eq("session_id", sessionId)
      .eq("student_id", studentId)
      .eq("professor_id", professorId)
      .maybeSingle();
    setNoteContent(data?.content || "");
    setLoadingNote(false);
  }, [sessionId, professorId]);

  const saveNote = async () => {
    if (!sessionId || !professorId || !selectedStudent) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("professor_notes")
      .upsert({
        session_id: sessionId,
        student_id: selectedStudent.student_id,
        professor_id: professorId,
        content: noteContent,
      }, { onConflict: "session_id,student_id,professor_id" });
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar anotação", variant: "destructive" });
    else toast({ title: "Anotação salva!" });
  };

  const sorted = [...participants].sort((a, b) => {
    const aOnline = onlineUserIds.has(a.student_id) ? 0 : 1;
    const bOnline = onlineUserIds.has(b.student_id) ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    return a.full_name.localeCompare(b.full_name);
  });

  if (selectedStudent) {
    const role = getRole(selectedStudent.student_id);
    const cfg = roleConfig[role];
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedStudent(null)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{selectedStudent.full_name}</p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-0.5 ${cfg.color}`}>
              {cfg.label}
            </Badge>
          </div>
          <StickyNote className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-h-0">
          {loadingNote ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Escreva suas anotações sobre este aluno para o feedback..."
              className="min-h-[200px] h-full resize-none text-sm"
            />
          )}
        </div>

        <Button onClick={saveNote} disabled={saving || loadingNote} className="mt-3 w-full" size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar anotação
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {isCoordinator && !isProfessor && (
        <p className="text-[11px] text-muted-foreground px-2 mb-2 flex items-center gap-1">
          <Mic className="h-3 w-3" /> Toque em um colega para cronometrar a fala. Toque novamente para pausar.
        </p>
      )}
      {sorted.map((p) => {
        const role = getRole(p.student_id);
        const cfg = roleConfig[role];
        const Icon = cfg.icon;
        const isOnline = onlineUserIds.has(p.student_id);
        const isActive = activeSpeakerId === p.student_id;
        const speakSec = speakingTimes[p.student_id] || 0;
        const clickable = (isProfessor && sessionId) || (isCoordinator && !isProfessor && sessionId);

        return (
          <div
            key={p.student_id}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors group ${
              clickable ? "cursor-pointer hover:bg-secondary/50" : ""
            } ${isActive ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
            onClick={() => onParticipantClick(p)}
          >
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                  isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                {p.full_name}
                {isActive && <Mic className="h-3 w-3 text-primary animate-pulse" />}
              </p>
              <BadgesPanel userId={p.student_id} compact />
            </div>
            {(speakSec > 0 || isActive) && (
              <span className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                {fmt(speakSec)}
              </span>
            )}
            {isProfessor && sessionId && (
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            )}
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
              {cfg.label}
            </Badge>
            {isProfessor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onAssignRole(p.student_id, "coordinator")}>
                    <Crown className="mr-2 h-3.5 w-3.5 text-amber-600" /> Coordenador
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAssignRole(p.student_id, "reporter")}>
                    <FileEdit className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Relator
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAssignRole(p.student_id, "none")}>
                    <User className="mr-2 h-3.5 w-3.5" /> Participante
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}
