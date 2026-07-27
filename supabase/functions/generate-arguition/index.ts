import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveInstitutionIdFromRoom, checkAiQuota, incrementAiQuota, aiQuotaExceededResponse } from "../_shared/planLimits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVIDER_ENDPOINTS: Record<string, { url: string; defaultModel: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", defaultModel: "llama-3.3-70b-versatile" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", defaultModel: "google/gemini-2.5-flash" },
  google: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", defaultModel: "gemini-2.5-flash" },
};

async function callAIWithFallback(
  adminClient: any,
  lovableKey: string | undefined,
  messages: any[],
): Promise<{ content: string; provider: string; model: string; usage: any }> {
  const { data: keys } = await adminClient.from("ai_provider_keys").select("provider, api_key, is_active").eq("is_active", true).order("updated_at", { ascending: false });
  for (const pk of keys || []) {
    const cfg = PROVIDER_ENDPOINTS[pk.provider];
    if (!cfg || !pk.api_key) continue;
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${pk.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: cfg.defaultModel, messages }),
      });
      if (!res.ok) { console.error(`[AI] ${pk.provider} ${res.status}`); continue; }
      const d = await res.json();
      const content = d.choices?.[0]?.message?.content;
      if (content) return { content, provider: pk.provider, model: cfg.defaultModel, usage: d.usage || {} };
    } catch (e) { console.error(`[AI] ${pk.provider} error:`, e); }
  }

  if (!lovableKey) throw { status: 500, message: "AI key missing" };
  const model = "google/gemini-3-flash-preview";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw { status: res.status, message: "AI failed", detail: t };
  }
  const d = await res.json();
  return { content: d.choices?.[0]?.message?.content || "{}", provider: "lovable", model, usage: d.usage || {} };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { sessionId, roomId, presentationId } = await req.json();
    if (!sessionId || !roomId || !presentationId) {
      return new Response(JSON.stringify({ error: "missing params" }), { status: 400, headers: corsHeaders });
    }

    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the caller is the professor of the room (or admin)
    const { data: room } = await admin.from("rooms").select("professor_id").eq("id", roomId).single();
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!room || (room.professor_id !== user.id && !roleRow)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    const institutionId = await resolveInstitutionIdFromRoom(admin, roomId);
    const quota = await checkAiQuota(admin, institutionId);
    if (!quota.allowed) return aiQuotaExceededResponse(quota, corsHeaders);

    // Gather P5 objectives + presentation file URL
    const [objsRes, presRes] = await Promise.all([
      admin.from("step_items").select("content").eq("session_id", sessionId).eq("step", 5),
      admin.from("session_presentations").select("file_url, file_name, mime_type").eq("id", presentationId).single(),
    ]);
    const objectives = (objsRes.data || []).map((o: any) => o.content).filter(Boolean);
    const presentation = presRes.data;
    if (!presentation) {
      return new Response(JSON.stringify({ error: "presentation not found" }), { status: 404, headers: corsHeaders });
    }

    if (objectives.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum objetivo P5 disponível para análise" }), { status: 400, headers: corsHeaders });
    }

    const prompt = `Você é um tutor PBL avaliando uma apresentação de fechamento (P7).

OBJETIVOS DE APRENDIZAGEM definidos pelo grupo no P5:
${objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}

ARQUIVO DE APRESENTAÇÃO ENVIADO PELO GRUPO:
Nome: ${presentation.file_name}
Tipo: ${presentation.mime_type}
URL: ${presentation.file_url}

Como você não pode abrir o arquivo, baseie sua análise APENAS nos objetivos listados.
Sua tarefa: gerar um "Card de Arguição" para o tutor com:
1. Um resumo curto (1-2 frases) sobre que objetivos provavelmente exigem maior arguição.
2. Exatamente 3 perguntas de aprofundamento que o tutor pode fazer, cada uma alinhada a um objetivo específico, no estilo: "Sobre o objetivo X, peça que aprofundem em Y…".

Responda APENAS em JSON estrito:
{"coverage_summary":"…","questions":["…","…","…"]}`;

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    let aiResult;
    try {
      aiResult = await callAIWithFallback(admin, lovableKey, [
        { role: "system", content: "Você é um tutor PBL. Responda apenas JSON válido." },
        { role: "user", content: prompt },
      ]);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e?.message || "AI failed", detail: e?.detail }), { status: e?.status || 500, headers: corsHeaders });
    }

    const cleaned = aiResult.content.replace(/```json\s*|\s*```/g, "").trim();
    let parsed: { coverage_summary?: string; questions?: string[] } = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = { coverage_summary: cleaned, questions: [] }; }

    const { error: insErr } = await admin.from("arguition_cards").insert({
      session_id: sessionId,
      room_id: roomId,
      presentation_id: presentationId,
      coverage_summary: parsed.coverage_summary || "",
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      generated_by: user.id,
    });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });
    }
    await incrementAiQuota(admin, institutionId);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
