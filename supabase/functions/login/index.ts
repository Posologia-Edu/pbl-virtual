import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { email, role } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "email and role required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format and length
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "Formato de email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["student", "professor"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Look up the user by email
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const targetUser = usersData?.users?.find((u) => u.email === email);

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "Credenciais inválidas ou usuário não cadastrado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user actually has the claimed role
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUser.id)
      .eq("role", role)
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Usuário não possui o papel solicitado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is effectively hidden
    const { data: hiddenCheck } = await adminClient.rpc("is_user_effectively_hidden", {
      _user_id: targetUser.id,
    });

    if (hiddenCheck === true) {
      return new Response(JSON.stringify({ error: "Sua conta está temporariamente desativada. Entre em contato com o administrador." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a unique ephemeral password for this login attempt only
    const ephemeralPassword = generateEphemeralPassword();

    // Set the user's password to the ephemeral value
    const { error: updateError } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      password: ephemeralPassword,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: "Erro interno do servidor." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sign in with the ephemeral password
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data, error: signInError } = await anonClient.auth.signInWithPassword({
      email,
      password: ephemeralPassword,
    });

    if (signInError || !data?.session) {
      return new Response(JSON.stringify({ error: "Credenciais inválidas ou usuário não cadastrado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: data.user,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
