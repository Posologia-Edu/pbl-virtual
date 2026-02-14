import { useEffect, useState } from "react";
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
import WhiteboardPanel from "@/components/WhiteboardPanel";
import SessionScenarioManager from "@/components/SessionScenarioManager";
import {
  BookOpen, List, HelpCircle, Brain, Target, FileText,
  Send, Plus, Trash2, Eye, EyeOff,
  ClipboardList, MessageSquare, ArrowLeft, Users, Timer, PenTool,
  Layers, History, ArrowRight,
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
  const [rightPanel, setRightPanel] = useState<"chat" | "eval" | "participants" | "whiteboard" | null>("chat");
  const [participants, setParticipants] = useState<any[]>([]);

  // Multi-scenario session states
  const [roomScenarios, setRoomScenarios] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [showScenarioManager, setShowScenarioManager] = useState(false);
  const [viewingHistorySessionId, setViewingHistorySessionId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyStep, setHistoryStep] = useState(0);

  const currentSessionId = viewingHistorySessionId || activeSession?.id;
  const isViewingHistory = !!viewingHistorySessionId;

  // ---- Fetch room ----
  useEffect(() => {
    if (!roomId) return;
    const fetchRoom = async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (data) {
        setRoom(data);
      }
    };
    fetchRoom();

    const roomChannel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}`,
      }, (payload) => {
        setRoom((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { supabase.removeChannel(roomChannel); };
  }, [roomId]);

  // ---- Fetch room_scenarios and sessions ----
  const fetchScenariosAndSessions = async () => {
    if (!roomId) return;
    const [rsRes, sessRes] = await Promise.all([
      (supabase as any).from("room_scenarios").select("*, scenarios(title)").eq("room_id", roomId).order("sort_order"),
      (supabase as any).from("tutorial_sessions").select("*").eq("room_id", roomId).order("started_at"),
    ]);
    if (rsRes.data) setRoomScenarios(rsRes.data);
    if (sessRes.data) {
      setAllSessions(sessRes.data);
      const active = sessRes.data.find((s: any) => s.status === "active");
      if (active) {
        setActiveSession(active);
        if (!viewingHistorySessionId) {
          setActiveStep(active.current_step || 0);
        }
      } else {
        setActiveSession(null);
      }
    }
  };

  useEffect(() => {
    fetchScenariosAndSessions();
  }, [roomId]);

  // Subscribe to active session changes
  useEffect(() => {
    if (!activeSession?.id) return;
    const channel = supabase
      .channel(`session-${activeSession.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "tutorial_sessions", filter: `id=eq.${activeSession.id}`,
      }, (payload) => {
        const updated = payload.new as any;
        setActiveSession((prev: any) => ({ ...prev, ...updated }));
        if (!viewingHistorySessionId && updated.current_step !== undefined) {
          setActiveStep(updated.current_step);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeSession?.id, viewingHistorySessionId]);

  // ---- Fetch participants ----
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

  // ---- Fetch step items (filtered by session) ----
  useEffect(() => {
    if (!roomId) return;
    const targetSessionId = viewingHistorySessionId || activeSession?.id;
    const targetStep = viewingHistorySessionId ? historyStep : activeStep;

    const fetchItems = async () => {
      const queryBuilder = (supabase as any)
        .from("step_items")
        .select("*, profiles!step_items_author_id_profiles_fkey(full_name)")
        .eq("room_id", roomId)
        .eq("step", targetStep)
        .order("created_at");

      const { data } = targetSessionId
        ? await queryBuilder.eq("session_id", targetSessionId)
        : await queryBuilder;
      if (viewingHistorySessionId) {
        setHistoryItems(data || []);
      } else {
        setItems(data || []);
      }
    };
    fetchItems();

    // Only subscribe to realtime for active session
    if (!viewingHistorySessionId && activeSession?.id) {
      const channel = supabase
        .channel(`step-items-${roomId}-${activeStep}-${activeSession.id}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "step_items", filter: `room_id=eq.${roomId}`,
        }, async (payload) => {
          const newItem = payload.new as any;
          if (newItem.step !== activeStep) return;
          if (newItem.session_id !== activeSession.id) return;
          const { data: profile } = await supabase
            .from("profiles").select("full_name").eq("user_id", newItem.author_id).single();
          setItems((prev) => {
            if (prev.some((i) => i.id === newItem.id)) return prev;
            return [...prev, { ...newItem, profiles: profile || { full_name: "Anônimo" } }];
          });
        })
        .on("postgres_changes", {
          event: "DELETE", schema: "public", table: "step_items",
        }, (payload) => {
          setItems((prev) => prev.filter((i) => i.id !== (payload.old as any).id));
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [roomId, activeStep, activeSession?.id, viewingHistorySessionId, historyStep]);

  // ---- Actions ----
  const addItem = async () => {
    if (!newItem.trim() || !user || !roomId || !activeSession) return;
    const { error } = await supabase.from("step_items").insert({
      room_id: roomId,
      step: activeStep,
      content: newItem.trim(),
      author_id: user.id,
      session_id: activeSession.id,
    } as any);
    if (!error) setNewItem("");
    else toast({ title: "Erro", description: "Falha ao adicionar contribuição.", variant: "destructive" });
  };

  const deleteItem = async (id: string) => {
    await supabase.from("step_items").delete().eq("id", id);
  };

  const toggleScenarioRelease = async () => {
    if (!roomId) return;
    const newValue = !room?.is_scenario_released;
    await supabase.from("rooms").update({ is_scenario_released: newValue }).eq("id", roomId);
    setRoom((prev: any) => ({ ...prev, is_scenario_released: newValue }));
    toast({ title: newValue ? "Cenário liberado para os alunos!" : "Cenário ocultado dos alunos!" });
  };

  const updateStep = async (step: number) => {
    if (isViewingHistory) {
      setHistoryStep(step);
      return;
    }
    setActiveStep(step);
    if (isProfessor && activeSession) {
      await (supabase as any).from("tutorial_sessions")
        .update({ current_step: step })
        .eq("id", activeSession.id);
    }
  };

  const assignRole = async (studentId: string, role: "coordinator" | "reporter" | "none") => {
    if (!roomId) return;
    const updates: any = {};
    if (role === "coordinator") {
      updates.coordinator_id = studentId;
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

  const handleShareWhiteboard = async (imageDataUrl: string) => {
    if (!user || !roomId) return;
    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      user_id: user.id,
      content: `📋 [Whiteboard compartilhado]\n${imageDataUrl}`,
      ...(activeSession ? { session_id: activeSession.id } : {}),
    } as any);
    if (!error) {
      toast({ title: "Whiteboard compartilhado no chat!" });
      setRightPanel("chat");
    } else {
      toast({ title: "Erro ao compartilhar", variant: "destructive" });
    }
  };

  // ---- Activate session ----
  const activateSession = async (roomScenarioId: string, label: string) => {
    if (!roomId || !user) return;

    // End current active session
    if (activeSession) {
      await (supabase as any).from("tutorial_sessions")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", activeSession.id);
    }

    // Deactivate all room_scenarios for this room
    await (supabase as any).from("room_scenarios")
      .update({ is_active: false })
      .eq("room_id", roomId);

    // Activate selected
    await (supabase as any).from("room_scenarios")
      .update({ is_active: true, label })
      .eq("id", roomScenarioId);

    // Check if session already exists for this room_scenario
    const { data: existing } = await (supabase as any).from("tutorial_sessions")
      .select("*")
      .eq("room_id", roomId)
      .eq("room_scenario_id", roomScenarioId)
      .maybeSingle();

    let newSession;
    if (existing) {
      // Reactivate existing session
      const { data } = await (supabase as any).from("tutorial_sessions")
        .update({ status: "active", ended_at: null })
        .eq("id", existing.id)
        .select()
        .single();
      newSession = data;
    } else {
      // Create new session
      const { data } = await (supabase as any).from("tutorial_sessions")
        .insert({
          room_id: roomId,
          room_scenario_id: roomScenarioId,
          label,
          current_step: 0,
        })
        .select()
        .single();
      newSession = data;
    }

    if (newSession) {
      setActiveSession(newSession);
      setActiveStep(newSession.current_step || 0);
      setItems([]);
    }

    // Reset room-level release
    await supabase.from("rooms").update({
      is_scenario_released: false,
      timer_running: false,
      timer_end_at: null,
    }).eq("id", roomId);

    setShowScenarioManager(false);
    setViewingHistorySessionId(null);
    toast({ title: `Sessão ${label} ativada!` });
    fetchScenariosAndSessions();
  };

  // ---- View history ----
  const viewHistory = (sessionId: string) => {
    setViewingHistorySessionId(sessionId);
    setHistoryStep(0);
    setShowScenarioManager(false);
  };

  const exitHistory = () => {
    setViewingHistorySessionId(null);
    if (activeSession) {
      setActiveStep(activeSession.current_step || 0);
    }
  };

  // ---- Derived ----
  const openingSteps = PBL_STEPS.filter((s) => s.block === "Abertura");
  const closingSteps = PBL_STEPS.filter((s) => s.block === "Fechamento");

  // Get active scenario content
  const activeRoomScenario = activeSession
    ? roomScenarios.find((rs: any) => rs.id === activeSession.room_scenario_id)
    : null;

  const scenarioContent = activeRoomScenario?.scenario_content || room?.scenario;
  const scenarioGlossary = activeRoomScenario?.tutor_glossary || room?.tutor_glossary;
  const scenarioQuestions = activeRoomScenario?.tutor_questions || room?.tutor_questions;

  const canViewScenario = isProfessor
    ? !!(activeRoomScenario || room?.is_scenario_visible_to_professor)
    : !!room?.is_scenario_released;

  const currentStepInfo = PBL_STEPS.find((s) => s.id === (isViewingHistory ? historyStep : activeStep));
  const isCoordinator = user?.id === room?.coordinator_id;
  const isReporter = user?.id === room?.reporter_id;

  const togglePanel = (panel: "chat" | "eval" | "participants" | "whiteboard") => {
    setRightPanel((prev) => (prev === panel ? null : panel));
  };

  const displayItems = isViewingHistory ? historyItems : items;
  const historySession = viewingHistorySessionId
    ? allSessions.find((s) => s.id === viewingHistorySessionId)
    : null;
  const historyRoomScenario = historySession
    ? roomScenarios.find((rs: any) => rs.id === historySession.room_scenario_id)
    : null;

  const displayScenarioContent = isViewingHistory
    ? historyRoomScenario?.scenario_content
    : scenarioContent;
  const displayGlossary = isViewingHistory
    ? historyRoomScenario?.tutor_glossary
    : scenarioGlossary;
  const displayQuestions = isViewingHistory
    ? historyRoomScenario?.tutor_questions
    : scenarioQuestions;

  const hasMultiScenarios = roomScenarios.length > 0;
  const sessionLabel = activeSession?.label || (activeRoomScenario?.label);

  return (
    <div className="flex h-screen w-full">
      {/* Step sidebar */}
      <aside className="flex w-56 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{room?.name || "Sessão"}</span>
            {sessionLabel && (
              <span className="block truncate text-[11px] text-primary font-medium">{sessionLabel}</span>
            )}
          </div>
        </div>

        {/* History banner */}
        {isViewingHistory && (
          <div className="bg-[hsl(var(--clinical-warning))]/10 border-b border-[hsl(var(--clinical-warning))]/20 px-4 py-2">
            <p className="text-[11px] font-medium text-[hsl(var(--clinical-warning))]">
              📖 Visualizando: {historySession?.label}
            </p>
            <button onClick={exitHistory} className="text-[11px] text-primary hover:underline mt-0.5">
              ← Voltar à sessão ativa
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-3 space-y-4 scrollbar-thin">
          <div>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Abertura</p>
            <div className="space-y-0.5">
              {openingSteps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => (isProfessor || isViewingHistory) && updateStep(step.id)}
                  disabled={!isProfessor && !isViewingHistory}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                    (isViewingHistory ? historyStep : activeStep) === step.id
                      ? "bg-primary/10 text-primary font-medium"
                      : (isProfessor || isViewingHistory) ? "text-foreground/70 hover:bg-secondary" : "text-foreground/70 cursor-default"
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
                  onClick={() => (isProfessor || isViewingHistory) && updateStep(step.id)}
                  disabled={!isProfessor && !isViewingHistory}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                    (isViewingHistory ? historyStep : activeStep) === step.id
                      ? "bg-primary/10 text-primary font-medium"
                      : (isProfessor || isViewingHistory) ? "text-foreground/70 hover:bg-secondary" : "text-foreground/70 cursor-default"
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
            <Users className="h-4 w-4" /> Participantes
          </button>
          <button
            onClick={() => togglePanel("chat")}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
              rightPanel === "chat" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Chat
          </button>
          {isReporter && !isViewingHistory && (
            <button
              onClick={() => togglePanel("whiteboard")}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                rightPanel === "whiteboard" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
              }`}
            >
              <PenTool className="h-4 w-4" /> Whiteboard
            </button>
          )}
          {isProfessor && !isViewingHistory && (
            <button
              onClick={() => togglePanel("eval")}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                rightPanel === "eval" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
              }`}
            >
              <ClipboardList className="h-4 w-4" /> Avaliação
            </button>
          )}
          {isProfessor && hasMultiScenarios && (
            <>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => { setShowScenarioManager(!showScenarioManager); setViewingHistorySessionId(null); }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                  showScenarioManager ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
                }`}
              >
                <Layers className="h-4 w-4" /> Cenários
              </button>
            </>
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
              {isViewingHistory ? `📖 ${historySession?.label} — ` : ""}
              Passo {isViewingHistory ? historyStep : activeStep} — {currentStepInfo?.label}
            </h2>
            {isViewingHistory && (
              <span className="rounded-full bg-[hsl(var(--clinical-warning))]/10 px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--clinical-warning))]">
                Somente leitura
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {!isViewingHistory && <TimerPanel isCoordinator={isCoordinator} roomId={roomId!} />}
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Step content */}
          <div className="flex-1 overflow-auto p-6 scrollbar-thin">
            <div className="animate-fade-in space-y-4">
              {/* Scenario Manager view */}
              {showScenarioManager && isProfessor ? (
                <SessionScenarioManager
                  roomId={roomId!}
                  roomScenarios={roomScenarios}
                  allSessions={allSessions}
                  activeSessionId={activeSession?.id}
                  onActivate={activateSession}
                  onViewHistory={viewHistory}
                  onRefresh={fetchScenariosAndSessions}
                  onClose={() => setShowScenarioManager(false)}
                />
              ) : (
                <>
                  {/* No active session prompt */}
                  {!activeSession && hasMultiScenarios && !isViewingHistory && (
                    <div className="clinical-card flex flex-col items-center justify-center py-12 text-center">
                      <Layers className="mb-3 h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-foreground mb-1">Nenhuma sessão tutorial ativa</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {isProfessor
                          ? `${roomScenarios.length} cenário(s) disponível(is). Ative um para iniciar a sessão.`
                          : "Aguardando o professor ativar um cenário."
                        }
                      </p>
                      {isProfessor && (
                        <Button onClick={() => setShowScenarioManager(true)}>
                          <Layers className="mr-2 h-4 w-4" /> Gerenciar Cenários
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Scenario display */}
                  {(canViewScenario || isViewingHistory) && displayScenarioContent ? (
                    <div className="clinical-card p-6">
                      <h3 className="mb-3 text-lg font-semibold text-foreground">Caso Clínico</h3>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{displayScenarioContent}</p>
                      {isProfessor && !isViewingHistory && !room?.is_scenario_released && activeSession && (
                        <Button className="mt-4" onClick={toggleScenarioRelease}>
                          <Eye className="mr-2 h-4 w-4" /> Liberar para Alunos
                        </Button>
                      )}
                      {isProfessor && !isViewingHistory && room?.is_scenario_released && (
                        <div className="mt-3 flex items-center gap-3">
                          <p className="text-xs flex items-center gap-1" style={{ color: "hsl(var(--clinical-success))" }}>
                            <Eye className="h-3 w-3" /> Cenário visível para os alunos
                          </p>
                          <Button variant="outline" size="sm" onClick={toggleScenarioRelease}>
                            <EyeOff className="mr-2 h-3.5 w-3.5" /> Ocultar dos Alunos
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : !isViewingHistory && !hasMultiScenarios && (
                    <div className="clinical-card flex flex-col items-center justify-center py-10">
                      <EyeOff className="mb-3 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">O cenário ainda não foi liberado pelo tutor.</p>
                    </div>
                  )}

                  {/* Tutor-only materials */}
                  {isProfessor && displayGlossary && Array.isArray(displayGlossary) && (
                    <div className="clinical-card border-primary/20 p-5">
                      <h4 className="mb-3 text-sm font-semibold text-primary">🔒 Termos desconhecidos</h4>
                      <div className="space-y-2">
                        {(displayGlossary as any[]).map((item: any, i: number) => (
                          <p key={i} className="text-sm leading-relaxed text-foreground/80">
                            <strong className="text-foreground">{item.term}:</strong> {item.definition}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {isProfessor && displayQuestions && Array.isArray(displayQuestions) && (
                    <div className="clinical-card border-primary/20 p-5">
                      <h4 className="mb-3 text-sm font-semibold text-primary">🔒 Possíveis intervenções</h4>
                      <ol className="list-decimal list-inside space-y-2">
                        {(displayQuestions as any[]).map((q: any, i: number) => (
                          <li key={i} className="text-sm leading-relaxed text-foreground/80">{typeof q === "string" ? q : JSON.stringify(q)}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Step contributions */}
                  {(isViewingHistory ? historyStep : activeStep) !== 0 && (
                    <div className="space-y-3">
                      {displayItems.map((item) => (
                        <div key={item.id} className="clinical-card flex items-start gap-3 p-4">
                          <div className="flex-1">
                            <p className="text-sm text-foreground">{item.content}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {(item.profiles as any)?.full_name || "Anônimo"}
                            </p>
                          </div>
                          {!isViewingHistory && item.author_id === user?.id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}

                      {displayItems.length === 0 && (
                        <div className="flex flex-col items-center py-8 text-center">
                          <Plus className="mb-2 h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">
                            {isViewingHistory ? "Nenhuma contribuição neste passo." : "Nenhuma contribuição ainda. Seja o primeiro!"}
                          </p>
                        </div>
                      )}

                      {/* Input (only for active session, not history) */}
                      {!isViewingHistory && activeSession && (
                        <div className="flex gap-2 pt-2">
                          {(isViewingHistory ? historyStep : activeStep) === 7 ? (
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
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right panel */}
          {rightPanel && (
            <div className={`border-l border-border flex flex-col min-h-0 ${rightPanel === "whiteboard" ? "w-[480px]" : "w-80"}`}>
              {rightPanel === "chat" && roomId && (
                <ChatPanel roomId={roomId} sessionId={currentSessionId} />
              )}
              {rightPanel === "eval" && roomId && (
                <EvaluationPanel roomId={roomId} sessionId={activeSession?.id} />
              )}
              {rightPanel === "whiteboard" && isReporter && (
                <WhiteboardPanel onShareToChat={handleShareWhiteboard} />
              )}
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
