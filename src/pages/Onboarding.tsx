import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Building2, Mail, Lock, User, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const rise = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [step, setStep] = useState<"account" | "institution" | "done">("account");
  const [loading, setLoading] = useState(false);

  // Account fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Institution fields
  const [institutionName, setInstitutionName] = useState("");

  // Pre-fill email from Stripe session if available
  useEffect(() => {
    if (!sessionId) return;
    const fetchSession = async () => {
      try {
        const { data } = await supabase.functions.invoke("setup-institution", {
          body: { action: "get-session-email", sessionId },
        });
        if (data?.email) setEmail(data.email);
      } catch {
        // ignore - user can type email manually
      }
    };
    fetchSession();
  }, [sessionId]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/admin",
          data: { full_name: fullName },
        },
      });
      if (error) throw error;

      // Sign in immediately
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      setStep("institution");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName.trim()) {
      toast.error("Informe o nome da instituição");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      const { data, error } = await supabase.functions.invoke("setup-institution", {
        body: {
          action: "setup",
          institutionName: institutionName.trim(),
          stripeSessionId: sessionId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep("done");

      // Wait a moment then redirect to admin
      setTimeout(() => {
        navigate("/admin");
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao configurar instituição");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(25,30%,92%)] text-foreground flex items-center justify-center p-6">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(30,40%,88%)] via-[hsl(25,25%,90%)] to-[hsl(210,30%,88%)]" />
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-bl from-[hsl(210,60%,85%)]/40 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={rise}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">
            {step === "account" && "Crie sua conta"}
            {step === "institution" && "Configure sua instituição"}
            {step === "done" && "Tudo pronto!"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "account" && "Primeiro, crie suas credenciais de acesso"}
            {step === "institution" && "Agora, dê um nome à sua instituição"}
            {step === "done" && "Sua instituição foi criada com sucesso"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {["account", "institution", "done"].map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= ["account", "institution", "done"].indexOf(step)
                  ? "bg-primary"
                  : "bg-foreground/10"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-xl p-8">
          {step === "account" && (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Seu nome completo"
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
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

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
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

              <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Criar conta
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/?auth=open")}
                  className="text-sm text-primary hover:underline"
                >
                  Já tenho uma conta
                </button>
              </div>
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
                  <>
                    Criar instituição
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
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

        {/* Back to home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-foreground/50 hover:text-foreground/70 transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </motion.div>
    </div>
  );
}
