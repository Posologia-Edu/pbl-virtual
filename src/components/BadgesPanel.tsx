import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Trophy, RefreshCw, TrendingUp, MessageSquare, Users, Star, BookOpen } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Badge {
  id: string;
  earned_at: string;
  badge_definitions: {
    slug: string;
    name: string;
    description: string;
    icon: string;
    category: string;
  };
}

interface Metrics {
  contributions: number;
  chat_messages: number;
  sessions_participated: number;
  coordinator_times: number;
  reporter_times: number;
  peer_evaluations: number;
  references_shared: number;
  total_grades: number;
  a_percentage: number;
}

interface BadgesPanelProps {
  userId?: string;
  roomId?: string;
  compact?: boolean;
}

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  participation: { label: "Participação", icon: MessageSquare, color: "text-primary" },
  consistency: { label: "Consistência", icon: TrendingUp, color: "text-[hsl(var(--clinical-success))]" },
  leadership: { label: "Liderança", icon: Users, color: "text-[hsl(var(--clinical-warning))]" },
  collaboration: { label: "Colaboração", icon: BookOpen, color: "text-accent" },
  excellence: { label: "Excelência", icon: Star, color: "text-[hsl(var(--clinical-warning))]" },
};

export default function BadgesPanel({ userId, roomId, compact = false }: BadgesPanelProps) {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const targetUserId = userId || user?.id;

  const fetchBadges = async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-badges", {
        body: { user_id: targetUserId, room_id: roomId || null },
      });
      if (error) throw error;
      setBadges(data.badges || []);
      setMetrics(data.metrics || null);
      if (data.new_badges > 0) {
        setNewCount(data.new_badges);
        toast({
          title: `🎉 ${data.new_badges} novo(s) badge(s)!`,
          description: "Confira suas conquistas!",
        });
      }
    } catch (err: any) {
      console.error("Badge fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, [targetUserId, roomId]);

  // Group badges by category
  const grouped = badges.reduce<Record<string, Badge[]>>((acc, b) => {
    const cat = b.badge_definitions?.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-1">
          {badges.slice(0, 5).map((b) => (
            <Tooltip key={b.id}>
              <TooltipTrigger asChild>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-sm cursor-default">
                  {b.badge_definitions?.icon || "🏅"}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-semibold">{b.badge_definitions?.name}</p>
                <p className="text-muted-foreground">{b.badge_definitions?.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {badges.length > 5 && (
            <span className="inline-flex h-6 items-center px-1.5 rounded-full bg-secondary text-[10px] text-muted-foreground">
              +{badges.length - 5}
            </span>
          )}
          {badges.length === 0 && !loading && (
            <span className="text-[10px] text-muted-foreground">Sem badges</span>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[hsl(var(--clinical-warning))]" />
          <h3 className="text-base font-semibold text-foreground">Conquistas</h3>
          {badges.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {badges.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchBadges} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Metrics summary */}
      {metrics && (
        <div className="grid grid-cols-3 gap-2">
          <MetricChip label="Contribuições" value={metrics.contributions} />
          <MetricChip label="Sessões" value={metrics.sessions_participated} />
          <MetricChip label="Chat" value={metrics.chat_messages} />
          <MetricChip label="Avaliações" value={metrics.peer_evaluations} />
          <MetricChip label="Referências" value={metrics.references_shared} />
          <MetricChip label="Conceito A" value={`${metrics.a_percentage}%`} />
        </div>
      )}

      {/* Badges by category */}
      <TooltipProvider>
        {Object.entries(grouped).map(([category, catBadges]) => {
          const cfg = categoryConfig[category] || categoryConfig.participation;
          const CatIcon = cfg.icon;
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <CatIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {cfg.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {catBadges.map((b) => (
                  <Tooltip key={b.id}>
                    <TooltipTrigger asChild>
                      <div className="clinical-card flex items-center gap-2 px-3 py-2 cursor-default hover:border-primary/30 transition-colors">
                        <span className="text-lg">{b.badge_definitions?.icon || "🏅"}</span>
                        <div>
                          <p className="text-xs font-semibold text-foreground leading-tight">
                            {b.badge_definitions?.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(b.earned_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{b.badge_definitions?.description}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          );
        })}
      </TooltipProvider>

      {badges.length === 0 && !loading && (
        <div className="flex flex-col items-center py-8 text-center">
          <Trophy className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            Nenhuma conquista ainda. Continue participando!
          </p>
        </div>
      )}
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-3 py-2 text-center">
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
