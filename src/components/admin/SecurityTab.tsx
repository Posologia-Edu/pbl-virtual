import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { KeyRound, CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SecretStatus {
  key: string;
  label: string;
  category: string;
  configured: boolean;
}

export default function SecurityTab() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [secrets, setSecrets] = useState<SecretStatus[]>([]);
  const [loadingSecrets, setLoadingSecrets] = useState(true);

  useEffect(() => {
    const fetchSecrets = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-secrets");
        if (error) throw error;
        setSecrets(data.secrets ?? []);
      } catch {
        toast({ title: "Erro", description: "Falha ao verificar status dos serviços.", variant: "destructive" });
      } finally {
        setLoadingSecrets(false);
      }
    };
    fetchSecrets();
  }, []);

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await supabase.functions.invoke("manage-users", {
        body: { action: "change_password", new_password: newPassword },
      });
      if (res.error || res.data?.error) {
        toast({ title: "Erro", description: res.data?.error || res.error?.message, variant: "destructive" });
      } else {
        toast({ title: "Senha alterada com sucesso!" });
        setNewPassword(""); setConfirmPassword("");
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao alterar senha.", variant: "destructive" });
    }
    setChangingPassword(false);
  };

  const configuredCount = secrets.filter((s) => s.configured).length;

  return (
    <div className="space-y-6">
      {/* API Keys Status */}
      <div className="clinical-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Status dos Serviços</h3>
          {!loadingSecrets && (
            <Badge variant={configuredCount === secrets.length ? "default" : "secondary"} className="ml-auto">
              {configuredCount}/{secrets.length} configurados
            </Badge>
          )}
        </div>

        {loadingSecrets ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando chaves de API...
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {secrets.map((s) => (
              <div
                key={s.key}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  s.configured
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-destructive/30 bg-destructive/5"
                }`}
              >
                {s.configured ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.configured ? "Chave configurada" : "Não configurada"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="clinical-card p-6 max-w-lg">
        <h3 className="mb-4 text-base font-semibold text-foreground">Alterar Senha do Administrador</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Confirmar Nova Senha</Label>
            <Input type="password" placeholder="Repita a senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={changePassword} disabled={changingPassword || !newPassword || !confirmPassword}>
            <KeyRound className="mr-2 h-4 w-4" />{changingPassword ? "Alterando..." : "Alterar Senha"}
          </Button>
        </div>
      </div>
    </div>
  );
}
