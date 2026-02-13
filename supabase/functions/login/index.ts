import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PASSWORDS: Record<string, string> = {
  student: "medpbl-student-2026",
  professor: "medpbl-professor-2026",
};

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

    if (!["student", "professor"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const password = DEFAULT_PASSWORDS[role];

    // Sign in using the anon client to generate a session
    const anonClient = createClient(supabaseUrl, anonKey);
    let { data, error } = await anonClient.auth.signInWithPassword({ email, password });

    // If login fails, the user's password may have drifted (e.g. after a reset).
    // Reset it to the default via admin API and retry once.
    if (error) {
      const adminResetClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: usersData } = await adminResetClient.auth.admin.listUsers();
      const targetUser = usersData?.users?.find((u) => u.email === email);

      if (!targetUser) {
        return new Response(JSON.stringify({ error: "Credenciais inválidas ou usuário não cadastrado." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reset password to default and retry
      await adminResetClient.auth.admin.updateUserById(targetUser.id, { password });
      const retry = await anonClient.auth.signInWithPassword({ email, password });
      if (retry.error) {
        return new Response(JSON.stringify({ error: "Credenciais inválidas ou usuário não cadastrado." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      data = retry.data;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify the user actually has the claimed role
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", role)
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Usuário não possui o papel solicitado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is effectively hidden (directly or via hierarchy)
    const { data: hiddenCheck } = await adminClient.rpc("is_user_effectively_hidden", {
      _user_id: data.user.id,
    });

    if (hiddenCheck === true) {
      // Sign out the session we just created
      await anonClient.auth.signOut();
      return new Response(JSON.stringify({ error: "Sua conta está temporariamente desativada. Entre em contato com o administrador." }), {
        status: 403,
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
