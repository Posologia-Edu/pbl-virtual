import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Generate a cryptographically random 6-digit code. */
function generateCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a cryptographically random password for ephemeral login. */
function generateEphemeralPassword(length = 32): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => charset[v % charset.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, email, role } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email) || email.length > 254) {
      return json({ error: "Formato de email inválido" }, 400);
    }
    if (!["student", "professor"].includes(role)) {
      return json({ error: "Invalid role" }, 400);
    }
    const normalizedEmail = email.trim().toLowerCase();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Shared lookup: resolve the target user and verify they hold the claimed role and are not hidden.
    async function resolveEligibleUser(): Promise<{ id: string } | Response> {
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      const targetUser = usersData?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
      if (!targetUser) {
        return json({ error: "Credenciais inválidas ou usuário não cadastrado." }, 401);
      }

      const { data: roleCheck } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUser.id)
        .eq("role", role)
        .maybeSingle();
      if (!roleCheck) {
        return json({ error: "Usuário não possui o papel solicitado." }, 403);
      }

      const { data: hiddenCheck } = await adminClient.rpc("is_user_effectively_hidden", {
        _user_id: targetUser.id,
      });
      if (hiddenCheck === true) {
        return json({ error: "Sua conta está temporariamente desativada. Entre em contato com o administrador." }, 403);
      }

      return { id: targetUser.id };
    }

    // ACTION: request_code — verifies the account is eligible, then emails a one-time code.
    if (action === "request_code") {
      const eligible = await resolveEligibleUser();
      if (eligible instanceof Response) return eligible;

      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        return json({ error: "RESEND_API_KEY not configured" }, 500);
      }

      // Basic anti-spam: don't allow a new code more than once every 30s per email+role.
      const { data: lastCode } = await adminClient
        .from("login_otp_codes")
        .select("created_at")
        .eq("email", normalizedEmail)
        .eq("role", role)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastCode && Date.now() - new Date(lastCode.created_at).getTime() < RESEND_COOLDOWN_MS) {
        return json({ error: "Aguarde alguns segundos antes de solicitar um novo código." }, 429);
      }

      // Invalidate any previously pending codes for this email+role.
      await adminClient.from("login_otp_codes").delete().eq("email", normalizedEmail).eq("role", role).is("consumed_at", null);

      const code = generateCode();
      const codeHash = await sha256Hex(code);
      const { error: insertError } = await adminClient.from("login_otp_codes").insert({
        user_id: eligible.id,
        email: normalizedEmail,
        role,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      });
      if (insertError) {
        console.error("login_otp_codes insert error:", insertError);
        return json({ error: "Erro interno do servidor." }, 500);
      }

      const resend = new Resend(resendApiKey);
      const { error: emailError } = await resend.emails.send({
        from: "PBL Flow <convite@tbl.posologia.app>",
        to: [normalizedEmail],
        subject: "Seu código de acesso — PBL Flow",
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <div style="max-width:480px;margin:0 auto;padding:40px 24px;text-align:center;">
              <h1 style="color:#1a1a2e;font-size:20px;font-weight:bold;margin:0 0 16px;">Seu código de acesso</h1>
              <p style="color:#55575d;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Use o código abaixo para entrar no PBL Flow. Ele expira em 10 minutos.
              </p>
              <div style="display:inline-block;background:#f4f4f7;border-radius:12px;padding:16px 32px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a1a2e;">
                ${code}
              </div>
              <p style="color:#ababab;font-size:12px;line-height:1.5;margin:24px 0 0;">
                Se você não solicitou este código, pode ignorar este email com segurança.
              </p>
            </div>
          </body>
          </html>
        `,
      });
      if (emailError) {
        console.error("Resend email error:", emailError);
        return json({ error: "Falha ao enviar o código por email." }, 500);
      }

      return json({ success: true });
    }

    // ACTION: verify_code — checks the code and, if valid, mints a real session.
    if (action === "verify_code") {
      const { code } = body;
      if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
        return json({ error: "Código inválido." }, 400);
      }

      const { data: otpRow } = await adminClient
        .from("login_otp_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("role", role)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRow) {
        return json({ error: "Código inválido ou expirado." }, 401);
      }
      if (new Date(otpRow.expires_at).getTime() < Date.now()) {
        await adminClient.from("login_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);
        return json({ error: "Código expirado. Solicite um novo." }, 401);
      }
      if (otpRow.attempts >= MAX_ATTEMPTS) {
        await adminClient.from("login_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);
        return json({ error: "Muitas tentativas inválidas. Solicite um novo código." }, 429);
      }

      const providedHash = await sha256Hex(code);
      if (providedHash !== otpRow.code_hash) {
        await adminClient.from("login_otp_codes").update({ attempts: otpRow.attempts + 1 }).eq("id", otpRow.id);
        return json({ error: "Código inválido." }, 401);
      }

      // Re-check eligibility in case the account changed since the code was requested.
      const eligible = await resolveEligibleUser();
      if (eligible instanceof Response) {
        await adminClient.from("login_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);
        return eligible;
      }

      await adminClient.from("login_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);

      // Mint a real session for the now-verified user via a one-shot ephemeral password.
      const ephemeralPassword = generateEphemeralPassword();
      const { error: updateError } = await adminClient.auth.admin.updateUserById(eligible.id, {
        password: ephemeralPassword,
      });
      if (updateError) {
        return json({ error: "Erro interno do servidor." }, 500);
      }

      const anonClient = createClient(supabaseUrl, anonKey);
      const { data, error: signInError } = await anonClient.auth.signInWithPassword({
        email: normalizedEmail,
        password: ephemeralPassword,
      });
      if (signInError || !data?.session) {
        return json({ error: "Credenciais inválidas ou usuário não cadastrado." }, 401);
      }

      return json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        user: data.user,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("login error:", err);
    return json({ error: "Erro interno do servidor." }, 500);
  }
});
