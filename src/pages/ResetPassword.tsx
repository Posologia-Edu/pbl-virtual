import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { GraduationCap, Lock, CheckCircle, Building2, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<"password" | "institution" | "done">("password");
  const [institutionName, setInstitutionName] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar a senha. Tente novamente.", variant: "destructive" });
      setLoading(false);
      return;
    }
    toast({ title: "Senha atualizada", description: "Sua senha foi alterada com sucesso." });

    // Check if user is an invited admin without institution
    try {
      const { data } = await supabase.functions.invoke("setup-institution", {
        body: { action: "check-invited-status" },
      });
      if (data?.needsInstitution) {
        setStep("institution");
        setLoading(false);
        return;
      }
    } catch {
      // Not an invited admin, proceed normally
    }

    setLoading(false);
    navigate("/auth");
  };

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName.trim()) {
      toast({ title: "Erro", description: "Informe o nome da instituição.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("setup-institution", {
        body: { action: "setup-invited", institutionName: institutionName.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep("done");
      setTimeout(() => navigate("/admin"), 3000);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Falha ao criar instituição.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Verificando link...</h1>
          <p className="text-sm text-muted-foreground">
            Se o link expirou,{" "}
            <button onClick={() => navigate("/auth")} className="text-primary underline">
              solicite um novo
            </button>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {step === "password" && "Nova Senha"}
            {step === "institution" && "Configure sua Instituição"}
            {step === "done" && "Tudo pronto!"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "password" && "Defina sua nova senha de acesso"}
            {step === "institution" && "Dê um nome à sua instituição para começar"}
            {step === "done" && "Sua instituição foi criada com sucesso"}
          </p>
        </div>

        <div className="clinical-card-elevated p-6">
          {step === "password" && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <div className="relative">
                  <CheckCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repita a senha"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar Nova Senha"}
              </Button>
            </form>
          )}

          {step === "institution" && (
            <form onSubmit={handleCreateInstitution} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="institutionName">Nome da instituição</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="institutionName"
                    placeholder="Ex: Universidade Federal de..."
                    className="pl-10"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    required
                    maxLength={200}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Você será o administrador desta instituição e poderá gerenciar cursos, turmas, professores e alunos.
              </p>
              <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Criar instituição <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-bold">Instituição criada!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Você será redirecionado para o painel de administração em instantes...
                </p>
              </div>
              <Button onClick={() => navigate("/admin")} variant="outline" className="rounded-xl">
                Ir para o painel agora
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
