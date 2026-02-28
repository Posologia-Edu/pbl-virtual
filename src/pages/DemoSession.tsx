import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import OnboardingGuide, { type OnboardingStep } from "@/components/OnboardingGuide";
import {
  DEMO_ROOM, DEMO_STUDENTS, DEMO_SCENARIO_CONTENT,
  DEMO_TUTOR_GLOSSARY, DEMO_TUTOR_QUESTIONS,
  DEMO_ROOM_SCENARIO, DEMO_SESSION, DEMO_CHAT_MESSAGES,
  DEMO_STEP_ITEMS, DEMO_EVALUATION_CRITERIA,
} from "@/data/demoData";
import {
  BookOpen, List, HelpCircle, Brain, Target, FileText,
  Send, Plus, Eye,
  ClipboardList, MessageSquare, ArrowLeft, Users, Timer, PenTool,
  Layers, UserCheck, Bot, Award,
} from "lucide-react";

const PBL_STEPS = [
  { id: 0, label: "Cenário", icon: BookOpen, block: "Abertura" },
  { id: 1, label: "Termos", icon: List, block: "Abertura" },
  { id: 2, label: "Problema", icon: HelpCircle, block: "Abertura" },
  { id: 3, label: "Brainstorming", icon: Brain, block: "Abertura" },
  { id: 5, label: "Objetivos", icon: Target, block: "Abertura" },
  { id: 7, label: "Síntese", icon: FileText, block: "Fechamento" },
];

export default function DemoSession() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [rightPanel, setRightPanel] = useState<"chat" | "eval" | "participants" | "whiteboard" | "peer-eval" | "ai-cotutor" | null>("chat");
  const [room, setRoom] = useState({ ...DEMO_ROOM });
  const [newItem, setNewItem] = useState("");
  const [localItems, setLocalItems] = useState<Record<number, any[]>>({ ...DEMO_STEP_ITEMS });
  const [localChatMessages, setLocalChatMessages] = useState([...DEMO_CHAT_MESSAGES]);
  const [chatInput, setChatInput] = useState("");
  const [demoEvaluations, setDemoEvaluations] = useState<Record<string, Record<string, string>>>({});

  // Onboarding
  const showOnboarding = !localStorage.getItem("onboarding_completed");
  const [highlightPanel, setHighlightPanel] = useState<string | null>(null);

  const handleOnboardingStepChange = useCallback((step: OnboardingStep) => {
    if (step.panelToOpen !== undefined) {
      setRightPanel(step.panelToOpen);
    }
    if (step.stepToNavigate !== undefined) {
      setActiveStep(step.stepToNavigate);
    }
    setHighlightPanel(step.panelToOpen || null);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    navigate("/pricing");
  }, [navigate]);

  const openingSteps = PBL_STEPS.filter((s) => s.block === "Abertura");
  const closingSteps = PBL_STEPS.filter((s) => s.block === "Fechamento");
  const currentStepInfo = PBL_STEPS.find((s) => s.id === activeStep);
  const displayItems = localItems[activeStep] || [];

  const addItem = () => {
    if (!newItem.trim()) return;
    const item = {
      id: `local-${Date.now()}`,
      content: newItem.trim(),
      author_id: user?.id || "demo",
      profiles: { full_name: profile?.full_name || "Professor" },
    };
    setLocalItems((prev) => ({
      ...prev,
      [activeStep]: [...(prev[activeStep] || []), item],
    }));
    setNewItem("");
    toast({ title: "Contribuição adicionada!" });
  };

  const addChatMessage = () => {
    if (!chatInput.trim()) return;
    setLocalChatMessages((prev) => [
      ...prev,
      {
        id: `local-chat-${Date.now()}`,
        user_id: user?.id || "demo",
        content: chatInput.trim(),
        profiles: { full_name: profile?.full_name || "Professor" },
        created_at: new Date().toISOString(),
      },
    ]);
    setChatInput("");
  };

  const assignRole = (studentId: string, role: "coordinator" | "reporter" | "none") => {
    setRoom((prev) => {
      const updates = { ...prev };
      if (role === "coordinator") {
        updates.coordinator_id = studentId;
        if (prev.reporter_id === studentId) updates.reporter_id = null;
      } else if (role === "reporter") {
        updates.reporter_id = studentId;
        if (prev.coordinator_id === studentId) updates.coordinator_id = null;
      } else {
        if (prev.coordinator_id === studentId) updates.coordinator_id = null;
        if (prev.reporter_id === studentId) updates.reporter_id = null;
      }
      return updates;
    });
    toast({ title: "Função atualizada! (Demo)" });
  };

  const setEvaluation = (studentId: string, criterionId: string, grade: string) => {
    setDemoEvaluations((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [criterionId]: grade },
    }));
    toast({ title: "Avaliação registrada! (Demo)" });
  };

  const togglePanel = (panel: typeof rightPanel) => {
    setRightPanel((prev) => (prev === panel ? null : panel));
  };

  const getHighlightClass = (panel: string | null) => {
    if (highlightPanel && highlightPanel === panel) {
      return "ring-2 ring-primary ring-offset-2 ring-offset-background";
    }
    return "";
  };

  return (
    <div className="flex h-screen w-full">
      {/* Onboarding Guide */}
      <OnboardingGuide
        isVisible={showOnboarding}
        onStepChange={handleOnboardingStepChange}
        onComplete={handleOnboardingComplete}
      />

      {/* Step sidebar */}
      <aside className="flex w-56 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{room.name}</span>
            <span className="block truncate text-[11px] text-primary font-medium">P1 — Demo</span>
          </div>
        </div>

        {/* Demo banner */}
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
          <p className="text-[11px] font-medium text-primary">
            🎓 Sala de Demonstração
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Explore todas as funcionalidades
          </p>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-4 scrollbar-thin">
          <div>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Abertura</p>
            <div className="space-y-0.5">
              {openingSteps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
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
                  onClick={() => setActiveStep(step.id)}
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
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${getHighlightClass("participants")} ${
              rightPanel === "participants" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <Users className="h-4 w-4" /> Participantes
          </button>
          <button
            onClick={() => togglePanel("chat")}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${getHighlightClass("chat")} ${
              rightPanel === "chat" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Chat
          </button>
          <button
            onClick={() => togglePanel("whiteboard")}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${getHighlightClass("whiteboard")} ${
              rightPanel === "whiteboard" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <PenTool className="h-4 w-4" /> Whiteboard
          </button>
          <button
            onClick={() => togglePanel("eval")}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${getHighlightClass("eval")} ${
              rightPanel === "eval" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <ClipboardList className="h-4 w-4" /> Avaliação
          </button>
          <button
            onClick={() => togglePanel("peer-eval")}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${getHighlightClass("peer-eval")} ${
              rightPanel === "peer-eval" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <UserCheck className="h-4 w-4" /> Visão 360°
          </button>
          <button
            onClick={() => togglePanel("ai-cotutor")}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${getHighlightClass("ai-cotutor")} ${
              rightPanel === "ai-cotutor" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-secondary"
            }`}
          >
            <Bot className="h-4 w-4" /> Co-tutor IA
          </button>
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
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Demo
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            <span>00:00</span>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Step content */}
          <div className="flex-1 overflow-auto p-6 scrollbar-thin">
            <div className="animate-fade-in space-y-4">
              {/* Scenario display */}
              {activeStep === 0 && (
                <>
                  <div className="clinical-card p-6">
                    <h3 className="mb-3 text-lg font-semibold text-foreground">Caso Clínico</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{DEMO_SCENARIO_CONTENT}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <p className="text-xs flex items-center gap-1" style={{ color: "hsl(var(--clinical-success))" }}>
                        <Eye className="h-3 w-3" /> Cenário visível para os alunos
                      </p>
                    </div>
                  </div>

                  {/* Tutor materials */}
                  <div className="clinical-card border-primary/20 p-5">
                    <h4 className="mb-3 text-sm font-semibold text-primary">🔒 Termos desconhecidos</h4>
                    <div className="space-y-2">
                      {DEMO_TUTOR_GLOSSARY.map((item, i) => (
                        <p key={i} className="text-sm leading-relaxed text-foreground/80">
                          <strong className="text-foreground">{item.term}:</strong> {item.definition}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="clinical-card border-primary/20 p-5">
                    <h4 className="mb-3 text-sm font-semibold text-primary">🔒 Possíveis intervenções</h4>
                    <ol className="list-decimal list-inside space-y-2">
                      {DEMO_TUTOR_QUESTIONS.map((q, i) => (
                        <li key={i} className="text-sm leading-relaxed text-foreground/80">{q}</li>
                      ))}
                    </ol>
                  </div>
                </>
              )}

              {/* Step contributions */}
              {activeStep !== 0 && (
                <div className="space-y-3">
                  {displayItems.map((item) => (
                    <div key={item.id} className="clinical-card flex items-start gap-3 p-4">
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{item.content}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.profiles?.full_name || "Anônimo"}
                        </p>
                      </div>
                    </div>
                  ))}

                  {displayItems.length === 0 && (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Plus className="mb-2 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma contribuição ainda. Seja o primeiro!
                      </p>
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
          </div>

          {/* Right panel */}
          {rightPanel && (
            <div className={`border-l border-border flex flex-col min-h-0 ${rightPanel === "whiteboard" ? "w-[480px]" : "w-80"}`}>
              {/* Chat panel */}
              {rightPanel === "chat" && (
                <div className="flex flex-col h-full">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Chat da Turma</h3>
                  </div>
                  <div className="flex-1 overflow-auto p-3 space-y-3 scrollbar-thin">
                    {localChatMessages.map((msg) => (
                      <div key={msg.id} className="space-y-1">
                        <p className="text-[11px] font-medium text-foreground">{msg.profiles.full_name}</p>
                        <div className="rounded-xl bg-muted px-3 py-2">
                          <p className="text-sm text-foreground/80">{msg.content}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border p-3 flex gap-2">
                    <Input
                      placeholder="Enviar mensagem..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addChatMessage()}
                      className="flex-1"
                    />
                    <Button size="icon" onClick={addChatMessage} disabled={!chatInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Participants panel */}
              {rightPanel === "participants" && (
                <div className="flex flex-col h-full">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Participantes ({DEMO_STUDENTS.length})</h3>
                  </div>
                  <div className="flex-1 overflow-auto p-3 space-y-2 scrollbar-thin">
                    {DEMO_STUDENTS.map((student) => {
                      const isCoord = room.coordinator_id === student.student_id;
                      const isReporter = room.reporter_id === student.student_id;
                      return (
                        <div key={student.student_id} className="clinical-card p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[hsl(var(--clinical-success))]" />
                            <span className="text-sm font-medium text-foreground flex-1">{student.full_name}</span>
                            {isCoord && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Coordenador</span>}
                            {isReporter && <span className="text-[10px] bg-accent/10 text-accent-foreground px-1.5 py-0.5 rounded-full font-medium">Relator</span>}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant={isCoord ? "default" : "outline"}
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => assignRole(student.student_id, isCoord ? "none" : "coordinator")}
                            >
                              Coordenador
                            </Button>
                            <Button
                              variant={isReporter ? "default" : "outline"}
                              size="sm"
                              className="h-6 text-[10px] px-2"
                              onClick={() => assignRole(student.student_id, isReporter ? "none" : "reporter")}
                            >
                              Relator
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Evaluation panel */}
              {rightPanel === "eval" && (
                <div className="flex flex-col h-full">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Avaliação</h3>
                  </div>
                  <div className="flex-1 overflow-auto p-3 space-y-4 scrollbar-thin">
                    {DEMO_STUDENTS.map((student) => (
                      <div key={student.student_id} className="clinical-card p-3 space-y-2">
                        <p className="text-sm font-medium text-foreground">{student.full_name}</p>
                        <div className="space-y-1.5">
                          {DEMO_EVALUATION_CRITERIA.filter(c => c.phase === "opening").slice(0, 3).map((criterion) => (
                            <div key={criterion.id} className="flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground flex-1">{criterion.label}</span>
                              <div className="flex gap-0.5">
                                {["E", "MB", "B", "R", "I"].map((grade) => (
                                  <button
                                    key={grade}
                                    onClick={() => setEvaluation(student.student_id, criterion.id, grade)}
                                    className={`h-6 w-6 rounded text-[10px] font-medium transition-colors ${
                                      demoEvaluations[student.student_id]?.[criterion.id] === grade
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                  >
                                    {grade}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Peer evaluation */}
              {rightPanel === "peer-eval" && (
                <div className="flex flex-col h-full">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Visão 360° (Demo)</h3>
                  </div>
                  <div className="flex-1 overflow-auto p-3 scrollbar-thin">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Em uma sessão real, aqui você veria as avaliações dos estudantes entre si consolidadas em uma visão 360°.
                    </p>
                  </div>
                </div>
              )}

              {/* Whiteboard */}
              {rightPanel === "whiteboard" && (
                <div className="flex flex-col h-full">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Whiteboard (Demo)</h3>
                  </div>
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center space-y-3">
                      <PenTool className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        O whiteboard permite que o Relator desenhe diagramas e esquemas, compartilhando-os no chat.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Co-tutor */}
              {rightPanel === "ai-cotutor" && (
                <div className="flex flex-col h-full">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Co-tutor IA (Demo)</h3>
                  </div>
                  <div className="flex-1 overflow-auto p-3 scrollbar-thin">
                    <div className="space-y-4">
                      <div className="clinical-card p-4 border-primary/20">
                        <p className="text-sm text-foreground/80">
                          <strong className="text-primary">💡 Sugestão:</strong> Os alunos identificaram corretamente a anemia microcítica. 
                          Considere perguntar sobre diagnósticos diferenciais como talassemia e anemia de doença crônica.
                        </p>
                      </div>
                      <div className="clinical-card p-4 border-primary/20">
                        <p className="text-sm text-foreground/80">
                          <strong className="text-primary">📊 Observação:</strong> A discussão está focada na deficiência de ferro. 
                          Sugira que o grupo explore outros exames complementares como reticulócitos e esfregaço de sangue periférico.
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground text-center pt-4">
                        Em uma sessão real, o Co-tutor IA gera sugestões personalizadas baseadas no contexto da discussão.
                      </p>
                    </div>
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
