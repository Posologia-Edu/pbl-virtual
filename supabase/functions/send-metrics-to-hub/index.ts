import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-METRICS] ${step}${d}`);
};

serve(async (_req) => {
  try {
    log("Starting metrics collection");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const hubServiceKey = Deno.env.get("HUB_SERVICE_KEY");
    const hubServiceId = Deno.env.get("HUB_SERVICE_ID");
    if (!hubServiceKey || !hubServiceId) throw new Error("HUB_SERVICE_KEY or HUB_SERVICE_ID not set");

    // Total users
    const { count: totalUsers, error: e1 } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if (e1) throw e1;
    log("Total users", { totalUsers });

    // Active users (last 30 days) – users who sent a chat message recently
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeData, error: e2 } = await supabase
      .from("chat_messages")
      .select("user_id")
      .gte("created_at", thirtyDaysAgo);
    if (e2) throw e2;
    const activeUsers = new Set(activeData?.map((r: { user_id: string }) => r.user_id)).size;
    log("Active users (30d)", { activeUsers });

    // Paid subscribers
    const { count: subscribers, error: e3 } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    if (e3) throw e3;
    log("Subscribers", { subscribers });

    const payload = {
      service_id: hubServiceId,
      total_users: totalUsers ?? 0,
      active_users: activeUsers,
      subscribers: subscribers ?? 0,
      ai_requests: 0,
      ai_tokens_used: 0,
      ai_cost_usd: 0,
      revenue_usd: 0,
      mrr_usd: 0,
    };
    log("Payload", payload);

    const res = await fetch(
      "https://slmnpcabhjsqithkmkxn.supabase.co/functions/v1/report-metrics",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-key": hubServiceKey,
        },
        body: JSON.stringify(payload),
      }
    );

    const body = await res.text();
    if (!res.ok) {
      log("Hub responded with error", { status: res.status, body });
      return new Response(JSON.stringify({ error: body }), { status: 502 });
    }

    log("Metrics sent successfully", { status: res.status, body });
    return new Response(JSON.stringify({ success: true, hub_response: body }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
