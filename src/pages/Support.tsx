import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { LifeBuoy, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { SupportTicket, TicketCategory, TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS, TicketStatus } from "@/types/support";
import SupportTicketThread from "@/components/support/SupportTicketThread";

const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  open: "border-blue-300 bg-blue-50 text-blue-700",
  pending_admin: "border-amber-300 bg-amber-50 text-amber-700",
  pending_customer: "border-violet-300 bg-violet-50 text-violet-700",
  resolved: "border-green-300 bg-green-50 text-green-700",
  closed: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

export default function Support() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketId = searchParams.get("ticket");

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("support_tickets")
      .select("*")
      .eq("created_by", user.id)
      .order("last_message_at", { ascending: false });
    if (data) setTickets(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleCreate = async () => {
    if (!user || !subject.trim() || !category || !message.trim()) {
      toast({ title: "Preencha assunto, categoria e mensagem.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: ticket, error } = await (supabase as any)
        .from("support_tickets")
        .insert({ created_by: user.id, subject: subject.trim(), category })
        .select()
        .single();

      if (error || !ticket) {
        toast({ title: "Erro ao abrir chamado", description: error?.message, variant: "destructive" });
        return;
      }

      await (supabase as any).from("support_ticket_messages").insert({
        ticket_id: ticket.id, sender_id: user.id, sender_role: "customer", body: message.trim(),
      });

      supabase.functions.invoke("support-ticket-notify", {
        body: { action: "new_ticket", ticket_id: ticket.id },
      }).catch(() => {});

      toast({ title: "Chamado aberto!", description: ticket.ticket_number });
      setSubject(""); setCategory(""); setMessage(""); setDialogOpen(false);
      await fetchTickets();
      setSearchParams({ ticket: ticket.id });
    } finally {
      setCreating(false);
    }
  };

  if (ticketId) {
    return (
      <Layout>
        <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSearchParams({})}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Meus chamados
          </Button>
          <SupportTicketThread ticketId={ticketId} isAdminView={false} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LifeBuoy className="h-6 w-6 text-primary" /> Suporte
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Abra um chamado e acompanhe suas conversas com nossa equipe.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-1.5 h-4 w-4" /> Novo chamado</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Abrir novo chamado</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Assunto</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Resumo do problema" />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map((c) => (
                        <SelectItem key={c} value={c}>{TICKET_CATEGORY_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Mensagem</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={5000} placeholder="Descreva o problema com detalhes..." />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Abrir chamado
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : tickets.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Você ainda não abriu nenhum chamado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Card
                key={t.id}
                className="rounded-2xl border-border/60 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setSearchParams({ ticket: t.id })}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{t.subject}</CardTitle>
                      <CardDescription className="font-mono text-xs">{t.ticket_number}</CardDescription>
                    </div>
                    <Badge variant="outline" className={STATUS_BADGE_CLASS[t.status]}>
                      {TICKET_STATUS_LABELS[t.status] || t.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="outline">{TICKET_CATEGORY_LABELS[t.category] || t.category}</Badge>
                  <span>Última atividade: {new Date(t.last_message_at).toLocaleString("pt-BR")}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
