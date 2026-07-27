import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, DoorOpen, Layers, Cpu } from "lucide-react";

interface Props {
  institutionId: string | null;
}

interface Diagnostics {
  institutionName: string | null;
  subscription: {
    plan_name: string | null;
    status: string;
    max_students: number | null;
    max_rooms: number | null;
    max_ai_interactions: number | null;
    current_period_end: string | null;
    cancel_at: string | null;
  } | null;
  courseCount: number;
  roomCount: number;
  studentCount: number;
  recentSessions: number;
  aiUsage: { provider: string; model: string; estimated_cost_usd: number; created_at: string }[];
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo", trialing: "Trial", canceled: "Cancelado", incomplete: "Incompleto",
  past_due: "Atrasado", unpaid: "Inadimplente",
};

export default function TicketDiagnosticsPanel({ institutionId }: Props) {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!institutionId) { setData(null); setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [instRes, subRes, coursesRes] = await Promise.all([
        supabase.from("institutions").select("name").eq("id", institutionId).maybeSingle(),
        supabase.from("subscriptions").select("plan_name, status, max_students, max_rooms, max_ai_interactions, current_period_end, cancel_at").eq("institution_id", institutionId).maybeSingle(),
        supabase.from("courses").select("id").eq("institution_id", institutionId),
      ]);

      const courseIds = (coursesRes.data || []).map((c) => c.id);
      let roomCount = 0;
      let recentSessions = 0;
      if (courseIds.length > 0) {
        const { data: groups } = await supabase.from("groups").select("id").in("course_id", courseIds);
        const groupIds = (groups || []).map((g) => g.id);
        if (groupIds.length > 0) {
          const { data: rooms } = await supabase.from("rooms").select("id").in("group_id", groupIds);
          roomCount = rooms?.length || 0;
          const roomIds = (rooms || []).map((r) => r.id);
          if (roomIds.length > 0) {
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { count } = await supabase
              .from("tutorial_sessions")
              .select("id", { count: "exact", head: true })
              .in("room_id", roomIds)
              .gte("started_at", since);
            recentSessions = count || 0;
          }
        }
      }

      const { data: studentCount } = await supabase.rpc("institution_student_count" as any, { _institution_id: institutionId });

      // Resolve the institution's users (owner + course members) to scope ai_usage_log
      const userIds = new Set<string>();
      const { data: inst } = await supabase.from("institutions").select("owner_id").eq("id", institutionId).maybeSingle();
      if (inst?.owner_id) userIds.add(inst.owner_id);
      if (courseIds.length > 0) {
        const { data: members } = await supabase.from("course_members").select("user_id").in("course_id", courseIds);
        (members || []).forEach((m: any) => userIds.add(m.user_id));
      }

      let aiUsage: Diagnostics["aiUsage"] = [];
      if (userIds.size > 0) {
        const { data: usage } = await supabase
          .from("ai_usage_log" as any)
          .select("provider, model, estimated_cost_usd, created_at")
          .in("user_id", Array.from(userIds))
          .order("created_at", { ascending: false })
          .limit(20);
        aiUsage = (usage as any) || [];
      }

      if (cancelled) return;
      setData({
        institutionName: instRes.data?.name || null,
        subscription: subRes.data || null,
        courseCount: courseIds.length,
        roomCount,
        studentCount: (studentCount as number) ?? 0,
        recentSessions,
        aiUsage,
      });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [institutionId]);

  if (!institutionId) {
    return (
      <Card className="rounded-xl border-dashed">
        <CardContent className="py-4 text-sm text-muted-foreground text-center">
          Sem instituição associada a este chamado.
        </CardContent>
      </Card>
    );
  }

  if (loading || !data) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card className="rounded-xl border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          {data.institutionName || "Instituição"} — Diagnóstico
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {data.subscription ? (
            <>
              <Badge variant="outline" className="capitalize">{data.subscription.plan_name || "sem plano"}</Badge>
              <Badge variant="outline">{STATUS_LABEL[data.subscription.status] || data.subscription.status}</Badge>
              {data.subscription.cancel_at && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                  Cancelamento agendado
                </Badge>
              )}
              {data.subscription.current_period_end && (
                <span className="text-xs text-muted-foreground">
                  Vencimento: {new Date(data.subscription.current_period_end).toLocaleDateString("pt-BR")}
                </span>
              )}
            </>
          ) : (
            <Badge variant="outline">Sem assinatura</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={Layers} label="Cursos" value={data.courseCount} />
          <Stat icon={DoorOpen} label="Salas" value={data.roomCount} />
          <Stat icon={Users} label="Alunos" value={`${data.studentCount}${data.subscription?.max_students ? ` / ${data.subscription.max_students}` : ""}`} />
          <Stat icon={Layers} label="Sessões (30d)" value={data.recentSessions} />
        </div>

        {data.aiUsage.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" /> Uso recente de IA
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {data.aiUsage.map((u, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{u.provider} / {u.model}</span>
                  <span>{new Date(u.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/50 p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px]">{label}</span>
      </div>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}
