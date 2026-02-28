import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map Stripe price IDs to plan names and limits
const PLAN_MAP: Record<string, { plan_name: string; max_students: number; max_rooms: number; max_ai_interactions: number; ai_enabled: boolean; ai_scenario_generation: boolean; peer_evaluation_enabled: boolean; badges_enabled: boolean; full_reports_enabled: boolean; whitelabel_enabled: boolean }> = {
  "price_1T3yHIHRnDD6dn6iLSvmwfFh": {
    plan_name: "starter", max_students: 30, max_rooms: 3, max_ai_interactions: 50,
    ai_enabled: true, ai_scenario_generation: false, peer_evaluation_enabled: false,
    badges_enabled: false, full_reports_enabled: false, whitelabel_enabled: false,
  },
  "price_1T3yHbHRnDD6dn6iklmghD9E": {
    plan_name: "professional", max_students: 150, max_rooms: 99999, max_ai_interactions: 500,
    ai_enabled: true, ai_scenario_generation: true, peer_evaluation_enabled: true,
    badges_enabled: true, full_reports_enabled: true, whitelabel_enabled: false,
  },
  "price_1T3yHuHRnDD6dn6iqPedb6Cp": {
    plan_name: "enterprise", max_students: 99999, max_rooms: 99999, max_ai_interactions: 99999,
    ai_enabled: true, ai_scenario_generation: true, peer_evaluation_enabled: true,
    badges_enabled: true, full_reports_enabled: true, whitelabel_enabled: true,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[CHECK-SUB] Function started");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    
    // Use getUser for reliable auth - getClaims may not be available
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error(`Auth error: ${userError?.message || "Invalid token"}`);
    
    const email = userData.user.email as string;
    const userId = userData.user.id;
    if (!email) throw new Error("User not authenticated");
    console.log("[CHECK-SUB] User authenticated:", userId, email);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    console.log("[CHECK-SUB] Listing Stripe customers for:", email);
    let customers = await stripe.customers.list({ email, limit: 1 });
    console.log("[CHECK-SUB] Stripe customers found by email:", customers.data.length);

    // If no customer found by email, try to find via local subscription record
    if (customers.data.length === 0) {
      // Check if there's a local subscription with a stripe_customer_id we can use
      const { data: localSubRecord } = await serviceClient
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("owner_id", userId)
        .not("stripe_customer_id", "is", null)
        .maybeSingle();
      
      if (localSubRecord?.stripe_customer_id && !localSubRecord.stripe_customer_id.startsWith("invited_")) {
        console.log("[CHECK-SUB] Found local stripe_customer_id:", localSubRecord.stripe_customer_id);
        try {
          const customer = await stripe.customers.retrieve(localSubRecord.stripe_customer_id);
          if (customer && !customer.deleted) {
            customers = { data: [customer] } as any;
          }
        } catch (e) {
          console.log("[CHECK-SUB] Failed to retrieve customer:", e);
        }
      }
    }

    // If still no customer, try searching Stripe checkout sessions for this email
    if (customers.data.length === 0) {
      console.log("[CHECK-SUB] Trying checkout sessions search...");
      try {
        const sessions = await stripe.checkout.sessions.list({ 
          customer_details: { email } as any,
          limit: 5 
        });
        // Find a session with a customer
        for (const session of sessions.data) {
          if (session.customer) {
            const custId = typeof session.customer === 'string' ? session.customer : session.customer.id;
            console.log("[CHECK-SUB] Found customer from checkout session:", custId);
            try {
              const customer = await stripe.customers.retrieve(custId);
              if (customer && !customer.deleted) {
                // Update the customer's email for future lookups
                await stripe.customers.update(custId, { email });
                customers = { data: [customer] } as any;
                break;
              }
            } catch (e) {
              console.log("[CHECK-SUB] Failed to retrieve session customer:", e);
            }
          }
        }
      } catch (e) {
        console.log("[CHECK-SUB] Checkout sessions search failed:", e);
      }
    }

    if (customers.data.length === 0) {
      // No Stripe customer — check if user has a local subscription via institution
      console.log("[CHECK-SUB] No Stripe customer found, checking local subscription");
      const localSub = await getLocalSubscription(userId, serviceClient);
      return new Response(JSON.stringify({
        subscribed: localSub?.subscribed ?? false,
        product_id: localSub?.product_id ?? null,
        plan_name: localSub?.plan_name ?? null,
        subscription_end: localSub?.subscription_end ?? null,
        institution_id: localSub?.institution_id ?? null,
        max_ai_interactions: localSub?.max_ai_interactions ?? 50,
        ai_scenario_generation: localSub?.ai_scenario_generation ?? false,
        peer_evaluation_enabled: localSub?.peer_evaluation_enabled ?? false,
        badges_enabled: localSub?.badges_enabled ?? false,
        full_reports_enabled: localSub?.full_reports_enabled ?? false,
        whitelabel_enabled: localSub?.whitelabel_enabled ?? false,
        ai_interactions_used: localSub?.ai_interactions_used ?? 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    console.log("[CHECK-SUB] Customer:", customerId);
    
    // Check active or trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });
    console.log("[CHECK-SUB] Subscriptions found:", subscriptions.data.length, "statuses:", subscriptions.data.map(s => s.status));
    
    // Filter to active or trialing
    const activeSub = subscriptions.data.find(s => s.status === "active" || s.status === "trialing");
    const hasActiveSub = !!activeSub;
    console.log("[CHECK-SUB] Has active/trialing sub:", hasActiveSub);
    
    let productId = null;
    let subscriptionEnd = null;
    let priceId = null;
    let stripeSubscriptionId = null;
    let currentPeriodStart = null;
    let cancelAt = null;

    if (hasActiveSub) {
      const subscription = activeSub!;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
      productId = subscription.items.data[0].price.product as string;
      priceId = subscription.items.data[0].price.id;
      stripeSubscriptionId = subscription.id;
      if (subscription.cancel_at) {
        cancelAt = new Date(subscription.cancel_at * 1000).toISOString();
      }
    }

    // Get or create institution
    let institutionId: string | null = null;
    const { data: inst } = await serviceClient
      .from("institutions")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    
    if (inst) {
      institutionId = inst.id;
    } else if (hasActiveSub) {
      // Auto-create institution for new subscriber
      const { data: newInst } = await serviceClient
        .from("institutions")
        .insert({ name: email.split("@")[0], owner_id: userId })
        .select("id")
        .single();
      if (newInst) institutionId = newInst.id;
    }

    // Sync local subscription record
    const planConfig = priceId ? PLAN_MAP[priceId] : null;
    
    const { data: localSub } = await serviceClient
      .from("subscriptions")
      .select("id, plan_name, institution_id, max_ai_interactions, ai_scenario_generation, peer_evaluation_enabled, badges_enabled, full_reports_enabled, whitelabel_enabled")
      .eq("owner_id", userId)
      .maybeSingle();

    let planName = localSub?.plan_name ?? planConfig?.plan_name ?? null;
    let subFeatures = {
      max_ai_interactions: localSub?.max_ai_interactions ?? planConfig?.max_ai_interactions ?? 50,
      ai_scenario_generation: localSub?.ai_scenario_generation ?? planConfig?.ai_scenario_generation ?? false,
      peer_evaluation_enabled: localSub?.peer_evaluation_enabled ?? planConfig?.peer_evaluation_enabled ?? false,
      badges_enabled: localSub?.badges_enabled ?? planConfig?.badges_enabled ?? false,
      full_reports_enabled: localSub?.full_reports_enabled ?? planConfig?.full_reports_enabled ?? false,
      whitelabel_enabled: localSub?.whitelabel_enabled ?? planConfig?.whitelabel_enabled ?? false,
    };

    if (hasActiveSub && institutionId) {
      const subRecord = {
        owner_id: userId,
        institution_id: institutionId,
        stripe_customer_id: customerId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_product_id: productId,
        stripe_price_id: priceId,
        status: activeSub!.status === "trialing" ? "trialing" : "active",
        plan_name: planConfig?.plan_name ?? planName,
        current_period_start: currentPeriodStart,
        current_period_end: subscriptionEnd,
        cancel_at: cancelAt,
        max_students: planConfig?.max_students ?? 30,
        max_rooms: planConfig?.max_rooms ?? 3,
        max_ai_interactions: planConfig?.max_ai_interactions ?? 50,
        ai_enabled: planConfig?.ai_enabled ?? true,
        ai_scenario_generation: planConfig?.ai_scenario_generation ?? false,
        peer_evaluation_enabled: planConfig?.peer_evaluation_enabled ?? false,
        badges_enabled: planConfig?.badges_enabled ?? false,
        full_reports_enabled: planConfig?.full_reports_enabled ?? false,
        whitelabel_enabled: planConfig?.whitelabel_enabled ?? false,
      };

      if (localSub) {
        // Update existing record
        const { error: updateErr } = await serviceClient
          .from("subscriptions")
          .update(subRecord)
          .eq("id", localSub.id);
        if (updateErr) console.error("[CHECK-SUB] Update error:", JSON.stringify(updateErr));
        planName = subRecord.plan_name;
        subFeatures = {
          max_ai_interactions: subRecord.max_ai_interactions,
          ai_scenario_generation: subRecord.ai_scenario_generation,
          peer_evaluation_enabled: subRecord.peer_evaluation_enabled,
          badges_enabled: subRecord.badges_enabled,
          full_reports_enabled: subRecord.full_reports_enabled,
          whitelabel_enabled: subRecord.whitelabel_enabled,
        };
      } else {
        // Create new record
        console.log("[CHECK-SUB] Inserting subscription for user:", userId, "institution:", institutionId);
        const { error: insertErr } = await serviceClient
          .from("subscriptions")
          .insert(subRecord);
        if (insertErr) console.error("[CHECK-SUB] Insert error:", JSON.stringify(insertErr));
        else console.log("[CHECK-SUB] Subscription inserted successfully");
        planName = subRecord.plan_name;
        subFeatures = {
          max_ai_interactions: subRecord.max_ai_interactions,
          ai_scenario_generation: subRecord.ai_scenario_generation,
          peer_evaluation_enabled: subRecord.peer_evaluation_enabled,
          badges_enabled: subRecord.badges_enabled,
          full_reports_enabled: subRecord.full_reports_enabled,
          whitelabel_enabled: subRecord.whitelabel_enabled,
        };
      }

      // Ensure user has institution_admin role
      const { data: roleExists } = await serviceClient
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "institution_admin")
        .maybeSingle();
      
      if (!roleExists) {
        await serviceClient
          .from("user_roles")
          .upsert({ user_id: userId, role: "institution_admin" }, { onConflict: "user_id,role" });
      }
    }

    // If not subscribed but local exists, sync cancel state
    if (!hasActiveSub && localSub) {
      await serviceClient
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("id", localSub.id);
    }

    // Fetch AI interaction count for current month
    let aiInteractionsUsed = 0;
    if (institutionId) {
      const monthYear = new Date().toISOString().slice(0, 7);
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
      ...subFeatures,
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
async function getLocalSubscription(userId: string, serviceClient: any) {
  const { data: sub } = await serviceClient
    .from("subscriptions")
    .select("plan_name, institution_id, status, current_period_end, stripe_product_id, max_ai_interactions, ai_scenario_generation, peer_evaluation_enabled, badges_enabled, full_reports_enabled, whitelabel_enabled")
    .eq("owner_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (sub) {
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
