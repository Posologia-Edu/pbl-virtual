import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error(`Auth error: ${claimsError?.message || "Invalid token"}`);
    
    const email = claimsData.claims.email as string;
    const userId = claimsData.claims.sub as string;
    if (!email) throw new Error("User not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      // No Stripe customer — check if user has a local subscription via institution
      const localSub = await getLocalSubscription(userId);
      return new Response(JSON.stringify({
        subscribed: localSub?.subscribed ?? false,
        product_id: localSub?.product_id ?? null,
        plan_name: localSub?.plan_name ?? null,
        subscription_end: localSub?.subscription_end ?? null,
        institution_id: localSub?.institution_id ?? null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let planName = null;
    let institutionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product;
    }

    // Fetch plan_name and institution_id from local subscriptions table
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: localSub } = await serviceClient
      .from("subscriptions")
      .select("plan_name, institution_id, max_ai_interactions, ai_scenario_generation, peer_evaluation_enabled, badges_enabled, full_reports_enabled, whitelabel_enabled")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();

    if (localSub) {
      planName = localSub.plan_name;
      institutionId = localSub.institution_id;
    }

    // If user is not owner but is a member of an institution, find it
    if (!institutionId) {
      const { data: inst } = await serviceClient
        .from("institutions")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();
      if (inst) institutionId = inst.id;
    }

    // Fetch AI interaction count for current month
    let aiInteractionsUsed = 0;
    if (institutionId) {
      const monthYear = new Date().toISOString().slice(0, 7); // "YYYY-MM"
      const { data: aiCount } = await serviceClient
        .from("ai_interaction_counts")
        .select("interaction_count")
        .eq("institution_id", institutionId)
        .eq("month_year", monthYear)
        .maybeSingle();
      aiInteractionsUsed = aiCount?.interaction_count ?? 0;
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      plan_name: planName,
      subscription_end: subscriptionEnd,
      institution_id: institutionId,
      max_ai_interactions: localSub?.max_ai_interactions ?? 50,
      ai_scenario_generation: localSub?.ai_scenario_generation ?? false,
      peer_evaluation_enabled: localSub?.peer_evaluation_enabled ?? false,
      badges_enabled: localSub?.badges_enabled ?? false,
      full_reports_enabled: localSub?.full_reports_enabled ?? false,
      whitelabel_enabled: localSub?.whitelabel_enabled ?? false,
      ai_interactions_used: aiInteractionsUsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper: check local subscription for users who may not have a Stripe customer
async function getLocalSubscription(userId: string) {
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Check if user owns a subscription
  const { data: sub } = await serviceClient
    .from("subscriptions")
    .select("plan_name, institution_id, status, current_period_end, stripe_product_id, max_ai_interactions, ai_scenario_generation, peer_evaluation_enabled, badges_enabled, full_reports_enabled, whitelabel_enabled")
    .eq("owner_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (sub) {
    // Fetch AI interaction count
    let aiInteractionsUsed = 0;
    const monthYear = new Date().toISOString().slice(0, 7);
    const { data: aiCount } = await serviceClient
      .from("ai_interaction_counts")
      .select("interaction_count")
      .eq("institution_id", sub.institution_id)
      .eq("month_year", monthYear)
      .maybeSingle();
    aiInteractionsUsed = aiCount?.interaction_count ?? 0;

    return {
      subscribed: true,
      product_id: sub.stripe_product_id,
      plan_name: sub.plan_name,
      subscription_end: sub.current_period_end,
      institution_id: sub.institution_id,
      max_ai_interactions: sub.max_ai_interactions ?? 50,
      ai_scenario_generation: sub.ai_scenario_generation ?? false,
      peer_evaluation_enabled: sub.peer_evaluation_enabled ?? false,
      badges_enabled: sub.badges_enabled ?? false,
      full_reports_enabled: sub.full_reports_enabled ?? false,
      whitelabel_enabled: sub.whitelabel_enabled ?? false,
      ai_interactions_used: aiInteractionsUsed,
    };
  }

  // Check if user's institution has active subscription
  const { data: inst } = await serviceClient
    .from("institutions")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (inst) {
    return {
      subscribed: false,
      product_id: null,
      plan_name: null,
      subscription_end: null,
      institution_id: inst.id,
    };
  }

  return null;
}
