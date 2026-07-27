import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { SupportTicket, TicketStatus, TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from "@/types/support";
import SupportTicketThread from "@/components/support/SupportTicketThread";

const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  open: "border-blue-300 bg-blue-50 text-blue-700",
  pending_admin: "border-amber-300 bg-amber-50 text-amber-700",
  pending_customer: "border-violet-300 bg-violet-50 text-violet-700",
  resolved: "border-green-300 bg-green-50 text-green-700",
  closed: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

interface Props {
  initialTicketId?: string | null;
}

export default function SupportTicketsTab({ initialTicketId }: Props) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialTicketId || null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("support_tickets")
      .select("*, profiles!support_tickets_created_by_profiles_fkey(full_name), institutions(name)")
      .order("last_message_at", { ascending: false });
    if (data) setTickets(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
    const channel = supabase
      .channel("support-tickets-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTickets]);

  const filtered = statusFilter === "all" ? tickets : tickets.filter((t) => t.status === statusFilter);
  const openCount = tickets.filter((t) => t.status === "open" || t.status === "pending_admin").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-primary" /> Chamados de Suporte
          {openCount > 0 && <Badge>{openCount} pendente{openCount > 1 ? "s" : ""}</Badge>}
        </h3>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TicketStatus | "all")}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{TICKET_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-80 shrink-0 space-y-2 max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum chamado encontrado.</p>
            )}
            {filtered.map((t) => (
              <Card
                key={t.id}
                className={cn(
                  "rounded-xl cursor-pointer transition-colors border-border/60",
                  selectedId === t.id ? "border-primary bg-primary/5" : "hover:border-primary/40"
                )}
                onClick={() => setSelectedId(t.id)}
              >
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                    <Badge variant="outline" className={cn("text-[10px]", STATUS_BADGE_CLASS[t.status])}>
                      {TICKET_STATUS_LABELS[t.status] || t.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{t.subject}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{t.profiles?.full_name || "—"}{t.institutions?.name ? ` · ${t.institutions.name}` : ""}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{TICKET_CATEGORY_LABELS[t.category] || t.category}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex-1 min-w-0 rounded-2xl border border-border/60 bg-card/40 p-4">
            {selectedId ? (
              <SupportTicketThread ticketId={selectedId} isAdminView={true} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Selecione um chamado para ver a conversa.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
