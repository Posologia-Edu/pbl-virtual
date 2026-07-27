// Maps Stripe price IDs to plan names and feature limits.
// Shared between check-subscription and stripe-webhook so both stay in sync.
export interface PlanConfig {
  plan_name: string;
  max_students: number;
  max_rooms: number;
  max_ai_interactions: number;
  ai_enabled: boolean;
  ai_scenario_generation: boolean;
  peer_evaluation_enabled: boolean;
  badges_enabled: boolean;
  full_reports_enabled: boolean;
  whitelabel_enabled: boolean;
}

export const PLAN_MAP: Record<string, PlanConfig> = {
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
