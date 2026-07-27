// Hand-written until `supabase gen types` picks up the support_ticket* tables.
export type TicketCategory = "billing" | "technical" | "bug" | "feature_request" | "account" | "other";
export type TicketStatus = "open" | "pending_customer" | "pending_admin" | "resolved" | "closed";

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing: "Financeiro/Cobrança",
  technical: "Técnico",
  bug: "Bug/Erro",
  feature_request: "Sugestão de Funcionalidade",
  account: "Conta/Acesso",
  other: "Outro",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  pending_customer: "Aguardando você",
  pending_admin: "Em análise pela equipe",
  resolved: "Resolvido",
  closed: "Fechado",
};

export interface SupportTicket {
  id: string;
  ticket_number: string;
  created_by: string;
  institution_id: string | null;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string } | null;
  institutions?: { name: string } | null;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "customer" | "admin";
  body: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface SupportTicketAttachment {
  id: string;
  ticket_id: string;
  message_id: string;
  uploader_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}
