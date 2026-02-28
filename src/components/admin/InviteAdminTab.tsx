import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Send, RefreshCw, UserPlus, Clock, CheckCircle2, Loader2, Trash2 } from "lucide-react";

interface Invite {
  id: string;
  email: string;
  status: string;
  created_at: string;
  activated_at: string | null;
  assigned_plan: string | null;
  institution_id: string | null;
  is_stripe_subscriber?: boolean;
  institutions?: { name: string } | null;
}

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
];

const planBadgeClass: Record<string, string> = {
  starter: "border-blue-300 bg-blue-50 text-blue-700",
  professional: "border-purple-300 bg-purple-50 text-purple-700",
  enterprise: "border-amber-300 bg-amber-50 text-amber-700",
};

export default function InviteAdminTab() {
  const [email, setEmail] = useState("");
  const [planName, setPlanName] = useState("starter");
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("invite-admin", {
      body: { action: "list" },
    });
    if (data?.invites) setInvites(data.invites);
    if (error) console.error("Fetch invites error:", error);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { action: "invite", email, plan_name: planName },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || error?.message || "Falha ao enviar convite.", variant: "destructive" });
      } else {
        if (data?.warning) {
          toast({ title: "Convite criado", description: data.warning });
        } else {
          toast({ title: "Convite enviado!", description: `Email de convite enviado para ${email}` });
        }
        setEmail("");
        fetchInvites();
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao enviar convite.", variant: "destructive" });
    }
    setSending(false);
  };

  const handleResend = async (inviteId: string) => {
    setResendingId(inviteId);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { action: "resend_invite", invite_id: inviteId },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || "Falha ao reenviar.", variant: "destructive" });
      } else {
        toast({ title: "Email reenviado!" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao reenviar.", variant: "destructive" });
    }
    setResendingId(null);
  };

  const handleUpdatePlan = async (inviteId: string, newPlan: string) => {
    setUpdatingPlanId(inviteId);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { action: "update_plan", invite_id: inviteId, plan_name: newPlan },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || "Falha ao alterar plano.", variant: "destructive" });
      } else {
        toast({ title: "Plano atualizado!" });
        fetchInvites();
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao alterar plano.", variant: "destructive" });
    }
    setUpdatingPlanId(null);
  };

  const handleRevoke = async (institutionId: string) => {
    setRevokingId(institutionId);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { action: "revoke_access", institution_id: institutionId },
      });
      if (error || data?.error) {
        toast({ title: "Erro", description: data?.error || "Falha ao revogar acesso.", variant: "destructive" });
      } else {
        toast({ title: "Acesso revogado", description: "O administrador e toda a hierarquia foram removidos." });
        fetchInvites();
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao revogar acesso.", variant: "destructive" });
    }
    setRevokingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <div className="clinical-card p-6 max-w-xl">
        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Convidar Novo Administrador
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          O convidado receberá acesso como administrador de instituição com o plano selecionado, sem cobrança recorrente.
        </p>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email do Convidado *</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="admin@instituicao.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-plan">Plano Atribuído *</Label>
            <Select value={planName} onValueChange={setPlanName}>
              <SelectTrigger id="invite-plan">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={sending || !email}>
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Enviar Convite</>
            )}
          </Button>
        </form>
      </div>

      {/* Invite List */}
      <div className="clinical-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Convites Enviados</h3>
          <Button variant="outline" size="sm" onClick={fetchInvites} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        {loading && invites.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum convite enviado ainda.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {invites.map((invite) => {
              const canChangePlan = !invite.is_stripe_subscriber;
              const currentPlan = invite.assigned_plan || "starter";

              return (
                <div key={invite.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.institutions?.name || "—"} • Enviado em {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                        {invite.activated_at && ` • Ativado em ${new Date(invite.activated_at).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Plan badge */}
                      <Badge variant="outline" className={planBadgeClass[currentPlan] || ""}>
                        {PLAN_OPTIONS.find((p) => p.value === currentPlan)?.label || currentPlan}
                      </Badge>

                      {/* Status badge */}
                      {invite.status === "pending" ? (
                        <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                          <Clock className="mr-1 h-3 w-3" /> Pendente
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Ativo
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Resend button for pending invites */}
                    {invite.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResend(invite.id)}
                        disabled={resendingId === invite.id}
                      >
                        {resendingId === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><RefreshCw className="h-4 w-4 mr-1" /> Reenviar</>
                        )}
                      </Button>
                    )}

                    {/* Change plan selector (only for non-Stripe subscribers) */}
                    {canChangePlan && (
                      <Select
                        value={currentPlan}
                        onValueChange={(val) => handleUpdatePlan(invite.id, val)}
                        disabled={updatingPlanId === invite.id}
                      >
                        <SelectTrigger className="w-[160px] h-8 text-xs">
                          <SelectValue placeholder="Alterar plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLAN_OPTIONS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {invite.is_stripe_subscriber && (
                      <span className="text-xs text-muted-foreground italic">Assinante Stripe — plano gerenciado pelo admin</span>
                    )}

                    {/* Revoke button */}
                    {invite.institution_id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={revokingId === invite.institution_id}
                          >
                            {revokingId === invite.institution_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <><Trash2 className="h-4 w-4 mr-1" /> Revogar</>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação irá remover permanentemente o administrador, sua instituição, todos os cursos,
                              turmas, salas e dados associados. Esta ação <strong>não pode ser desfeita</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevoke(invite.institution_id!)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Confirmar revogação
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
