import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate JWT
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

    // Verify superadmin role
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .single();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Superadmin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ACTION: invite
    if (action === "invite") {
      const { email, institution_name } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already invited
      const { data: existingInvite } = await adminClient
        .from("admin_invites")
        .select("id, status")
        .eq("email", email)
        .maybeSingle();

      if (existingInvite) {
        return new Response(JSON.stringify({ error: "Este email já foi convidado." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate random password for initial user creation
      const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      const values = new Uint8Array(32);
      crypto.getRandomValues(values);
      const randomPassword = Array.from(values, (v) => charset[v % charset.length]).join("");

      // 1. Create auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: email.split("@")[0] },
      });

      if (createError) {
        console.error("Create user error:", createError);
        return new Response(JSON.stringify({ error: `Falha ao criar usuário: ${createError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = newUser.user.id;

      // 2. Assign institution_admin role
      await adminClient.from("user_roles").insert({ user_id: userId, role: "institution_admin" });

      // 3. Create institution
      const instName = institution_name || `Instituição de ${email.split("@")[0]}`;
      const { data: institution, error: instError } = await adminClient
        .from("institutions")
        .insert({ name: instName, owner_id: userId })
        .select("id")
        .single();

      if (instError) {
        console.error("Institution creation error:", instError);
        return new Response(JSON.stringify({ error: "Falha ao criar instituição." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 4. Create free subscription (generous limits, no Stripe)
      await adminClient.from("subscriptions").insert({
        institution_id: institution.id,
        owner_id: userId,
        stripe_customer_id: `invited_${userId}`,
        status: "active",
        plan_name: "Convidado (Cortesia)",
        max_students: 999,
        max_rooms: 999,
        ai_enabled: true,
        whitelabel_enabled: true,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // 5. Record invite
      await adminClient.from("admin_invites").insert({
        email,
        invited_by: callerId,
        institution_id: institution.id,
        user_id: userId,
        status: "pending",
      });

      // 6. Generate password reset link
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/auth/v1/verify?redirect_to=https://pbl-flow-nexus.lovable.app/reset-password`,
        },
      });

      // Build the verification URL
      let resetUrl = "";
      if (linkData?.properties?.action_link) {
        resetUrl = linkData.properties.action_link;
      }

      // 7. Send email via Resend
      const resend = new Resend(resendApiKey);
      const { error: emailError } = await resend.emails.send({
        from: "PBL Flow <convite@tbl.posologia.app>",
        to: [email],
        subject: "Convite para o PBL Flow — Crie sua senha",
        html: `
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
                Você foi convidado! 🎉
              </h1>
              <p style="color:#55575d;font-size:16px;line-height:1.6;margin:0 0 8px;">
                Você recebeu acesso completo à plataforma <strong>PBL Flow</strong> como administrador de instituição.
              </p>
              <p style="color:#55575d;font-size:16px;line-height:1.6;margin:0 0 24px;">
                Para começar, clique no botão abaixo para criar sua senha de acesso:
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}" 
                   style="display:inline-block;background:#1a1a2e;color:#ffffff;font-size:16px;font-weight:600;
                          padding:14px 32px;border-radius:8px;text-decoration:none;">
                  Criar minha senha
                </a>
              </div>
              <p style="color:#ababab;font-size:14px;line-height:1.5;margin:24px 0 0;">
                Se você não esperava este convite, pode ignorar este email com segurança.
              </p>
              <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;" />
              <p style="color:#ababab;font-size:12px;text-align:center;">
                PBL Flow — Plataforma de Aprendizagem Baseada em Problemas
              </p>
            </div>
          </body>
          </html>
        `,
      });

      if (emailError) {
        console.error("Resend email error:", emailError);
        // Invite was created, but email failed — log and continue
        return new Response(
          JSON.stringify({ success: true, warning: "Convite criado, mas falha ao enviar email. Verifique o domínio no Resend." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: list
    if (action === "list") {
      const { data: invites, error } = await adminClient
        .from("admin_invites")
        .select("*, institutions(name)")
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check activation status for each invite
      for (const invite of invites || []) {
        if (invite.status === "pending" && invite.user_id) {
          const { data: userData } = await adminClient.auth.admin.getUserById(invite.user_id);
          if (userData?.user?.last_sign_in_at) {
            // User has signed in — mark as active
            await adminClient
              .from("admin_invites")
              .update({ status: "active", activated_at: userData.user.last_sign_in_at })
              .eq("id", invite.id);
            invite.status = "active";
            invite.activated_at = userData.user.last_sign_in_at;
          }
        }
      }

      return new Response(
        JSON.stringify({ invites }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: resend_invite
    if (action === "resend_invite") {
      const { invite_id } = body;
      if (!invite_id) {
        return new Response(JSON.stringify({ error: "invite_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: invite } = await adminClient
        .from("admin_invites")
        .select("*")
        .eq("id", invite_id)
        .single();

      if (!invite) {
        return new Response(JSON.stringify({ error: "Convite não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate new recovery link
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: invite.email,
        options: {
          redirectTo: `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/auth/v1/verify?redirect_to=https://pbl-flow-nexus.lovable.app/reset-password`,
        },
      });

      let resetUrl = linkData?.properties?.action_link || "";

      const resend = new Resend(resendApiKey);
      const { error: emailError } = await resend.emails.send({
        from: "PBL Flow <convite@tbl.posologia.app>",
        to: [invite.email],
        subject: "Lembrete: Crie sua senha no PBL Flow",
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
              <h1 style="color:#1a1a2e;font-size:24px;font-weight:bold;text-align:center;">Lembrete de Convite</h1>
              <p style="color:#55575d;font-size:16px;line-height:1.6;">
                Você ainda não criou sua senha na plataforma PBL Flow. Clique abaixo para configurar seu acesso:
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}" 
                   style="display:inline-block;background:#1a1a2e;color:#ffffff;font-size:16px;font-weight:600;
                          padding:14px 32px;border-radius:8px;text-decoration:none;">
                  Criar minha senha
                </a>
              </div>
              <p style="color:#ababab;font-size:12px;text-align:center;">PBL Flow — Plataforma de Aprendizagem Baseada em Problemas</p>
            </div>
          </body>
          </html>
        `,
      });

      if (emailError) {
        console.error("Resend error:", emailError);
        return new Response(JSON.stringify({ error: "Falha ao reenviar email." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("invite-admin error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
