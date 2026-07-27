import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3-flash-preview";

const PROVIDER_ENDPOINTS: Record<string, { url: string; format: string; defaultModel: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", format: "openai", defaultModel: "gpt-4o-mini" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", format: "openai", defaultModel: "llama-3.3-70b-versatile" },
  anthropic: { url: "https://api.anthropic.com/v1/messages", format: "anthropic", defaultModel: "claude-sonnet-4-20250514" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", format: "openai", defaultModel: "google/gemini-2.5-flash" },
  google: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", format: "openai", defaultModel: "gemini-2.5-flash" },
};

interface AIResult {
  content: string;
  provider: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
}

async function callExternalProvider(provider: string, apiKey: string, messages: any[]): Promise<AIResult | null> {
  const config = PROVIDER_ENDPOINTS[provider];
  if (!config) return null;
  try {
    if (config.format === "anthropic") {
      const systemMsg = messages.find((m) => m.role === "system");
      const nonSystemMsgs = messages.filter((m) => m.role !== "system");
      const res = await fetch(config.url, {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.defaultModel, max_tokens: 1024, system: systemMsg?.content || "", messages: nonSystemMsgs }),
      });
      if (!res.ok) { console.error(`[AI] ${provider} error ${res.status}:`, await res.text()); return null; }
      const data = await res.json();
      const content = data.content?.[0]?.text || null;
      if (!content) return null;
      return { content, provider, model: config.defaultModel, tokens_input: data.usage?.input_tokens ?? 0, tokens_output: data.usage?.output_tokens ?? 0 };
    }
    const res = await fetch(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.defaultModel, messages }),
    });
    if (!res.ok) { console.error(`[AI] ${provider} error ${res.status}:`, await res.text()); return null; }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || null;
    if (!content) return null;
    return { content, provider, model: config.defaultModel, tokens_input: data.usage?.prompt_tokens ?? 0, tokens_output: data.usage?.completion_tokens ?? 0 };
  } catch (err) {
    console.error(`[AI] ${provider} exception:`, err);
    return null;
  }
}

async function callLovableAI(apiKey: string, messages: any[]): Promise<AIResult> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[AI] Lovable AI error:", res.status, errText);
    if (res.status === 429) throw { status: 429, message: "Limite de requisições. Tente em instantes." };
    if (res.status === 402) throw { status: 402, message: "Créditos de IA esgotados. Adicione créditos." };
    throw { status: 500, message: "Falha na IA" };
  }
  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || "...",
    provider: "lovable",
    model: MODEL,
    tokens_input: data.usage?.prompt_tokens ?? 0,
    tokens_output: data.usage?.completion_tokens ?? 0,
  };
}

async function callAIWithFallback(adminClient: any, lovableApiKey: string | undefined, messages: any[]): Promise<AIResult> {
  const { data: providerKeys } = await adminClient.from("ai_provider_keys").select("provider, api_key, is_active").eq("is_active", true).order("updated_at", { ascending: false });
  for (const pk of providerKeys || []) {
    if (!pk.api_key) continue;
    const result = await callExternalProvider(pk.provider, pk.api_key, messages);
    if (result) return result;
  }
  if (!lovableApiKey) throw { status: 500, message: "Nenhum provedor de IA disponível." };
  return callLovableAI(lovableApiKey, messages);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? serviceKey;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { room_id, session_id, message } = await req.json();
    if (!room_id || !message?.trim()) {
      return new Response(JSON.stringify({ error: "room_id and message required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate room access
    const { data: room } = await admin.from("rooms").select("id, professor_id, group_id").eq("id", room_id).maybeSingle();
    if (!room) return new Response(JSON.stringify({ error: "Room not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Find active room_scenario -> scenario dossier
    const { data: rs } = await admin
      .from("room_scenarios")
      .select("scenario_id, scenario_content")
      .eq("room_id", room_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let dossier = "";
    let scenarioContent = rs?.scenario_content || "";
    if (rs?.scenario_id) {
      const { data: sc } = await admin.from("scenarios").select("patient_dossier, content").eq("id", rs.scenario_id).maybeSingle();
      dossier = sc?.patient_dossier || "";
      if (!scenarioContent) scenarioContent = sc?.content || "";
    }

    // Check institution AI limits
    let institutionId: string | null = null;
    let maxInteractions = 99999;
    if (room.group_id) {
      const { data: g } = await admin.from("groups").select("course_id").eq("id", room.group_id).maybeSingle();
      if (g?.course_id) {
        const { data: c } = await admin.from("courses").select("institution_id").eq("id", g.course_id).maybeSingle();
        if (c?.institution_id) {
          institutionId = c.institution_id;
          const { data: sub } = await admin.from("subscriptions").select("max_ai_interactions").eq("institution_id", institutionId).limit(1).maybeSingle();
          maxInteractions = sub?.max_ai_interactions ?? 99999;
          const monthYear = new Date().toISOString().slice(0, 7);
          const { data: usage } = await admin.from("ai_interaction_counts").select("interaction_count").eq("institution_id", institutionId).eq("month_year", monthYear).maybeSingle();
          if ((usage?.interaction_count ?? 0) >= maxInteractions) {
            return new Response(JSON.stringify({ error: `Limite de ${maxInteractions} interações IA/mês atingido.`, limit_reached: true }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      }
    }

    // Load interview history
    const { data: history } = await admin
      .from("patient_interviews")
      .select("role, content")
      .eq("room_id", room_id)
      .eq("session_id", session_id || null)
      .order("created_at", { ascending: true })
      .limit(40);

    const systemPrompt = `Você é um paciente virtual em uma simulação clínica educacional para alunos de saúde (PBL).

REGRAS CRÍTICAS:
- Permaneça SEMPRE em personagem como o paciente. Nunca quebre a 4ª parede.
- Responda em primeira pessoa, com a linguagem natural de um paciente leigo (a menos que o dossiê indique o contrário).
- Só revele sintomas, histórico, hábitos e informações quando o aluno PERGUNTAR diretamente ou de forma relacionada. Não despeje tudo de uma vez.
- Se perguntarem algo que NÃO está no dossiê, responda com naturalidade ("não sei dizer", "nunca reparei", "acho que não") em vez de inventar dados clínicos.
- Demonstre emoções coerentes (dor, preocupação, medo, alívio) quando apropriado.
- Não dê diagnóstico nem sugira condutas. Você é o paciente, não o médico.
- Respostas curtas e humanas (1 a 4 frases na maioria das vezes).

CENÁRIO PÚBLICO (o que o aluno já leu):
${scenarioContent || "(sem cenário definido)"}

DOSSIÊ OCULTO DO PACIENTE (apenas você sabe; use para responder coerentemente):
${dossier || "(O professor ainda não preencheu o dossiê. Use o cenário acima e improvise de forma plausível, sem inventar achados clínicos específicos.)"}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    let aiResult;
    try {
      aiResult = await callAIWithFallback(admin, LOVABLE_API_KEY, messages);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e?.message || "Falha na IA" }), { status: e?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const reply: string = aiResult.content || "...";

    // Persist both messages
    await admin.from("patient_interviews").insert([
      { room_id, session_id: session_id || null, user_id: caller.id, role: "user", content: message },
      { room_id, session_id: session_id || null, user_id: caller.id, role: "assistant", content: reply },
    ]);

    // Log AI usage
    await admin.from("ai_usage_log").insert({
      user_id: caller.id,
      provider: aiResult.provider,
      model: aiResult.model,
      prompt_type: "patient_simulator",
      tokens_input: aiResult.tokens_input,
      tokens_output: aiResult.tokens_output,
      estimated_cost_usd: 0,
    });

    // Increment institution AI count
    if (institutionId) {
      const monthYear = new Date().toISOString().slice(0, 7);
      const { data: existing } = await admin.from("ai_interaction_counts").select("id, interaction_count").eq("institution_id", institutionId).eq("month_year", monthYear).maybeSingle();
      if (existing) {
        await admin.from("ai_interaction_counts").update({ interaction_count: existing.interaction_count + 1, updated_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await admin.from("ai_interaction_counts").insert({ institution_id: institutionId, month_year: monthYear, interaction_count: 1 });
      }
    }

    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("patient-simulator error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
