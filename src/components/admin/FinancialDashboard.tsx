import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CreditCard, Users, TrendingUp, AlertTriangle, RefreshCw,
  Building2, CheckCircle2, XCircle, Clock, DollarSign, ShieldOff, Loader2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SubscriptionRow {
  id: string;
  institution_id: string;
  owner_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_product_id: string | null;
  status: string;
  plan_name: string | null;
  max_students: number;
  max_rooms: number;
  ai_enabled: boolean;
  whitelabel_enabled: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  created_at: string;
  institution?: { name: string };
  owner_profile?: { full_name: string };
}

const PLAN_PRICES: Record<string, number> = {
  starter: 49,
  professional: 149,
  enterprise: 399,
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Ativo", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  canceled: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  revoked: { label: "Revogado", color: "bg-red-100 text-red-700 border-red-200", icon: ShieldOff },
  incomplete: { label: "Incompleto", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  past_due: { label: "Atrasado", color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle },
  trialing: { label: "Trial", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
};

export default function FinancialDashboard() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (subs) {
        const instIds = [...new Set(subs.map((s) => s.institution_id))];
        const ownerIds = [...new Set(subs.map((s) => s.owner_id))];

        const [instRes, profileRes] = await Promise.all([
          supabase.from("institutions").select("id, name").in("id", instIds),
          supabase.from("profiles").select("user_id, full_name").in("user_id", ownerIds),
        ]);

        const instMap = Object.fromEntries((instRes.data || []).map((i) => [i.id, i]));
        const profileMap = Object.fromEntries((profileRes.data || []).map((p) => [p.user_id, p]));

        setSubscriptions(
          subs.map((s) => ({
            ...s,
            institution: instMap[s.institution_id],
            owner_profile: profileMap[s.owner_id],
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching financial data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevoke = async (institutionId: string) => {
    setRevokingId(institutionId);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { action: "revoke_access", institution_id: institutionId },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || "Falha ao revogar acesso.", variant: "destructive" });
      } else {
        toast({ title: "Acesso revogado", description: "O acesso do administrador foi revogado com sucesso." });
        fetchData();
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao revogar acesso.", variant: "destructive" });
    }
    setRevokingId(null);
  };

  // Metrics
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan_name || ""] || 0), 0);
  const pastDue = subscriptions.filter((s) => s.status === "past_due");
  const canceledThisMonth = subscriptions.filter((s) => {
    if (s.status !== "canceled" && s.status !== "revoked") return false;
    const now = new Date();
    const created = new Date(s.created_at);
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Dashboard Financeiro</h2>
          <p className="text-sm text-muted-foreground">Visão geral das assinaturas e receita</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ {mrr.toLocaleString("pt-BR")}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeSubs.length} assinatura(s) ativa(s)</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assinantes Ativos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeSubs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">de {subscriptions.length} total</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pagamentos Atrasados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pastDue.length}</div>
            <p className="text-xs text-muted-foreground mt-1">requer atenção</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Churn (mês)</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{canceledThisMonth.length}</div>
            <p className="text-xs text-muted-foreground mt-1">cancelamentos este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan distribution */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Distribuição por Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {["starter", "professional", "enterprise"].map((plan) => {
              const count = activeSubs.filter((s) => s.plan_name === plan).length;
              const revenue = count * (PLAN_PRICES[plan] || 0);
              return (
                <div key={plan} className="rounded-xl border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold capitalize">{plan}</span>
                    <span className="text-xs text-muted-foreground">R$ {PLAN_PRICES[plan]}/mês</span>
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">R$ {revenue.toLocaleString("pt-BR")}/mês</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Subscribers Table */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Todas as Assinaturas ({subscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nenhuma assinatura encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Instituição</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Responsável</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Plano</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Limites</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Vencimento</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => {
                    const cfg = statusConfig[sub.status] || statusConfig.incomplete;
                    const StatusIcon = cfg.icon;
                    const canRevoke = true;
                    return (
                      <tr key={sub.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">{sub.institution?.name || "—"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {sub.owner_profile?.full_name || "—"}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="capitalize">
                            {sub.plan_name || "—"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          <div>{sub.max_students >= 99999 ? "∞" : sub.max_students} alunos</div>
                          <div>{sub.max_rooms >= 99999 ? "∞" : sub.max_rooms} salas</div>
                        </td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {sub.current_period_end
                            ? new Date(sub.current_period_end).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="py-3 px-2">
                          {canRevoke && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={revokingId === sub.institution_id}
                                >
                                  {revokingId === sub.institution_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <><ShieldOff className="h-4 w-4 mr-1" /> Revogar</>
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revogar acesso de "{sub.institution?.name}"?</AlertDialogTitle>
                                   <AlertDialogDescription>
                                     Esta ação irá <strong>apagar permanentemente</strong> todos os dados deste administrador:
                                     <ul className="list-disc pl-5 mt-2 space-y-1">
                                       {sub.stripe_subscription_id && !sub.stripe_customer_id.startsWith("invited_") && (
                                         <li>Cancelar a assinatura no Stripe</li>
                                       )}
                                       <li>Excluir a instituição, cursos, módulos, turmas e salas</li>
                                       <li>Excluir avaliações, mensagens, cenários e referências</li>
                                       <li>Excluir o convite e a assinatura</li>
                                       <li>Excluir a conta do administrador</li>
                                     </ul>
                                     <p className="mt-3 font-semibold text-destructive">Esta ação é irreversível!</p>
                                   </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRevoke(sub.institution_id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Confirmar Revogação
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}