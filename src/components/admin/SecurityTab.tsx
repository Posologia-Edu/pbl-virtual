import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

export default function SecurityTab() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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

  return (
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
  );
}
