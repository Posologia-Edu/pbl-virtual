import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Send, RefreshCw, UserPlus, Clock, CheckCircle2, Loader2 } from "lucide-react";

interface Invite {
  id: string;
  email: string;
  status: string;
  created_at: string;
  activated_at: string | null;
  institutions?: { name: string } | null;
}

export default function InviteAdminTab() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

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
        body: { action: "invite", email },
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

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <div className="clinical-card p-6 max-w-xl">
        <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Convidar Novo Administrador (Cortesia)
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          O convidado receberá acesso completo como administrador de instituição sem cobrança recorrente.
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
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between py-3 gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {invite.institutions?.name || "—"} • Enviado em {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                    {invite.activated_at && ` • Ativado em ${new Date(invite.activated_at).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {invite.status === "pending" ? (
                    <>
                      <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                        <Clock className="mr-1 h-3 w-3" /> Pendente
                      </Badge>
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
                    </>
                  ) : (
                    <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Ativo
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
