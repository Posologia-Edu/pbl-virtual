import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PLAN_MAP } from "../_shared/planMap.ts";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    // Deno has no Node crypto module, so signature verification must go
    // through Stripe's Web Crypto (SubtleCrypto) provider instead of the
    // default Node one used by constructEvent.
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("Signature verification failed", { error: msg });
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(stripe, serviceClient, sub.id);
        break;
      }
      case "invoice.payment_failed": {
        // Invoice payload shape for the subscription reference has moved
        // across Stripe API versions, so check both the legacy and current
        // locations rather than assuming one.
        const invoice = event.data.object as any;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? invoice.parent?.subscription_details?.subscription ?? null;
        if (subscriptionId) {
          await syncSubscription(stripe, serviceClient, subscriptionId);
        } else {
          logStep("invoice.payment_failed without a subscription id", { invoiceId: invoice.id });
        }
        break;
      }
      default:
        logStep("Ignored event type", { type: event.type });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("Handler error", { error: msg });
    // Still ack with 200 below so Stripe doesn't retry forever on a local
    // bug; the failure is logged for investigation instead.
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

// Mirrors the subscription's current Stripe status onto the local
// `subscriptions` row (active, trialing, past_due, canceled, unpaid, ...).
// planLimits.ts only grants paid features for status in (active, trialing),
// so this is what actually revokes access when a payment fails or a
// subscription ends outside of the app's own cancel-subscription flow.
async function syncSubscription(stripe: Stripe, serviceClient: any, subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const productId = (sub.items.data[0]?.price?.product as string) ?? null;
  const planConfig = priceId ? PLAN_MAP[priceId] : null;

  const { data: localSub } = await serviceClient
    .from("subscriptions")
    .select("id")
    .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`)
    .maybeSingle();

  if (!localSub) {
    logStep("No local subscription row matched; skipping", { subscriptionId, customerId });
    return;
  }

  const update: Record<string, unknown> = {
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    status: sub.status,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  if (priceId) update.stripe_price_id = priceId;
  if (productId) update.stripe_product_id = productId;
  if (planConfig) {
    update.plan_name = planConfig.plan_name;
    update.max_students = planConfig.max_students;
    update.max_rooms = planConfig.max_rooms;
    update.max_ai_interactions = planConfig.max_ai_interactions;
    update.ai_enabled = planConfig.ai_enabled;
    update.ai_scenario_generation = planConfig.ai_scenario_generation;
    update.peer_evaluation_enabled = planConfig.peer_evaluation_enabled;
    update.badges_enabled = planConfig.badges_enabled;
    update.full_reports_enabled = planConfig.full_reports_enabled;
    update.whitelabel_enabled = planConfig.whitelabel_enabled;
  }

  const { error } = await serviceClient.from("subscriptions").update(update).eq("id", localSub.id);
  if (error) {
    logStep("Failed to update local subscription", { error: error.message });
  } else {
    logStep("Local subscription synced", { id: localSub.id, status: sub.status });
  }
}
