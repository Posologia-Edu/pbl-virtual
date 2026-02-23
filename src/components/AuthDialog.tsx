import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { GraduationCap, Mail, Lock, User, BookOpen, ShieldCheck } from "lucide-react";

function ForgotPasswordLink({ email, label }: { email: string; label?: string }) {
  const [sending, setSending] = useState(false);
  const { t } = useTranslation();

  const handleForgot = async () => {
    if (!email) {
      toast({ title: t("auth.enterEmailFirst"), description: t("auth.enterEmailFirstDesc"), variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset-password",
    });
    if (error) {
      toast({ title: t("auth.error"), description: t("auth.emailError"), variant: "destructive" });
    } else {
      toast({ title: t("auth.emailSent"), description: t("auth.emailSentDesc") });
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
      {sending ? t("auth.sending") : label || t("auth.forgotPassword")}
    </button>
  );
}

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [professorName, setProfessorName] = useState("");
  const [professorEmail, setProfessorEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const handleRoleLogin = async (email: string, role: "student" | "professor") => {
    const { data, error } = await supabase.functions.invoke("login", {
      body: { email, role },
    });
    if (error || data?.error) {
      return { error: error || new Error(data?.error) };
    }
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
        toast({ title: t("auth.accessDenied"), description: t("auth.accessDeniedDesc"), variant: "destructive" });
      } else {
        onOpenChange(false);
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
      toast({ title: t("auth.error"), description: t("auth.unexpectedError"), variant: "destructive" });
    }
    setLoading(false);
  };

  const handleProfessorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await handleRoleLogin(professorEmail, "professor");
      if (error) {
        toast({ title: t("auth.accessDenied"), description: t("auth.accessDeniedDesc"), variant: "destructive" });
      } else {
        onOpenChange(false);
        navigate("/rooms");
      }
    } catch {
      toast({ title: t("auth.error"), description: t("auth.unexpectedError"), variant: "destructive" });
    }
    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(adminEmail, adminPassword);
      if (error) {
        toast({ title: t("auth.error"), description: t("auth.invalidCredentials"), variant: "destructive" });
      } else {
        onOpenChange(false);
        navigate("/admin");
      }
    } catch {
      toast({ title: t("auth.error"), description: t("auth.unexpectedError"), variant: "destructive" });
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch {
      toast({ title: t("auth.error"), description: t("auth.unexpectedError"), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 rounded-2xl overflow-hidden border-none bg-background/95 backdrop-blur-xl shadow-2xl">
        <DialogTitle className="sr-only">{t("auth.title")}</DialogTitle>

        {/* Header */}
        <div className="text-center pt-8 pb-4 px-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{t("auth.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.subtitle")}</p>
        </div>

        {/* Google Login */}
        <div className="px-6 pb-2">
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl font-medium gap-3 border-border/60 hover:bg-muted/50"
            onClick={handleGoogleLogin}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t("auth.googleLogin")}
          </Button>

          {/* Separator */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background/95 px-3 text-muted-foreground">{t("auth.orContinueWith")}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pb-8">
          <Tabs defaultValue="student">
            <TabsList className="mb-5 grid w-full grid-cols-3">
              <TabsTrigger value="student" className="text-xs sm:text-sm">
                <BookOpen className="mr-1.5 h-3.5 w-3.5 hidden sm:inline-block" />
                {t("auth.studentTab")}
              </TabsTrigger>
              <TabsTrigger value="professor" className="text-xs sm:text-sm">
                <User className="mr-1.5 h-3.5 w-3.5 hidden sm:inline-block" />
                {t("auth.professorTab")}
              </TabsTrigger>
              <TabsTrigger value="admin" className="text-xs sm:text-sm">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 hidden sm:inline-block" />
                {t("auth.adminTab")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="student">
              <form onSubmit={handleStudentLogin} className="space-y-3">
                <p className="text-xs text-muted-foreground text-center mb-2">{t("auth.studentHint")}</p>
                <div className="space-y-1.5">
                  <Label htmlFor="d-student-name">{t("auth.fullName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="d-student-name" placeholder={t("auth.studentNamePlaceholder")} className="pl-10"
                      value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-student-email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="d-student-email" type="email" placeholder="seu@email.com" className="pl-10"
                      value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.loading") : t("auth.enterRoom")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="professor">
              <form onSubmit={handleProfessorLogin} className="space-y-3">
                <p className="text-xs text-muted-foreground text-center mb-2">{t("auth.professorHint")}</p>
                <div className="space-y-1.5">
                  <Label htmlFor="d-prof-name">{t("auth.fullName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="d-prof-name" placeholder={t("auth.professorNamePlaceholder")} className="pl-10"
                      value={professorName} onChange={(e) => setProfessorName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-prof-email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="d-prof-email" type="email" placeholder="professor@email.com" className="pl-10"
                      value={professorEmail} onChange={(e) => setProfessorEmail(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.loading") : t("auth.accessSession")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <p className="text-xs text-muted-foreground text-center mb-2">{t("auth.adminHint")}</p>
                <div className="space-y-1.5">
                  <Label htmlFor="d-admin-email">{t("auth.login")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="d-admin-email" type="email" placeholder="admin@medpbl.com" className="pl-10"
                      value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-admin-password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="d-admin-password" type="password" placeholder="••••••••" className="pl-10"
                      value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.loading") : t("auth.enterAsAdmin")}
                </Button>
                <div className="text-center pt-1">
                  <ForgotPasswordLink email={adminEmail} />
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
