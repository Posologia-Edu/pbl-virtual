import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "visitor_session";
const ANALYTICS_KEY = "visitor_analytics_data";

interface AnalyticsData {
  session_fingerprint: string;
  pages_visited: { page: string; timestamp: string }[];
  cta_clicks: { cta: string; page: string; timestamp: string }[];
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  preferred_language: string | null;
  plan_interest: string | null;
}

function getSessionFingerprint(): string {
  let fp = sessionStorage.getItem(SESSION_KEY);
  if (!fp) {
    fp = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, fp);
  }
  return fp;
}

function getData(): AnalyticsData {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    session_fingerprint: getSessionFingerprint(),
    pages_visited: [],
    cta_clicks: [],
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    preferred_language: null,
    plan_interest: null,
  };
}

function saveData(data: AnalyticsData) {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
}

function hasAnalyticalConsent(): boolean {
  try {
    const prefs = JSON.parse(localStorage.getItem("cookie_consent") || "null");
    return prefs?.analytical === true;
  } catch {
    return false;
  }
}

export function trackPageView(page: string) {
  if (!hasAnalyticalConsent()) return;
  const data = getData();
  data.pages_visited.push({ page, timestamp: new Date().toISOString() });
  saveData(data);
}

export function trackCTAClick(cta: string, page: string) {
  if (!hasAnalyticalConsent()) return;
  const data = getData();
  data.cta_clicks.push({ cta, page, timestamp: new Date().toISOString() });
  saveData(data);
}

export function trackPlanView(planName: string) {
  if (!hasAnalyticalConsent()) return;
  const data = getData();
  data.plan_interest = planName;
  saveData(data);
}

export function captureUTMParams(searchParams: URLSearchParams) {
  if (!hasAnalyticalConsent()) return;
  const data = getData();
  const source = searchParams.get("utm_source");
  const medium = searchParams.get("utm_medium");
  const campaign = searchParams.get("utm_campaign");
  if (source) data.utm_source = source;
  if (medium) data.utm_medium = medium;
  if (campaign) data.utm_campaign = campaign;
  saveData(data);
}

export function trackLanguage(lang: string) {
  try {
    const prefs = JSON.parse(localStorage.getItem("cookie_consent") || "null");
    if (!prefs?.functional) return;
  } catch {
    return;
  }
  const data = getData();
  data.preferred_language = lang;
  saveData(data);
}

export async function flushAnalyticsToSupabase(userId?: string) {
  if (!hasAnalyticalConsent()) return;
  const data = getData();
  if (data.pages_visited.length === 0 && data.cta_clicks.length === 0) return;

  try {
    await supabase.from("visitor_analytics" as any).insert({
      user_id: userId || null,
      session_fingerprint: data.session_fingerprint,
      pages_visited: data.pages_visited,
      cta_clicks: data.cta_clicks,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
      preferred_language: data.preferred_language,
      plan_interest: data.plan_interest,
    });
    localStorage.removeItem(ANALYTICS_KEY);
  } catch (err) {
    console.error("Failed to flush analytics:", err);
  }
}
