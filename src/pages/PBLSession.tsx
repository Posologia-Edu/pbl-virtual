import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import ChatPanel from "@/components/ChatPanel";
import EvaluationPanel from "@/components/EvaluationPanel";
import ParticipantsPanel from "@/components/ParticipantsPanel";
import TimerPanel from "@/components/TimerPanel";
import {
  BookOpen, List, HelpCircle, Brain, Target, FileText,
  Send, Plus, Trash2, Eye, EyeOff,
  ClipboardList, MessageSquare, ArrowLeft, Users, Timer,
} from "lucide-react";

const PBL_STEPS = [
  { id: 0, label: "Cenário", icon: BookOpen, block: "Abertura" },
  { id: 1, label: "Termos", icon: List, block: "Abertura" },
  { id: 2, label: "Problema", icon: HelpCircle, block: "Abertura" },
  { id: 3, label: "Brainstorming", icon: Brain, block: "Abertura" },
  { id: 5, label: "Objetivos", icon: Target, block: "Abertura" },
  { id: 7, label: "Síntese", icon: FileText, block: "Fechamento" },
];

export default function PBLSession() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, isProfessor } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");
  const [rightPanel, setRightPanel] = useState<"chat" | "eval" | "participants" | null>("chat");
  const [participants, setParticipants] = useState<any[]>([]);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);

  // Fetch room
  useEffect(() => {
    if (!roomId) return;
    const fetchRoom = async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (data) {
        setRoom(data);
        setActiveStep(data.current_step || 0);
      }
    };
    fetchRoom();

    // Subscribe to room changes (for role updates)
    const roomChannel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      }, (payload) => {
        setRoom((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { supabase.removeChannel(roomChannel); };
  }, [roomId]);

  // Fetch participants
  useEffect(() => {
    if (!room?.group_id) return;
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from("group_members")
        .select("student_id, profiles(full_name)")
        .eq("group_id", room.group_id);
      if (data) {
        setParticipants(
          data.map((d: any) => ({
            student_id: d.student_id,
            full_name: (d.profiles as any)?.full_name || "—",
          }))
        );
      }
    };
    fetchParticipants();
  }, [room?.group_id]);

  // Setup realtime broadcast channel for timer
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`timer-${roomId}`);
    channel.subscribe();
    setRealtimeChannel(channel);
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Fetch step items
  useEffect(() => {
    if (!roomId) return;
    const fetchItems = async () => {
      const { data } = await supabase
        .from("step_items")
        .select("*, profiles!step_items_author_id_fkey(full_name)")
        .eq("room_id", roomId)
        .eq("step", activeStep)
        .order("created_at");
      if (data) setItems(data);
    };
    fetchItems();

    const channel = supabase
      .channel(`step-items-${roomId}-${activeStep}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "step_items",
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        if ((payload.new as any).step === activeStep) {
          setItems((prev) => [...prev, payload.new]);
        }
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "step_items",
      }, (payload) => {
        setItems((prev) => prev.filter((i) => i.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, activeStep]);

  const addItem = async () => {
    if (!newItem.trim() || !user || !roomId) return;
    const { error } = await supabase.from("step_items").insert({
      room_id: roomId,
      step: activeStep,
      content: newItem.trim(),
      author_id: user.id,
    });
    if (!error) setNewItem("");
    else toast({ title: "Erro", description: error.message, variant: "destructive" });
  };

  const deleteItem = async (id: string) => {
    await supabase.from("step_items").delete().eq("id", id);
  };

  const releaseScenario = async () => {
    if (!roomId) return;
    await supabase.from("rooms").update({ is_scenario_released: true }).eq("id", roomId);
    setRoom((prev: any) => ({ ...prev, is_scenario_released: true }));
    toast({ title: "Cenário liberado para os alunos!" });
  };

  const updateStep = async (step: number) => {
    setActiveStep(step);
    if (isProfessor && roomId) {
      await supabase.from("rooms").update({ current_step: step }).eq("id", roomId);
    }
  };

  const assignRole = async (studentId: string, role: "coordinator" | "reporter" | "none") => {
    if (!roomId) return;
    const updates: any = {};
    if (role === "coordinator") {
      updates.coordinator_id = studentId;
      // If this student was reporter, clear it
      if (room?.reporter_id === studentId) updates.reporter_id = null;
    } else if (role === "reporter") {
      updates.reporter_id = studentId;
      if (room?.coordinator_id === studentId) updates.coordinator_id = null;
    } else {
      if (room?.coordinator_id === studentId) updates.coordinator_id = null;
      if (room?.reporter_id === studentId) updates.reporter_id = null;
    }
    await supabase.from("rooms").update(updates).eq("id", roomId);
    setRoom((prev: any) => ({ ...prev, ...updates }));
    toast({ title: "Função atualizada!" });
  };

  const openingSteps = PBL_STEPS.filter((s) => s.block === "Abertura");
  const closingSteps = PBL_STEPS.filter((s) => s.block === "Fechamento");

  const canViewScenario = isProfessor || room?.is_scenario_released;
  const currentStepInfo = PBL_STEPS.find((s) => s.id === activeStep);
  const isCoordinator = user?.id === room?.coordinator_id;

  const togglePanel = (panel: "chat" | "eval" | "participants") => {
    setRightPanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <div className="flex h-screen w-full">
      {/* Step sidebar */}
      <aside className="flex w-56 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="truncate text-sm font-semibold text-foreground">{room?.name || "Sessão"}</span>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-4 scrollbar-thin">
          <div>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Abertura</p>
            <div className="space-y-0.5">
              {openingSteps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => updateStep(step.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                    activeStep === step.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/70 hover:bg-secondary"
                  }`}
                >
                  <step.icon className="h-4 w-4 shrink-0" />
                  <span>P{step.id} — {step.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fechamento</p>
            <div className="space-y-0.5">
              {closingSteps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => updateStep(step.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                    activeStep === step.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/70 hover:bg-secondary"
                  }`}
                >
                  <step.icon className="h-4 w-4 shrink-0" />
                  <span>P{step.id} — {step.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom tools */}
        <div className="border-t border-border p-3 space-y-1">
          <button
            onClick={() => togglePanel("participants")}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
              rightPanel === "participants" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <Users className="h-4 w-4" />
            Participantes
          </button>
          <button
            onClick={() => togglePanel("chat")}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
              rightPanel === "chat" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
          {isProfessor && (
            <button
              onClick={() => togglePanel("eval")}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                rightPanel === "eval" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Avaliação
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-h-0">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-2">
            {currentStepInfo && <currentStepInfo.icon className="h-4 w-4 text-primary" />}
            <h2 className="text-base font-semibold text-foreground">
              Passo {activeStep} — {currentStepInfo?.label}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <TimerPanel isCoordinator={isCoordinator} channel={realtimeChannel} />
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Step content */}
          <div className="flex-1 overflow-auto p-6 scrollbar-thin">
            {activeStep === 0 ? (
              <div className="animate-fade-in">
                {canViewScenario ? (
                  <div className="clinical-card p-6">
                    <h3 className="mb-3 text-lg font-semibold text-foreground">Caso Clínico</h3>
                    {room?.scenario ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{room.scenario}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nenhum cenário configurado ainda.</p>
                    )}
                    {isProfessor && !room?.is_scenario_released && (
                      <Button className="mt-4" onClick={releaseScenario}>
                        <Eye className="mr-2 h-4 w-4" /> Liberar para Alunos
                      </Button>
                    )}
                    {isProfessor && room?.is_scenario_released && (
                      <p className="mt-3 text-xs flex items-center gap-1" style={{ color: "hsl(var(--clinical-success))" }}>
                        <Eye className="h-3 w-3" /> Cenário visível para os alunos
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="clinical-card flex flex-col items-center justify-center py-16">
                    <EyeOff className="mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">O cenário ainda não foi liberado pelo tutor.</p>
                  </div>
                )}

                {isProfessor && room?.tutor_glossary && (
                  <div className="mt-4 clinical-card border-primary/20 p-5">
                    <h4 className="mb-2 text-sm font-semibold text-primary">🔒 Glossário do Tutor</h4>
                    <pre className="whitespace-pre-wrap text-xs text-foreground/70">
                      {JSON.stringify(room.tutor_glossary, null, 2)}
                    </pre>
                  </div>
                )}
                {isProfessor && room?.tutor_questions && (
                  <div className="mt-4 clinical-card border-primary/20 p-5">
                    <h4 className="mb-2 text-sm font-semibold text-primary">🔒 Perguntas Socráticas</h4>
                    <pre className="whitespace-pre-wrap text-xs text-foreground/70">
                      {JSON.stringify(room.tutor_questions, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-in space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="clinical-card flex items-start gap-3 p-4">
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{item.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(item.profiles as any)?.full_name || "Anônimo"}
                      </p>
                    </div>
                    {item.author_id === user?.id && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="flex flex-col items-center py-12 text-center">
                    <Plus className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Nenhuma contribuição ainda. Seja o primeiro!</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {activeStep === 7 ? (
                    <Textarea
                      placeholder="Escreva sua contribuição..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      className="min-h-[80px]"
                    />
                  ) : (
                    <Input
                      placeholder="Adicionar contribuição..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addItem()}
                    />
                  )}
                  <Button onClick={addItem} disabled={!newItem.trim()} className="shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
          {rightPanel && (
            <div className="w-80 border-l border-border flex flex-col min-h-0">
              {rightPanel === "chat" && roomId && <ChatPanel roomId={roomId} />}
              {rightPanel === "eval" && roomId && <EvaluationPanel roomId={roomId} />}
              {rightPanel === "participants" && (
                <div className="flex flex-col h-full">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Participantes ({participants.length})</h3>
                  </div>
                  <div className="flex-1 overflow-auto p-3 scrollbar-thin">
                    <ParticipantsPanel
                      participants={participants}
                      coordinatorId={room?.coordinator_id}
                      reporterId={room?.reporter_id}
                      isProfessor={isProfessor}
                      onAssignRole={assignRole}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
