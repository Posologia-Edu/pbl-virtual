import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays, Plus, Clock, Trash2, CheckCircle2, XCircle,
  BookOpen, ChevronLeft, ChevronRight,
} from "lucide-react";
import Layout from "@/components/Layout";

interface SemesterSession {
  id: string;
  room_id: string;
  professor_id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number;
  status: string;
  created_at: string;
}

export default function SemesterPlanning() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SemesterSession[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [editSession, setEditSession] = useState<SemesterSession | null>(null);

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formRoomId, setFormRoomId] = useState("");
  const [formTime, setFormTime] = useState("08:00");
  const [formDuration, setFormDuration] = useState("120");
  const [formStatus, setFormStatus] = useState("scheduled");

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const { data } = await supabase
      .from("semester_sessions")
      .select("*")
      .gte("scheduled_date", start)
      .lte("scheduled_date", end)
      .order("scheduled_date");
    if (data) setSessions(data as SemesterSession[]);
  }, [user, currentMonth]);

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("rooms")
      .select("id, name, groups(name)")
      .eq("status", "active");
    if (data) setRooms(data);
  }, [user]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const datesWithSessions = sessions.map((s) => parseISO(s.scheduled_date));
  const dayHasSession = (day: Date) => datesWithSessions.some((d) => isSameDay(d, day));
  const selectedDaySessions = sessions.filter((s) => isSameDay(parseISO(s.scheduled_date), selectedDate));

  const openNewDialog = () => {
    setEditSession(null);
    setFormTitle("");
    setFormDesc("");
    setFormRoomId(rooms[0]?.id || "");
    setFormTime("08:00");
    setFormDuration("120");
    setFormStatus("scheduled");
    setShowDialog(true);
  };

  const openEditDialog = (s: SemesterSession) => {
    setEditSession(s);
    setFormTitle(s.title);
    setFormDesc(s.description || "");
    setFormRoomId(s.room_id);
    setFormTime(s.scheduled_time?.slice(0, 5) || "08:00");
    setFormDuration(s.duration_minutes.toString());
    setFormStatus(s.status);
    setShowDialog(true);
  };

  const saveSession = async () => {
    if (!formTitle.trim() || !formRoomId) {
      toast({ title: "Preencha título e sala", variant: "destructive" });
      return;
    }

    const payload = {
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      room_id: formRoomId,
      professor_id: user!.id,
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
      scheduled_time: formTime || null,
      duration_minutes: parseInt(formDuration) || 120,
      status: formStatus,
    };

    if (editSession) {
      const { error } = await supabase
        .from("semester_sessions")
        .update(payload)
        .eq("id", editSession.id);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sessão atualizada!" });
      }
    } else {
      const { error } = await supabase
        .from("semester_sessions")
        .insert(payload);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sessão agendada!" });
      }
    }

    setShowDialog(false);
    fetchSessions();
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from("semester_sessions").delete().eq("id", id);
    if (!error) {
      toast({ title: "Sessão removida" });
      fetchSessions();
    }
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-500",
    completed: "bg-emerald-500",
    cancelled: "bg-muted-foreground/40",
  };

  const statusLabels: Record<string, string> = {
    scheduled: "Agendada",
    completed: "Concluída",
    cancelled: "Cancelada",
  };

  const prevMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Planejamento de Semestre
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize as sessões PBL ao longo do semestre
            </p>
          </div>
          <Button onClick={openNewDialog} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Sessão
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Calendar */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              className={cn("p-0 pointer-events-auto w-full")}
              modifiers={{ hasSession: (day) => dayHasSession(day) }}
              modifiersClassNames={{ hasSession: "bg-primary/10 font-bold text-primary" }}
              classNames={{
                day_selected: "bg-primary text-primary-foreground hover:bg-primary/90",
                day_today: "border border-primary/40",
                cell: "h-12 w-full",
                day: "h-12 w-full text-sm",
                head_cell: "text-muted-foreground font-medium text-xs w-full",
                table: "w-full",
              }}
            />
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary/20" /> Com sessões</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Agendada</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Concluída</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" /> Cancelada</span>
            </div>
          </div>

          {/* Day detail panel */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <span className="text-xs text-muted-foreground">
                {selectedDaySessions.length} sessão(ões)
              </span>
            </div>

            {selectedDaySessions.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                <CalendarDays className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Nenhuma sessão agendada.</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openNewDialog}>
                  <Plus className="h-3 w-3" /> Agendar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDaySessions.map((s) => {
                  const room = rooms.find((r) => r.id === s.room_id);
                  return (
                    <div
                      key={s.id}
                      className="rounded-xl border border-border p-3 space-y-2 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openEditDialog(s)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${statusColors[s.status]}`} />
                          <div>
                            <p className="text-sm font-medium">{s.title}</p>
                            {room && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <BookOpen className="h-3 w-3" /> {room.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {s.scheduled_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {s.scheduled_time.slice(0, 5)}
                          </span>
                        )}
                        <span>{s.duration_minutes}min</span>
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium">
                          {statusLabels[s.status]}
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-2">{s.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editSession ? "Editar Sessão" : "Nova Sessão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground/70 mb-1 block">Título *</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Sessão de Abertura - Caso Clínico 3" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/70 mb-1 block">Sala *</label>
              <Select value={formRoomId} onValueChange={setFormRoomId}>
                <SelectTrigger><SelectValue placeholder="Selecionar sala" /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground/70 mb-1 block">Horário</label>
                <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground/70 mb-1 block">Duração (min)</label>
                <Input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} />
              </div>
            </div>
            {editSession && (
              <div>
                <label className="text-xs font-medium text-foreground/70 mb-1 block">Status</label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-foreground/70 mb-1 block">Descrição</label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Observações sobre esta sessão..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={saveSession}>{editSession ? "Salvar" : "Agendar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
