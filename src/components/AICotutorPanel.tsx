import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bot, HelpCircle, Eye, AlertTriangle, RefreshCw, Target,
  ChevronDown, ChevronRight, Lightbulb, Users, Sparkles,
} from "lucide-react";

interface AICotutorPanelProps {
  roomId: string;
  sessionId: string | undefined;
  moduleId: string | null;
}

interface SuggestionData {
  questions?: { question: string; rationale: string }[];
  mentions?: { student: string; type: "highlight" | "redirect"; reason: string }[];
  observations?: string[];
}

interface GapData {
  addressed?: string[];
  gaps?: string[];
  essential_gaps?: string[];
  suggested_questions?: string[];
  summary?: string;
}

export default function AICotutorPanel({ roomId, sessionId, moduleId }: AICotutorPanelProps) {
  const { subscription, refreshSubscription } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapData | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("questions");

  const maxInteractions = subscription.maxAiInteractions;
  const usedInteractions = subscription.aiInteractionsUsed;
  const limitReached = maxInteractions !== 99999 && usedInteractions >= maxInteractions;

  const fetchSuggestions = async () => {
    if (!sessionId) return;
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-cotutor", {
        body: { room_id: roomId, session_id: sessionId, mode: "suggestions" },
      });
      if (error) throw error;
      setSuggestions(data);
      setExpandedSection("questions");
      refreshSubscription(); // Update usage count
    } catch (err: any) {
      toast({
        title: "Erro ao gerar sugestões",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchGapAnalysis = async () => {
    if (!sessionId || !moduleId) {
      toast({
        title: "Módulo não vinculado",
        description: "Esta turma precisa estar vinculada a um módulo para análise de lacunas.",
        variant: "destructive",
      });
      return;
    }
    setLoadingGaps(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-cotutor", {
        body: { room_id: roomId, session_id: sessionId, mode: "gap_analysis", module_id: moduleId },
      });
      if (error) throw error;
      setGapAnalysis(data);
      setExpandedSection("gaps");
      refreshSubscription(); // Update usage count
    } catch (err: any) {
      toast({
        title: "Erro na análise de lacunas",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingGaps(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Co-tutor IA</h3>
        {maxInteractions !== 99999 && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
            limitReached
              ? "bg-destructive/10 text-destructive"
              : usedInteractions >= maxInteractions * 0.8
                ? "bg-[hsl(var(--clinical-warning))]/10 text-[hsl(var(--clinical-warning))]"
                : "bg-primary/10 text-primary"
          }`}>
            {usedInteractions}/{maxInteractions} interações
          </span>
        )}
        {maxInteractions === 99999 && (
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            🔒 Professor
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3 scrollbar-thin">
        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            onClick={fetchSuggestions}
            disabled={loadingSuggestions || !sessionId || limitReached}
            className="w-full justify-start gap-2"
            size="sm"
          >
            {loadingSuggestions ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {loadingSuggestions ? "Analisando..." : "Sugerir Perguntas"}
          </Button>

          {limitReached && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
              <p className="text-xs font-medium text-destructive">
                Limite de interações atingido ({maxInteractions}/mês)
              </p>
              <a href="/pricing" className="text-[10px] text-primary hover:underline mt-1 inline-block">
                Fazer Upgrade →
              </a>
            </div>
          )}

          <Button
            onClick={fetchGapAnalysis}
            disabled={loadingGaps || !sessionId || limitReached}
            variant="outline"
            className="w-full justify-start gap-2"
            size="sm"
          >
            {loadingGaps ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Target className="h-3.5 w-3.5" />
            )}
            {loadingGaps ? "Analisando..." : "Analisar Lacunas"}
          </Button>
        </div>

        {/* Suggestions results */}
        {suggestions && (
          <div className="space-y-2">
            {/* Questions */}
            {suggestions.questions && suggestions.questions.length > 0 && (
              <div className="clinical-card overflow-hidden">
                <button
                  onClick={() => toggleSection("questions")}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                >
                  {expandedSection === "questions" ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Lightbulb className="h-3.5 w-3.5 text-[hsl(var(--clinical-warning))]" />
                  <span className="text-xs font-semibold text-foreground">
                    Perguntas Sugeridas ({suggestions.questions.length})
                  </span>
                </button>
                {expandedSection === "questions" && (
                  <div className="px-3 pb-3 space-y-2.5">
                    {suggestions.questions.map((q, i) => (
                      <div key={i} className="rounded-xl bg-secondary/50 p-2.5">
                        <p className="text-xs font-medium text-foreground leading-relaxed">
                          "{q.question}"
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground italic">
                          {q.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mentions */}
            {suggestions.mentions && suggestions.mentions.length > 0 && (
              <div className="clinical-card overflow-hidden">
                <button
                  onClick={() => toggleSection("mentions")}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                >
                  {expandedSection === "mentions" ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Menções ({suggestions.mentions.length})
                  </span>
                </button>
                {expandedSection === "mentions" && (
                  <div className="px-3 pb-3 space-y-2">
                    {suggestions.mentions.map((m, i) => (
                      <div
                        key={i}
                        className={`rounded-xl p-2.5 ${
                          m.type === "highlight"
                            ? "bg-[hsl(var(--clinical-success))]/10 border border-[hsl(var(--clinical-success))]/20"
                            : "bg-[hsl(var(--clinical-warning))]/10 border border-[hsl(var(--clinical-warning))]/20"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {m.type === "highlight" ? (
                            <Eye className="h-3 w-3 text-[hsl(var(--clinical-success))]" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-[hsl(var(--clinical-warning))]" />
                          )}
                          <span className="text-xs font-medium text-foreground">{m.student}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">{m.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Observations */}
            {suggestions.observations && suggestions.observations.length > 0 && (
              <div className="clinical-card overflow-hidden">
                <button
                  onClick={() => toggleSection("observations")}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                >
                  {expandedSection === "observations" ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <HelpCircle className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-semibold text-foreground">
                    Observações ({suggestions.observations.length})
                  </span>
                </button>
                {expandedSection === "observations" && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {suggestions.observations.map((obs, i) => (
                      <p key={i} className="text-xs text-foreground/80 leading-relaxed">
                        • {obs}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Gap analysis results */}
        {gapAnalysis && (
          <div className="space-y-2">
            {gapAnalysis.summary && (
              <div className="clinical-card p-3">
                <p className="text-xs text-foreground/80 leading-relaxed">{gapAnalysis.summary}</p>
              </div>
            )}

            {/* Essential gaps */}
            {gapAnalysis.essential_gaps && gapAnalysis.essential_gaps.length > 0 && (
              <div className="clinical-card overflow-hidden">
                <button
                  onClick={() => toggleSection("essential_gaps")}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                >
                  {expandedSection === "essential_gaps" ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs font-semibold text-destructive">
                    Lacunas Essenciais ({gapAnalysis.essential_gaps.length})
                  </span>
                </button>
                {expandedSection === "essential_gaps" && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {gapAnalysis.essential_gaps.map((g, i) => (
                      <p key={i} className="text-xs text-foreground/80">⭐ {g}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* General gaps */}
            {gapAnalysis.gaps && gapAnalysis.gaps.length > 0 && (
              <div className="clinical-card overflow-hidden">
                <button
                  onClick={() => toggleSection("gaps")}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                >
                  {expandedSection === "gaps" ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Target className="h-3.5 w-3.5 text-[hsl(var(--clinical-warning))]" />
                  <span className="text-xs font-semibold text-foreground">
                    Lacunas ({gapAnalysis.gaps.length})
                  </span>
                </button>
                {expandedSection === "gaps" && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {gapAnalysis.gaps.map((g, i) => (
                      <p key={i} className="text-xs text-foreground/80">• {g}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Suggested questions from gap analysis */}
            {gapAnalysis.suggested_questions && gapAnalysis.suggested_questions.length > 0 && (
              <div className="clinical-card overflow-hidden">
                <button
                  onClick={() => toggleSection("gap_questions")}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                >
                  {expandedSection === "gap_questions" ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Lightbulb className="h-3.5 w-3.5 text-[hsl(var(--clinical-warning))]" />
                  <span className="text-xs font-semibold text-foreground">
                    Perguntas para Cobrir Lacunas
                  </span>
                </button>
                {expandedSection === "gap_questions" && (
                  <div className="px-3 pb-3 space-y-2">
                    {gapAnalysis.suggested_questions.map((q, i) => (
                      <div key={i} className="rounded-xl bg-secondary/50 p-2.5">
                        <p className="text-xs font-medium text-foreground">"{q}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Addressed objectives */}
            {gapAnalysis.addressed && gapAnalysis.addressed.length > 0 && (
              <div className="clinical-card overflow-hidden">
                <button
                  onClick={() => toggleSection("addressed")}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                >
                  {expandedSection === "addressed" ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Eye className="h-3.5 w-3.5 text-[hsl(var(--clinical-success))]" />
                  <span className="text-xs font-semibold text-foreground">
                    Objetivos Abordados ({gapAnalysis.addressed.length})
                  </span>
                </button>
                {expandedSection === "addressed" && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {gapAnalysis.addressed.map((a, i) => (
                      <p key={i} className="text-xs text-[hsl(var(--clinical-success))]">✓ {a}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!suggestions && !gapAnalysis && (
          <div className="flex flex-col items-center py-8 text-center">
            <Bot className="mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Use os botões acima para obter sugestões de perguntas ou analisar lacunas nos objetivos de aprendizagem.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
