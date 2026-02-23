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
import { CreditCard, ExternalLink, Loader2, CheckCircle2, Users, DoorOpen, AlertTriangle } from "lucide-react";
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
}

interface SubscriptionTabProps {
  subscription: SubscriptionData | null;
  onRefresh: () => void;
}

export default function SubscriptionTab({ subscription, onRefresh }: SubscriptionTabProps) {
  const { refreshSubscription } = useAuth();
  const [loadingPortal, setLoadingPortal] = useState(false);

  const isInvited = subscription?.stripe_customer_id?.startsWith("invited_");

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
                subscription.status === "active"
                  ? "border-green-300 bg-green-50 text-green-700"
                  : "border-red-300 bg-red-50 text-red-700"
              }
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {subscription.status === "active" ? "Ativo" : subscription.status}
            </Badge>
          </div>

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
          {subscription.current_period_end && (
            <p className="text-sm text-muted-foreground">
              Próximo vencimento: {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
            </p>
          )}

          {/* Actions */}
          {!isInvited && subscription.status === "active" && (
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
              <p className="text-xs text-muted-foreground text-center">
                No portal do Stripe você pode alterar forma de pagamento, trocar de plano ou cancelar sua assinatura.
              </p>
            </div>
          )}

          {isInvited && (
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Acesso cortesia — sem cobrança recorrente
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}