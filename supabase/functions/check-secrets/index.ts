import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secretsToCheck = [
      { key: "LOVABLE_API_KEY", label: "Lovable AI (OpenAI/Gemini)", category: "ai" },
      { key: "STRIPE_SECRET_KEY", label: "Stripe (Pagamentos)", category: "payments" },
      { key: "RESEND_API_KEY", label: "Resend (E-mails)", category: "email" },
      { key: "HUB_SERVICE_KEY", label: "Hub de Métricas", category: "metrics" },
    ];

    const results = secretsToCheck.map((s) => ({
      key: s.key,
      label: s.label,
      category: s.category,
      configured: !!Deno.env.get(s.key),
    }));

    return new Response(JSON.stringify({ secrets: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
