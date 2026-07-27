import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Paperclip, Send, Loader2, FileText, X } from "lucide-react";
import {
  SupportTicket, SupportTicketMessage, SupportTicketAttachment,
  TicketCategory, TicketStatus, TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS,
} from "@/types/support";
import TicketDiagnosticsPanel from "@/components/admin/support/TicketDiagnosticsPanel";

interface Props {
  ticketId: string;
  isAdminView: boolean;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  open: "border-blue-300 bg-blue-50 text-blue-700",
  pending_admin: "border-amber-300 bg-amber-50 text-amber-700",
  pending_customer: "border-violet-300 bg-violet-50 text-violet-700",
  resolved: "border-green-300 bg-green-50 text-green-700",
  closed: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

export default function SupportTicketThread({ ticketId, isAdminView }: Props) {
  const { user, profile } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [attachments, setAttachments] = useState<SupportTicketAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTicket = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("support_tickets")
      .select("*, profiles!support_tickets_created_by_profiles_fkey(full_name), institutions(name)")
      .eq("id", ticketId)
      .single();
    if (data) setTicket(data);
  }, [ticketId]);

  const fetchMessages = useCallback(async () => {
    const [messagesRes, attachmentsRes] = await Promise.all([
      (supabase as any)
        .from("support_ticket_messages")
        .select("*, profiles!support_ticket_messages_sender_id_profiles_fkey(full_name)")
        .eq("ticket_id", ticketId)
        .order("created_at"),
      (supabase as any)
        .from("support_ticket_attachments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at"),
    ]);
    if (messagesRes.data) setMessages(messagesRes.data);
    if (attachmentsRes.data) setAttachments(attachmentsRes.data);
  }, [ticketId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTicket(), fetchMessages()]).finally(() => setLoading(false));

    const channel = supabase
      .channel(`support-ticket-${ticketId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "support_ticket_messages",
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        setMessages((prev) => (prev.some((m) => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as any]));
        fetchMessages();
        fetchTicket();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId, fetchTicket, fetchMessages]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const valid: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "Arquivo muito grande", description: `${file.name}: máximo de 20MB.`, variant: "destructive" });
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: "Tipo de arquivo não permitido", description: `${file.name}: apenas PDF, DOC/DOCX, PNG e JPG.`, variant: "destructive" });
        continue;
      }
      valid.push(file);
    }
    setPendingFiles((prev) => [...prev, ...valid]);
  };

  const handleSend = async () => {
    if (!user || (!body.trim() && pendingFiles.length === 0)) return;
    setSending(true);
    try {
      const senderRole = isAdminView ? "admin" : "customer";
      const { data: message, error } = await (supabase as any)
        .from("support_ticket_messages")
        .insert({ ticket_id: ticketId, sender_id: user.id, sender_role: senderRole, body: body.trim() })
        .select()
        .single();

      if (error || !message) {
        toast({ title: "Erro ao enviar mensagem", description: error?.message, variant: "destructive" });
        return;
      }

      for (const file of pendingFiles) {
        const ext = file.name.split(".").pop();
        const path = `${ticketId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("support-tickets").upload(path, file);
        if (uploadError) {
          toast({ title: "Erro no upload", description: `${file.name}: ${uploadError.message}`, variant: "destructive" });
          continue;
        }
        await (supabase as any).from("support_ticket_attachments").insert({
          ticket_id: ticketId,
          message_id: message.id,
          uploader_id: user.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
        });
      }

      setBody("");
      setPendingFiles([]);
      await fetchMessages();
      await fetchTicket();

      if (isAdminView) {
        supabase.functions.invoke("support-ticket-notify", {
          body: { action: "admin_reply", ticket_id: ticketId, message_id: message.id },
        }).catch(() => {});
      }
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setChangingStatus(true);
    try {
      const { error } = await (supabase as any).from("support_tickets").update({ status: newStatus }).eq("id", ticketId);
      if (error) {
        toast({ title: "Erro ao mudar status", description: error.message, variant: "destructive" });
        return;
      }
      await fetchTicket();
      toast({ title: "Status atualizado" });
      supabase.functions.invoke("support-ticket-notify", {
        body: { action: "status_change", ticket_id: ticketId, new_status: newStatus },
      }).catch(() => {});
    } finally {
      setChangingStatus(false);
    }
  };

  const openAttachment = async (att: SupportTicketAttachment) => {
    const { data } = await supabase.storage.from("support-tickets").createSignedUrl(att.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast({ title: "Erro ao abrir arquivo", variant: "destructive" });
  };

  if (loading || !ticket) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_number}</p>
          <h3 className="text-lg font-semibold">{ticket.subject}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline">{TICKET_CATEGORY_LABELS[ticket.category as TicketCategory] || ticket.category}</Badge>
            {!isAdminView && (
              <Badge variant="outline" className={STATUS_BADGE_CLASS[ticket.status as TicketStatus]}>
                {TICKET_STATUS_LABELS[ticket.status as TicketStatus] || ticket.status}
              </Badge>
            )}
          </div>
        </div>
        {isAdminView && (
          <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as TicketStatus)} disabled={changingStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{TICKET_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isAdminView && <TicketDiagnosticsPanel institutionId={ticket.institution_id} />}

      <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4 max-h-[420px] overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mensagem ainda.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          const atts = attachments.filter((a) => a.message_id === m.id);
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.sender_role === "admin" ? "bg-primary/10 text-foreground" : "bg-secondary text-secondary-foreground"
              }`}>
                <p className="text-[11px] font-medium text-muted-foreground mb-1">
                  {m.profiles?.full_name || (m.sender_role === "admin" ? "Suporte" : "Cliente")}
                </p>
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                {atts.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {atts.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => openAttachment(a)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3" /> {a.file_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== "closed" && (
        <div className="space-y-2">
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pendingFiles.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {f.name}
                  <button onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isAdminView ? "Escreva sua resposta..." : "Escreva sua mensagem..."}
            rows={3}
          />
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="mr-1.5 h-3.5 w-3.5" /> Anexar
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              onClick={handleSend}
              disabled={sending || (!body.trim() && pendingFiles.length === 0)}
            >
              {sending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
