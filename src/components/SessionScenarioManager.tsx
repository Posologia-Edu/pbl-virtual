import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Play, ArrowUp, ArrowDown, FileText, Check, X, History } from "lucide-react";

interface RoomScenario {
  id: string;
  label: string | null;
  scenario_content: string;
  tutor_glossary: any;
  tutor_questions: any;
  sort_order: number;
  is_active: boolean;
  scenario_id: string | null;
  scenarios?: { title: string } | null;
}

interface TutorialSession {
  id: string;
  label: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  room_scenario_id: string;
}

interface Props {
  roomId: string;
  roomScenarios: RoomScenario[];
  allSessions: TutorialSession[];
  activeSessionId: string | null;
  onActivate: (roomScenarioId: string, label: string) => void;
  onViewHistory: (sessionId: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export default function SessionScenarioManager({
  roomId, roomScenarios, allSessions, activeSessionId,
  onActivate, onViewHistory, onRefresh, onClose,
}: Props) {
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelValue, setLabelValue] = useState("");

  const sorted = [...roomScenarios].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const updateLabel = async (rsId: string) => {
    await (supabase as any).from("room_scenarios").update({ label: labelValue }).eq("id", rsId);
    setEditingLabel(null);
    onRefresh();
  };

  const moveScenario = async (rsId: string, direction: "up" | "down") => {
    const idx = sorted.findIndex((s) => s.id === rsId);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === sorted.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    await Promise.all([
      (supabase as any).from("room_scenarios").update({ sort_order: sorted[swapIdx].sort_order }).eq("id", sorted[idx].id),
      (supabase as any).from("room_scenarios").update({ sort_order: sorted[idx].sort_order }).eq("id", sorted[swapIdx].id),
    ]);
    onRefresh();
  };

  const activate = (rs: RoomScenario, idx: number) => {
    const label = rs.label || `P${idx + 1}`;
    onActivate(rs.id, label);
  };

  const getSessionForScenario = (rsId: string) =>
    allSessions.find((s) => s.room_scenario_id === rsId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          Gerenciar Cenários <span className="text-xs font-normal text-muted-foreground">({roomScenarios.length})</span>
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="mr-1 h-3 w-3" /> Fechar
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="clinical-card flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum cenário enviado pelo administrador.</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Solicite ao administrador o envio de cenários para esta sala.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((rs, idx) => {
            const session = getSessionForScenario(rs.id);
            const isActive = rs.is_active;
            const isCompleted = session?.status === "completed";
            const scenarioTitle = (rs as any).scenarios?.title;

            return (
              <div
                key={rs.id}
                className={`clinical-card p-4 transition-all ${
                  isActive
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : isCompleted
                      ? "border-border/60 bg-muted/20"
                      : "border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 pt-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => moveScenario(rs.id, "up")}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => moveScenario(rs.id, "down")}
                      disabled={idx === sorted.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {editingLabel === rs.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={labelValue}
                            onChange={(e) => setLabelValue(e.target.value)}
                            className="h-7 w-20 text-xs"
                            placeholder="P1"
                            onKeyDown={(e) => e.key === "Enter" && updateLabel(rs.id)}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateLabel(rs.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingLabel(rs.id); setLabelValue(rs.label || ""); }}
                          className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                        >
                          {rs.label || `P${idx + 1}`}
                        </button>
                      )}

                      {isActive && (
                        <span className="rounded-full bg-[hsl(var(--clinical-success))]/10 px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--clinical-success))]">
                          ● Ativo
                        </span>
                      )}
                      {isCompleted && !isActive && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Concluído
                        </span>
                      )}
                    </div>

                    {scenarioTitle && (
                      <p className="text-sm font-medium text-foreground mb-1">{scenarioTitle}</p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{rs.scenario_content}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {!isActive && (
                      <Button
                        size="sm"
                        variant={isCompleted ? "outline" : "default"}
                        onClick={() => activate(rs, idx)}
                        className="text-xs"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        {isCompleted ? "Reativar" : "Ativar"}
                      </Button>
                    )}
                    {session && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewHistory(session.id)}
                        className="text-xs"
                      >
                        <History className="mr-1 h-3 w-3" /> Histórico
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
