import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Users, UserCheck, MessageSquare, PenTool,
  ClipboardList, Target, Timer, Bot, Award,
  FileText, CheckCircle2, ArrowRight, X, Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  action?: string; // which panel/tab to highlight
  panelToOpen?: "chat" | "eval" | "participants" | "whiteboard" | "peer-eval" | "ai-cotutor" | null;
  stepToNavigate?: number; // PBL step to navigate to
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo à Sala Tutorial Virtual!",
    description: "Esta é uma sala de demonstração com estudantes fictícios. Vamos guiar você por todas as funcionalidades. Clique em 'Próximo' para começar!",
    icon: Sparkles,
  },
  {
    id: "scenario",
    title: "Leia o Cenário Clínico",
    description: "O cenário PBL está exibido na área central. Este é o caso clínico que os estudantes discutirão. Como professor, você pode liberar ou ocultar o cenário.",
    icon: BookOpen,
    stepToNavigate: 0,
  },
  {
    id: "participants",
    title: "Conheça os Participantes",
    description: "Clique na aba 'Participantes' à esquerda para ver os estudantes da turma. Você verá 5 estudantes fictícios nesta sala demo.",
    icon: Users,
    panelToOpen: "participants",
  },
  {
    id: "roles",
    title: "Atribua Papéis",
    description: "Experimente trocar o Coordenador e o Relator clicando nos botões ao lado de cada estudante. O Coordenador gerencia o timer e o Relator usa o whiteboard.",
    icon: UserCheck,
    panelToOpen: "participants",
  },
  {
    id: "terms",
    title: "Explore os Passos PBL",
    description: "Navegue pelos passos na barra lateral: Termos desconhecidos, Problema, Brainstorming, etc. Cada passo já tem contribuições dos estudantes.",
    icon: FileText,
    stepToNavigate: 1,
  },
  {
    id: "chat",
    title: "Veja o Chat da Turma",
    description: "Abra o Chat para ver as mensagens dos estudantes discutindo o caso. Em uma sessão real, a discussão acontece em tempo real.",
    icon: MessageSquare,
    panelToOpen: "chat",
  },
  {
    id: "whiteboard",
    title: "Conheça o Whiteboard",
    description: "O Whiteboard é uma ferramenta de desenho disponível para o Relator. Ele pode compartilhar esquemas e diagramas no chat.",
    icon: PenTool,
  },
  {
    id: "timer",
    title: "Use o Timer",
    description: "O timer no topo da tela permite controlar o tempo de cada etapa. O Coordenador pode iniciar e pausar o timer.",
    icon: Timer,
  },
  {
    id: "objectives",
    title: "Banco de Objetivos",
    description: "No passo 'Objetivos', existe um banco de objetivos de aprendizagem que persiste entre sessões. Os estudantes definem o que precisam estudar.",
    icon: Target,
    stepToNavigate: 5,
  },
  {
    id: "evaluation",
    title: "Avalie os Estudantes",
    description: "Abra a aba 'Avaliação' para avaliar cada estudante nos critérios predefinidos. Experimente atribuir notas clicando nos botões de conceito.",
    icon: ClipboardList,
    panelToOpen: "eval",
  },
  {
    id: "peer-eval",
    title: "Avaliação por Pares",
    description: "A 'Visão 360°' permite que os estudantes se avaliem mutuamente. Como professor, você visualiza todas as avaliações consolidadas.",
    icon: UserCheck,
    panelToOpen: "peer-eval",
  },
  {
    id: "badges",
    title: "Badges e Gamificação",
    description: "Os estudantes ganham badges automaticamente baseados em participação, frequência e desempenho. Isso motiva o engajamento contínuo.",
    icon: Award,
  },
  {
    id: "ai-cotutor",
    title: "Co-tutor com IA",
    description: "O Co-tutor IA auxilia o professor durante a sessão, sugerindo perguntas, identificando lacunas e ajudando na condução da discussão.",
    icon: Bot,
    panelToOpen: "ai-cotutor",
  },
  {
    id: "synthesis",
    title: "Síntese e Ata",
    description: "No passo 'Síntese', os estudantes consolidam o aprendizado. A ata da sessão pode ser gerada automaticamente por IA.",
    icon: FileText,
    stepToNavigate: 7,
  },
  {
    id: "complete",
    title: "Experiência Completa! 🎉",
    description: "Você explorou todas as funcionalidades da sala tutorial virtual. Escolha um plano para começar a usar com seus próprios alunos!",
    icon: CheckCircle2,
  },
];

interface OnboardingGuideProps {
  onStepChange?: (step: OnboardingStep) => void;
  onComplete?: () => void;
  isVisible: boolean;
}

export default function OnboardingGuide({ onStepChange, onComplete, isVisible }: OnboardingGuideProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  useEffect(() => {
    if (step && onStepChange) {
      onStepChange(step);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    // Mark onboarding as completed
    localStorage.setItem("onboarding_completed", "true");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ onboarding_completed: true } as any).eq("user_id", user.id);
      }
    } catch {}
    if (onComplete) onComplete();
    navigate("/pricing");
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("onboarding_dismissed", "true");
  };

  const handleReopen = () => {
    setDismissed(false);
    localStorage.removeItem("onboarding_dismissed");
  };

  if (!isVisible) return null;

  // Minimized state
  if (dismissed) {
    return (
      <button
        onClick={handleReopen}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed right-4 top-4 bottom-4 z-50 w-80 flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-primary/5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Guia de Onboarding</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">
              {currentStep + 1}/{ONBOARDING_STEPS.length}
            </span>
            <button onClick={handleDismiss} className="ml-1 rounded-lg p-1 hover:bg-muted transition-colors">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3">
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>

              {step.action && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 px-3 py-2">
                  <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3" />
                    {step.action}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step list (collapsed) */}
        <div className="border-t border-border px-4 py-2 max-h-32 overflow-auto">
          <div className="space-y-0.5">
            {ONBOARDING_STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(i)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-[11px] transition-colors ${
                  i === currentStep
                    ? "bg-primary/10 text-primary font-medium"
                    : i < currentStep
                    ? "text-muted-foreground/60"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {i < currentStep ? (
                  <CheckCircle2 className="h-3 w-3 text-primary/60 shrink-0" />
                ) : (
                  <s.icon className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="border-t border-border p-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex-1 rounded-xl"
          >
            Anterior
          </Button>
          <Button
            size="sm"
            onClick={handleNext}
            className="flex-1 rounded-xl gap-1"
          >
            {currentStep === ONBOARDING_STEPS.length - 1 ? (
              <>Ver Planos <ArrowRight className="h-3.5 w-3.5" /></>
            ) : (
              <>Próximo <ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export { ONBOARDING_STEPS };
export type { OnboardingStep };
