import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_LABELS: Record<string, string> = {
  billing: "Financeiro/Cobrança",
  technical: "Técnico",
  bug: "Bug/Erro",
  feature_request: "Sugestão de Funcionalidade",
  account: "Conta/Acesso",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  pending_customer: "Aguardando você",
  pending_admin: "Em análise pela equipe",
  resolved: "Resolvido",
  closed: "Fechado",
};

function emailShell(title: string, bodyHtml: string, ctaUrl: string, ctaLabel: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-block;background:#1a1a2e;border-radius:16px;padding:12px;">
            <span style="color:#ffffff;font-size:24px;font-weight:bold;">PBL</span>
          </div>
        </div>
        <h1 style="color:#1a1a2e;font-size:24px;font-weight:bold;margin:0 0 16px;text-align:center;">
          ${title}
        </h1>
        ${bodyHtml}
        <div style="text-align:center;margin:32px 0;">
          <a href="${ctaUrl}"
             style="display:inline-block;background:#1a1a2e;color:#ffffff;font-size:16px;font-weight:600;
                    padding:14px 32px;border-radius:8px;text-decoration:none;">
            ${ctaLabel}
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;" />
        <p style="color:#ababab;font-size:12px;text-align:center;">
          PBL Flow — Plataforma de Aprendizagem Baseada em Problemas
        </p>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const origin = req.headers.get("origin") || "https://pbl-flow-nexus.lovable.app";

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, ticket_id } = body;

    if (!action || !ticket_id) {
      return new Response(JSON.stringify({ error: "action and ticket_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ticket, error: ticketError } = await adminClient
      .from("support_tickets")
      .select("id, ticket_number, subject, category, status, created_by, institution_id")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendEmail = async (to: string[], subject: string, html: string) => {
      if (!resendApiKey) {
        console.error("RESEND_API_KEY not configured — skipping email");
        return { warning: "RESEND_API_KEY não configurada." };
      }
      const resend = new Resend(resendApiKey);
      const { error: emailError } = await resend.emails.send({
        from: "PBL Flow <suporte@tbl.posologia.app>",
        to,
        subject,
        html,
      });
      if (emailError) {
        console.error("Resend email error:", emailError);
        return { warning: "Ação registrada, mas falha ao enviar email." };
      }
      return {};
    };

    // ACTION: new_ticket — customer opened a ticket, notify every superadmin
    if (action === "new_ticket") {
      if (ticket.created_by !== callerId) {
        return new Response(JSON.stringify({ error: "Only the ticket's author can trigger this notification" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: adminRoles } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminEmails: string[] = [];
      for (const row of adminRoles || []) {
        const { data: userData } = await adminClient.auth.admin.getUserById(row.user_id);
        if (userData?.user?.email) adminEmails.push(userData.user.email);
      }

      if (adminEmails.length === 0) {
        return new Response(JSON.stringify({ success: true, warning: "Nenhum superadmin encontrado para notificar." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let institutionName = "";
      if (ticket.institution_id) {
        const { data: inst } = await adminClient.from("institutions").select("name").eq("id", ticket.institution_id).maybeSingle();
        institutionName = inst?.name || "";
      }

      const { data: authorData } = await adminClient.auth.admin.getUserById(ticket.created_by);
      const authorEmail = authorData?.user?.email || "desconhecido";

      const html = emailShell(
        "Novo chamado de suporte",
        `
          <p style="color:#55575d;font-size:16px;line-height:1.6;margin:0 0 8px;">
            <strong>${ticket.ticket_number}</strong>: ${ticket.subject}
          </p>
          <p style="color:#55575d;font-size:14px;line-height:1.6;margin:0 0 4px;">
            Categoria: <strong>${CATEGORY_LABELS[ticket.category] || ticket.category}</strong>
          </p>
          <p style="color:#55575d;font-size:14px;line-height:1.6;margin:0 0 4px;">
            Aberto por: ${authorEmail}${institutionName ? ` (${institutionName})` : ""}
          </p>
        `,
        `${origin}/admin?tab=support&ticket=${ticket.id}`,
        "Ver chamado",
      );

      const result = await sendEmail(adminEmails, `Novo chamado ${ticket.ticket_number}: ${ticket.subject}`, html);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remaining actions are admin-only
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Superadmin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: customerData } = await adminClient.auth.admin.getUserById(ticket.created_by);
    const customerEmail = customerData?.user?.email;
    if (!customerEmail) {
      return new Response(JSON.stringify({ success: true, warning: "Cliente sem email cadastrado." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: admin_reply — admin answered, notify the customer
    if (action === "admin_reply") {
      const { message_id } = body;
      if (!message_id) {
        return new Response(JSON.stringify({ error: "message_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: message } = await adminClient
        .from("support_ticket_messages")
        .select("body")
        .eq("id", message_id)
        .single();

      const preview = (message?.body || "").slice(0, 300);

      const html = emailShell(
        "Nova resposta no seu chamado",
        `
          <p style="color:#55575d;font-size:16px;line-height:1.6;margin:0 0 16px;">
            Seu chamado <strong>${ticket.ticket_number}</strong> (${ticket.subject}) recebeu uma resposta:
          </p>
          <blockquote style="border-left:3px solid #1a1a2e;margin:0 0 16px;padding:8px 16px;color:#55575d;font-size:15px;">
            ${preview}${(message?.body || "").length > 300 ? "…" : ""}
          </blockquote>
        `,
        `${origin}/support?ticket=${ticket.id}`,
        "Ver resposta",
      );

      const result = await sendEmail([customerEmail], `Nova resposta no chamado ${ticket.ticket_number}`, html);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: status_change — admin updated status, notify the customer
    if (action === "status_change") {
      const { new_status } = body;
      if (!new_status) {
        return new Response(JSON.stringify({ error: "new_status is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const html = emailShell(
        "Status do seu chamado foi atualizado",
        `
          <p style="color:#55575d;font-size:16px;line-height:1.6;margin:0 0 8px;">
            Seu chamado <strong>${ticket.ticket_number}</strong> (${ticket.subject}) agora está:
          </p>
          <p style="color:#1a1a2e;font-size:18px;font-weight:600;margin:0 0 16px;">
            ${STATUS_LABELS[new_status] || new_status}
          </p>
        `,
        `${origin}/support?ticket=${ticket.id}`,
        "Ver chamado",
      );

      const result = await sendEmail([customerEmail], `Status do chamado ${ticket.ticket_number} atualizado`, html);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("support-ticket-notify error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
