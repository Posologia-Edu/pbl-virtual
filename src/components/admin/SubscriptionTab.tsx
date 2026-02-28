import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CreditCard, ExternalLink, Loader2, CheckCircle2, Users, DoorOpen, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SubscriptionData {
  id: string;
  plan_name: string | null;
  status: string;
  max_students: number | null;
  max_rooms: number | null;
  ai_enabled: boolean | null;
  whitelabel_enabled: boolean | null;
  current_period_end: string | null;
  stripe_customer_id: string;
  cancel_at: string | null;
}

interface SubscriptionTabProps {
  subscription: SubscriptionData | null;
  onRefresh: () => void;
}

export default function SubscriptionTab({ subscription, onRefresh }: SubscriptionTabProps) {
  const { refreshSubscription } = useAuth();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);

  const isInvited = subscription?.stripe_customer_id?.startsWith("invited_");
  const isCanceled = subscription?.status === "canceled" || !!subscription?.cancel_at;

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || "Falha ao abrir portal.", variant: "destructive" });
      } else if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao abrir portal de assinatura.", variant: "destructive" });
    }
    setLoadingPortal(false);
  };

  const handleCancelSubscription = async () => {
    setLoadingCancel(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription");
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || "Falha ao cancelar assinatura.", variant: "destructive" });
      } else {
        toast({ title: "Assinatura cancelada", description: "Sua assinatura continuará ativa até o fim do período atual." });
        onRefresh();
        refreshSubscription();
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao cancelar assinatura.", variant: "destructive" });
    }
    setLoadingCancel(false);
  };

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <CreditCard className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Nenhuma informação de assinatura encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Sua Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan name & status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plano</p>
              <p className="text-lg font-semibold capitalize">{subscription.plan_name || "—"}</p>
            </div>
            <Badge
              variant="outline"
              className={
                isCanceled
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : subscription.status === "active"
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-red-300 bg-red-50 text-red-700"
              }
            >
              {isCanceled ? (
                <><AlertTriangle className="mr-1 h-3 w-3" /> Cancelamento agendado</>
              ) : (
                <><CheckCircle2 className="mr-1 h-3 w-3" /> {subscription.status === "active" ? "Ativo" : subscription.status}</>
              )}
            </Badge>
          </div>

          {/* Cancel notice */}
          {isCanceled && subscription.cancel_at && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Cancelamento agendado</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Sua assinatura permanecerá ativa até{" "}
                    <strong>{new Date(subscription.cancel_at).toLocaleDateString("pt-BR")}</strong>.
                    Após essa data, o acesso será suspenso.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Limits */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Alunos</p>
                <p className="text-sm font-medium">
                  {(subscription.max_students ?? 0) >= 99999 ? "Ilimitado" : subscription.max_students}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Salas</p>
                <p className="text-sm font-medium">
                  {(subscription.max_rooms ?? 0) >= 99999 ? "Ilimitado" : subscription.max_rooms}
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="flex gap-3 flex-wrap">
            {subscription.ai_enabled && (
              <Badge variant="secondary">IA Habilitada</Badge>
            )}
            {subscription.whitelabel_enabled && (
              <Badge variant="secondary">White Label</Badge>
            )}
          </div>

          {/* Period end */}
          {subscription.current_period_end && !isCanceled && (
            <p className="text-sm text-muted-foreground">
              Próximo vencimento: {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
            </p>
          )}

          {/* Actions */}
          {!isInvited && (subscription.status === "active" || subscription.status === "trialing") && (
            <div className="pt-4 border-t border-border/50 space-y-3">
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="w-full"
              >
                {loadingPortal ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abrindo portal...</>
                ) : (
                  <><ExternalLink className="mr-2 h-4 w-4" /> Gerenciar Assinatura (Stripe)</>
                )}
              </Button>

              {!isCanceled && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
                      <XCircle className="mr-2 h-4 w-4" /> Cancelar Assinatura
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sua assinatura <strong className="capitalize">{subscription.plan_name}</strong> continuará
                        ativa até o fim do período atual
                        {subscription.current_period_end && (
                          <> (<strong>{new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}</strong>)</>
                        )}
                        . Após essa data, você perderá acesso aos recursos do plano.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSubscription}
                        disabled={loadingCancel}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {loadingCancel ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelando...</>
                        ) : (
                          "Confirmar cancelamento"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <p className="text-xs text-muted-foreground text-center">
                No portal do Stripe você pode alterar forma de pagamento ou trocar de plano.
              </p>
            </div>
          )}

          {isInvited && (
            <div className="pt-4 border-t border-border/50 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Plano atribuído pelo administrador do sistema — sem cobrança recorrente
              </div>
              <p className="text-xs text-muted-foreground">
                Para alterar seu plano, entre em contato com o administrador do sistema.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
