import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { GraduationCap, Mail, Lock, User, BookOpen, ShieldCheck, Globe } from "lucide-react";

const languages = [
  { code: "pt", flag: "🇧🇷" },
  { code: "en", flag: "🇺🇸" },
  { code: "es", flag: "🇪🇸" },
];

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

export default function Auth() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
        navigate("/admin");
      }
    } catch {
      toast({ title: t("auth.error"), description: t("auth.unexpectedError"), variant: "destructive" });
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
          <h1 className="text-2xl font-bold text-foreground">{t("auth.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("auth.subtitle")}
          </p>
          {/* Language selector */}
          <div className="mt-3 flex items-center justify-center gap-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`rounded-full px-3 py-1 text-sm transition-all ${
                  i18n.language?.startsWith(lang.code)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {lang.flag}
              </button>
            ))}
          </div>
        </div>

        <div className="clinical-card-elevated p-6">
          <Tabs defaultValue="student">
            <TabsList className="mb-6 grid w-full grid-cols-3">
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
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  {t("auth.studentHint")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="student-name">{t("auth.fullName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="student-name" placeholder={t("auth.studentNamePlaceholder")} className="pl-10"
                      value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="student-email" type="email" placeholder="seu@email.com" className="pl-10"
                      value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.loading") : t("auth.enterRoom")}
                </Button>
                <div className="text-center pt-1">
                  <ForgotPasswordLink email={studentEmail} label={t("auth.forgotAccess")} />
                </div>
              </form>
            </TabsContent>

            <TabsContent value="professor">
              <form onSubmit={handleProfessorLogin} className="space-y-4">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  {t("auth.professorHint")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="prof-name">{t("auth.fullName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="prof-name" placeholder={t("auth.professorNamePlaceholder")} className="pl-10"
                      value={professorName} onChange={(e) => setProfessorName(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="prof-email" type="email" placeholder="professor@email.com" className="pl-10"
                      value={professorEmail} onChange={(e) => setProfessorEmail(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.loading") : t("auth.accessSession")}
                </Button>
                <div className="text-center pt-1">
                  <ForgotPasswordLink email={professorEmail} label={t("auth.forgotAccess")} />
                </div>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  {t("auth.adminHint")}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">{t("auth.login")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="admin-email" type="email" placeholder="admin@medpbl.com" className="pl-10"
                      value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="admin-password" type="password" placeholder="••••••••" className="pl-10"
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
      </div>
    </div>
  );
}
