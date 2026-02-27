import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? serviceRoleKey;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Only superadmin (role='admin') can manage AI keys
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Superadmin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, provider, api_key, key_id } = await req.json();

    if (action === "list") {
      const { data, error } = await adminClient
        .from("ai_provider_keys")
        .select("id, provider, api_key, is_active, updated_at")
        .is("institution_id", null)
        .order("provider");

      if (error) throw error;

      // Mask API keys - show only first 4 and last 4 chars
      const masked = (data || []).map((k: any) => ({
        ...k,
        api_key_masked: k.api_key
          ? k.api_key.length > 8
            ? `${k.api_key.slice(0, 4)}${"•".repeat(Math.min(k.api_key.length - 8, 8))}${k.api_key.slice(-4)}`
            : "••••••••"
          : "",
        has_key: !!k.api_key && k.api_key.length > 0,
      }));

      // Remove raw api_key from response
      for (const m of masked) {
        delete m.api_key;
      }

      return new Response(JSON.stringify({ keys: masked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upsert") {
      if (!provider) {
        return new Response(
          JSON.stringify({ error: "provider required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if global key already exists for this provider
      const { data: existing } = await adminClient
        .from("ai_provider_keys")
        .select("id")
        .is("institution_id", null)
        .eq("provider", provider)
        .maybeSingle();

      let result;
      if (existing) {
        result = await adminClient
          .from("ai_provider_keys")
          .update({ api_key: api_key || "", is_active: !!api_key })
          .eq("id", existing.id)
          .select("id, provider, is_active")
          .single();
      } else {
        result = await adminClient
          .from("ai_provider_keys")
          .insert({ institution_id: null, provider, api_key: api_key || "", is_active: !!api_key })
          .select("id, provider, is_active")
          .single();
      }

      if (result.error) throw result.error;

      return new Response(JSON.stringify({ success: true, key: result.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!key_id) {
        return new Response(
          JSON.stringify({ error: "key_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await adminClient
        .from("ai_provider_keys")
        .delete()
        .eq("id", key_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-ai-keys error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
