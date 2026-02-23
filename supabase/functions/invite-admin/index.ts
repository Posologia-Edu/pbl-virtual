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

      // 1. Create auth user (or find existing)
      let userId: string;
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: email.split("@")[0] },
      });

      if (createError) {
        if (createError.message?.includes("already been registered")) {
          // User already exists in auth — look them up
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const existingUser = listData?.users?.find((u: any) => u.email === email);
          if (!existingUser) {
            return new Response(JSON.stringify({ error: "Usuário existe mas não foi possível localizá-lo." }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          userId = existingUser.id;
        } else {
          console.error("Create user error:", createError);
          return new Response(JSON.stringify({ error: `Falha ao criar usuário: ${createError.message}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        userId = newUser.user.id;
      }

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
          redirectTo: `https://pbl-flow-nexus.lovable.app/auth/reset-password`,
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
          redirectTo: `https://pbl-flow-nexus.lovable.app/auth/reset-password`,
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

    // ACTION: revoke_access
    if (action === "revoke_access") {
      const { institution_id } = body;
      if (!institution_id) {
        return new Response(JSON.stringify({ error: "institution_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Get subscription and institution info
      const { data: sub } = await adminClient
        .from("subscriptions")
        .select("*")
        .eq("institution_id", institution_id)
        .maybeSingle();

      const { data: institution } = await adminClient
        .from("institutions")
        .select("owner_id")
        .eq("id", institution_id)
        .single();

      if (!institution) {
        return new Response(JSON.stringify({ error: "Instituição não encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ownerId = institution.owner_id;

      // 2. Cancel Stripe subscription if exists
      if (sub?.stripe_subscription_id && !sub.stripe_subscription_id.startsWith("invited_")) {
        try {
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeKey) {
            const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
            const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
            await stripe.subscriptions.cancel(sub.stripe_subscription_id);
            console.log("Stripe subscription canceled:", sub.stripe_subscription_id);
          }
        } catch (stripeErr) {
          console.error("Stripe cancel error (continuing):", stripeErr);
        }
      }

      // 3. Get all courses for this institution
      const { data: courses } = await adminClient
        .from("courses")
        .select("id")
        .eq("institution_id", institution_id);
      const courseIds = (courses || []).map((c) => c.id);

      // 4. Get all modules for these courses
      let moduleIds: string[] = [];
      if (courseIds.length > 0) {
        const { data: modules } = await adminClient
          .from("modules")
          .select("id")
          .in("course_id", courseIds);
        moduleIds = (modules || []).map((m) => m.id);
      }

      // 5. Get all groups for this institution (by course or by professor)
      let groupIds: string[] = [];
      if (courseIds.length > 0) {
        const { data: groups } = await adminClient
          .from("groups")
          .select("id")
          .in("course_id", courseIds);
        groupIds = (groups || []).map((g) => g.id);
      }

      // 6. Get all rooms for these groups
      let roomIds: string[] = [];
      if (groupIds.length > 0) {
        const { data: rooms } = await adminClient
          .from("rooms")
          .select("id")
          .in("group_id", groupIds);
        roomIds = (rooms || []).map((r) => r.id);
      }

      // 7. Get all tutorial sessions for these rooms
      let sessionIds: string[] = [];
      if (roomIds.length > 0) {
        const { data: sessions } = await adminClient
          .from("tutorial_sessions")
          .select("id")
          .in("room_id", roomIds);
        sessionIds = (sessions || []).map((s) => s.id);
      }

      // 8. Delete all dependent data bottom-up
      if (sessionIds.length > 0) {
        await adminClient.from("objective_sessions").delete().in("session_id", sessionIds);
        await adminClient.from("session_minutes").delete().in("session_id", sessionIds);
      }
      if (roomIds.length > 0) {
        await adminClient.from("chat_messages").delete().in("room_id", roomIds);
        await adminClient.from("step_items").delete().in("room_id", roomIds);
        await adminClient.from("session_references").delete().in("room_id", roomIds);
        await adminClient.from("evaluations").delete().in("room_id", roomIds);
        await adminClient.from("peer_evaluations").delete().in("room_id", roomIds);
        await adminClient.from("evaluation_criteria").delete().in("room_id", roomIds);
        await adminClient.from("user_badges").delete().in("room_id", roomIds);
        await adminClient.from("room_scenarios").delete().in("room_id", roomIds);
        await adminClient.from("tutorial_sessions").delete().in("room_id", roomIds);
        await adminClient.from("rooms").delete().in("id", roomIds);
      }
      if (moduleIds.length > 0) {
        await adminClient.from("learning_objectives").delete().in("module_id", moduleIds);
        await adminClient.from("modules").delete().in("id", moduleIds);
      }
      if (groupIds.length > 0) {
        await adminClient.from("group_members").delete().in("group_id", groupIds);
        await adminClient.from("groups").delete().in("id", groupIds);
      }
      if (courseIds.length > 0) {
        await adminClient.from("course_members").delete().in("course_id", courseIds);
        await adminClient.from("scenarios").delete().in("course_id", courseIds);
        await adminClient.from("courses").delete().in("id", courseIds);
      }

      // 9. Delete subscription
      if (sub) {
        await adminClient.from("subscriptions").delete().eq("id", sub.id);
      }

      // 10. Delete admin invites
      await adminClient.from("admin_invites").delete().eq("institution_id", institution_id);

      // 11. Delete institution
      await adminClient.from("institutions").delete().eq("id", institution_id);

      // 12. Delete user role, profile, and auth user
      if (ownerId) {
        await adminClient.from("user_roles").delete().eq("user_id", ownerId);
        await adminClient.from("professor_notes").delete().eq("professor_id", ownerId);
        await adminClient.from("profiles").delete().eq("user_id", ownerId);
        await adminClient.auth.admin.deleteUser(ownerId);
        console.log("Deleted auth user:", ownerId);
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
