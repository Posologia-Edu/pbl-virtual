import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Collect candidate customer IDs (email lookup + local DB)
    const candidateIds: string[] = [];

    const customers = await stripe.customers.list({ email: user.email, limit: 5 });
    for (const c of customers.data) {
      if (!candidateIds.includes(c.id)) candidateIds.push(c.id);
    }

    // Also check local subscriptions table for stripe_customer_id
    const { data: localSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (localSub?.stripe_customer_id && !candidateIds.includes(localSub.stripe_customer_id)) {
      candidateIds.push(localSub.stripe_customer_id);
    }

    logStep("Candidate customer IDs", { candidateIds });
    if (candidateIds.length === 0) throw new Error("No Stripe customer found");

    // Find active or trialing subscription across all candidate customers
    let foundSub: any = null;
    for (const cid of candidateIds) {
      const activeSubs = await stripe.subscriptions.list({ customer: cid, status: "active", limit: 1 });
      if (activeSubs.data.length > 0) { foundSub = activeSubs.data[0]; break; }
      const trialSubs = await stripe.subscriptions.list({ customer: cid, status: "trialing", limit: 1 });
      if (trialSubs.data.length > 0) { foundSub = trialSubs.data[0]; break; }
    }

    if (!foundSub) throw new Error("No active subscription found");

    const sub = foundSub;
    logStep("Found subscription", { subId: sub.id, status: sub.status });

    // Cancel at period end
    const updated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });
    logStep("Subscription set to cancel at period end", { cancel_at: updated.cancel_at });

    // Update local subscriptions table
    const cancelAt = updated.cancel_at
      ? new Date(updated.cancel_at * 1000).toISOString()
      : updated.current_period_end
        ? new Date(updated.current_period_end * 1000).toISOString()
        : null;

    const { error: dbError } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at: cancelAt,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", sub.id);

    if (dbError) {
      logStep("WARNING: Failed to update local DB", { error: dbError.message });
    } else {
      logStep("Local DB updated");
    }

    return new Response(
      JSON.stringify({ success: true, cancel_at: cancelAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
