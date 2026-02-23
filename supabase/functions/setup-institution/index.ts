import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIERS: Record<string, { plan_name: string; max_students: number; max_rooms: number; ai_enabled: boolean; whitelabel_enabled: boolean }> = {
  "prod_U22MNDlQOLbcmr": { plan_name: "starter", max_students: 30, max_rooms: 3, ai_enabled: false, whitelabel_enabled: false },
  "prod_U22Mmhx6hjqTAQ": { plan_name: "professional", max_students: 150, max_rooms: 999, ai_enabled: true, whitelabel_enabled: false },
  "prod_U22M2hz40qmRsN": { plan_name: "enterprise", max_students: 99999, max_rooms: 99999, ai_enabled: true, whitelabel_enabled: true },
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SETUP-INSTITUTION] ${step}${d}`);
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
    const body = await req.json();
    const { action } = body;

    // Action 1: Get email from Stripe session (no auth needed)
    if (action === "get-session-email") {
      const { sessionId } = body;
      if (!sessionId) throw new Error("sessionId is required");

      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      return new Response(JSON.stringify({ email: session.customer_email || session.customer_details?.email || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Action 2: Setup institution (requires auth)
    if (action === "setup") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("No authorization header");

      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError) throw new Error(`Auth error: ${userError.message}`);
      const user = userData.user;
      if (!user) throw new Error("User not authenticated");

      const { institutionName, stripeSessionId } = body;
      if (!institutionName || typeof institutionName !== "string" || institutionName.trim().length === 0) {
        throw new Error("institutionName is required");
      }
      if (institutionName.trim().length > 200) {
        throw new Error("Institution name too long");
      }

      logStep("Setting up institution", { userId: user.id, name: institutionName });

      // Check if user already has an institution
      const { data: existing } = await supabaseAdmin
        .from("institutions")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (existing) {
        logStep("User already has an institution", { id: existing.id });
        return new Response(JSON.stringify({ success: true, institutionId: existing.id, message: "Institution already exists" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // 1. Create institution
      const { data: institution, error: instError } = await supabaseAdmin
        .from("institutions")
        .insert({ name: institutionName.trim(), owner_id: user.id })
        .select("id")
        .single();

      if (instError) throw new Error(`Failed to create institution: ${instError.message}`);
      logStep("Institution created", { id: institution.id });

      // 2. Assign institution_admin role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: user.id, role: "institution_admin" });

      if (roleError && !roleError.message.includes("duplicate")) {
        throw new Error(`Failed to assign role: ${roleError.message}`);
      }
      logStep("Role assigned: institution_admin");

      // 3. If we have a Stripe session, sync subscription
      if (stripeSessionId) {
        try {
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeKey) {
            const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
            const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
              expand: ["subscription", "subscription.items.data.price"],
            });

            const subscription = session.subscription as Stripe.Subscription;
            if (subscription) {
              const item = subscription.items.data[0];
              const productId = item.price.product as string;
              const tier = TIERS[productId];

              await supabaseAdmin.from("subscriptions").insert({
                institution_id: institution.id,
                owner_id: user.id,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscription.id,
                stripe_product_id: productId,
                stripe_price_id: item.price.id,
                status: subscription.status,
                plan_name: tier?.plan_name ?? "unknown",
                max_students: tier?.max_students ?? 30,
                max_rooms: tier?.max_rooms ?? 3,
                ai_enabled: tier?.ai_enabled ?? false,
                whitelabel_enabled: tier?.whitelabel_enabled ?? false,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              });
              logStep("Subscription synced", { subId: subscription.id, plan: tier?.plan_name });
            }
          }
        } catch (stripeErr) {
          logStep("Warning: Could not sync Stripe subscription", { error: String(stripeErr) });
          // Don't fail the whole setup if Stripe sync fails
        }
      }

      return new Response(JSON.stringify({ success: true, institutionId: institution.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
