import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { GraduationCap, Mail, Lock, User, BookOpen, ShieldCheck } from "lucide-react";

function ForgotPasswordLink({ email, label }: { email: string; label?: string }) {
  const [sending, setSending] = useState(false);

  const handleForgot = async () => {
    if (!email) {
      toast({ title: "Informe seu email", description: "Preencha o campo de email antes de solicitar a recuperação.", variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset-password",
    });
    if (error) {
      toast({ title: "Erro", description: "Não foi possível enviar o email. Verifique se o email está correto.", variant: "destructive" });
    } else {
      toast({ title: "Email enviado", description: "Verifique sua caixa de entrada para redefinir sua senha." });
    }
    setSending(false);
  };

  return (
    <button
      type="button"
      onClick={handleForgot}
      disabled={sending}
      className="text-xs text-primary hover:underline disabled:opacity-50"
    >
      {sending ? "Enviando..." : label || "Esqueceu sua senha?"}
    </button>
  );
}

export default function Auth() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Student fields
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  // Professor fields
  const [professorName, setProfessorName] = useState("");
  const [professorEmail, setProfessorEmail] = useState("");

  // Admin fields
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const handleRoleLogin = async (email: string, role: "student" | "professor") => {
    const { data, error } = await supabase.functions.invoke("login", {
      body: { email, role },
    });
    if (error || data?.error) {
      return { error: error || new Error(data?.error) };
    }
    // Set the session from the tokens returned by the edge function
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    return { error: sessionError };
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await handleRoleLogin(studentEmail, "student");
      if (error) {
        toast({ title: "Acesso negado", description: "Email não encontrado. Verifique com o administrador se você foi cadastrado.", variant: "destructive" });
      } else {
        const { data: membership } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("student_id", (await supabase.auth.getUser()).data.user?.id ?? "")
          .limit(1)
          .single();

        if (membership) {
          const { data: room } = await supabase
            .from("rooms")
            .select("id")
            .eq("group_id", membership.group_id)
            .eq("status", "active")
            .limit(1)
            .single();

          if (room) {
            navigate(`/session/${room.id}`);
          } else {
            navigate("/dashboard");
          }
        } else {
          navigate("/dashboard");
        }
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado ao entrar.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleProfessorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await handleRoleLogin(professorEmail, "professor");
      if (error) {
        toast({ title: "Acesso negado", description: "Email não encontrado. Verifique com o administrador se você foi cadastrado.", variant: "destructive" });
      } else {
        navigate("/rooms");
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado ao entrar.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(adminEmail, adminPassword);
      if (error) {
        toast({ title: "Erro ao entrar", description: "Credenciais inválidas.", variant: "destructive" });
      } else {
        navigate("/admin");
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado ao entrar.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <Link to="/" className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary hover:opacity-90 transition-opacity cursor-pointer">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">PBL Virtual</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plataforma de Aprendizagem Baseada em Problemas
          </p>
        </div>

        <div className="clinical-card-elevated p-6">
          <Tabs defaultValue="student">
            <TabsList className="mb-6 grid w-full grid-cols-3">
              <TabsTrigger value="student" className="text-xs sm:text-sm">
                <BookOpen className="mr-1.5 h-3.5 w-3.5 hidden sm:inline-block" />
                Estudante
              </TabsTrigger>
              <TabsTrigger value="professor" className="text-xs sm:text-sm">
                <User className="mr-1.5 h-3.5 w-3.5 hidden sm:inline-block" />
                Professor
              </TabsTrigger>
              <TabsTrigger value="admin" className="text-xs sm:text-sm">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 hidden sm:inline-block" />
                Admin
              </TabsTrigger>
            </TabsList>

            {/* Student Tab */}
            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  Insira seu nome e email cadastrados pelo administrador.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="student-name">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="student-name" placeholder="Seu nome completo" className="pl-10"
                      value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="student-email" type="email" placeholder="seu@email.com" className="pl-10"
                      value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar na Sala"}
                </Button>
                <div className="text-center pt-1">
                  <ForgotPasswordLink email={studentEmail} label="Esqueceu seu acesso? Recupere por email" />
                </div>
              </form>
            </TabsContent>

            {/* Professor Tab */}
            <TabsContent value="professor">
              <form onSubmit={handleProfessorLogin} className="space-y-4">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  Insira seu nome e email cadastrados pelo administrador.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="prof-name">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="prof-name" placeholder="Prof. João Silva" className="pl-10"
                      value={professorName} onChange={(e) => setProfessorName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="prof-email" type="email" placeholder="professor@email.com" className="pl-10"
                      value={professorEmail} onChange={(e) => setProfessorEmail(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Acessar Sessão"}
                </Button>
                <div className="text-center pt-1">
                  <ForgotPasswordLink email={professorEmail} label="Esqueceu seu acesso? Recupere por email" />
                </div>
              </form>
            </TabsContent>

            {/* Admin Tab */}
            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  Acesso restrito ao administrador do sistema.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Login</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="admin-email" type="email" placeholder="admin@medpbl.com" className="pl-10"
                      value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="admin-password" type="password" placeholder="••••••••" className="pl-10"
                      value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar como Admin"}
                </Button>
                <div className="text-center pt-1">
                  <ForgotPasswordLink email={adminEmail} />
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
