import { useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Send, Loader2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({ title: t("contact.errorEmpty", "Preencha todos os campos."), variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact", {
        body: {
          subject: subject.trim(),
          message: message.trim(),
          senderName: profile?.full_name || user?.email || "Usuário",
          senderEmail: user?.email || "",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: t("contact.success", "Mensagem enviada com sucesso!") });
      setSubject("");
      setMessage("");
    } catch (err: any) {
      toast({ title: t("contact.errorSend", "Erro ao enviar mensagem."), description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-1 items-start justify-center p-4 md:p-8">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{t("contact.title", "Fale Conosco")}</CardTitle>
            <CardDescription>{t("contact.description", "Envie sua mensagem e responderemos o mais breve possível.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("contact.from", "De")}</Label>
                <Input
                  value={`${profile?.full_name || ""} <${user?.email || ""}>`}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">{t("contact.subject", "Assunto")}</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("contact.subjectPlaceholder", "Digite o assunto")}
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">{t("contact.message", "Mensagem")}</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("contact.messagePlaceholder", "Escreva sua mensagem...")}
                  rows={6}
                  maxLength={5000}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {t("contact.send", "Enviar")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
