import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDER_ENDPOINTS: Record<string, { url: string; format: string; defaultModel: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", format: "openai", defaultModel: "gpt-4o-mini" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", format: "openai", defaultModel: "llama-3.3-70b-versatile" },
  anthropic: { url: "https://api.anthropic.com/v1/messages", format: "anthropic", defaultModel: "claude-sonnet-4-20250514" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", format: "openai", defaultModel: "google/gemini-2.5-flash" },
  google: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", format: "openai", defaultModel: "gemini-2.5-flash" },
};

interface AIMsg { role: string; content: string; }
interface AIResult { content: string; provider: string; model: string; tokens_input: number; tokens_output: number; }

async function callExternalProvider(provider: string, apiKey: string, messages: AIMsg[]): Promise<AIResult | null> {
  const c = PROVIDER_ENDPOINTS[provider];
  if (!c) return null;
  try {
    console.log(`[AI] Trying ${provider}`);
    if (c.format === "anthropic") {
      const sys = messages.find(m => m.role === "system");
      const res = await fetch(c.url, { method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model: c.defaultModel, max_tokens: 4096, system: sys?.content || "", messages: messages.filter(m => m.role !== "system") }) });
      if (!res.ok) { console.error(`[AI] ${provider} ${res.status}`); await res.text(); return null; }
      const d = await res.json();
      const content = d.content?.[0]?.text || null;
      if (!content) return null;
      return { content, provider, model: c.defaultModel, tokens_input: d.usage?.input_tokens ?? 0, tokens_output: d.usage?.output_tokens ?? 0 };
    }
    const res = await fetch(c.url, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: c.defaultModel, messages }) });
    if (!res.ok) { console.error(`[AI] ${provider} ${res.status}`); await res.text(); return null; }
    const d = await res.json();
    const content = d.choices?.[0]?.message?.content || null;
    if (!content) return null;
    return { content, provider, model: c.defaultModel, tokens_input: d.usage?.prompt_tokens ?? 0, tokens_output: d.usage?.completion_tokens ?? 0 };
  } catch (e) { console.error(`[AI] ${provider} error:`, e); return null; }
}

async function callAIWithFallback(adminClient: any, lovableKey: string, messages: AIMsg[]): Promise<AIResult> {
  const { data: keys } = await adminClient.from("ai_provider_keys").select("provider, api_key, is_active").eq("is_active", true).order("updated_at", { ascending: false });
  for (const pk of (keys || [])) {
    if (!pk.api_key) continue;
    const r = await callExternalProvider(pk.provider, pk.api_key, messages);
    if (r) { console.log(`[AI] Success: ${pk.provider}`); return r; }
  }
  console.log("[AI] Using Lovable AI fallback");
  const model = "google/gemini-3-flash-preview";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages }) });
  if (!res.ok) { const t = await res.text(); console.error("[AI] Lovable error:", res.status, t); if (res.status === 429) throw { status: 429, message: "Rate limit exceeded." }; if (res.status === 402) throw { status: 402, message: "Payment required." }; throw { status: 500, message: "AI error" }; }
  const d = await res.json();
  return { content: d.choices?.[0]?.message?.content || "", provider: "lovable", model, tokens_input: d.usage?.prompt_tokens ?? 0, tokens_output: d.usage?.completion_tokens ?? 0 };
}

const COST_PER_1M: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "google/gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "google/gemini-3-flash-preview": { input: 0.15, output: 0.60 },
};

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const rates = COST_PER_1M[model] || { input: 0.5, output: 1.5 };
  return (tokensIn * rates.input + tokensOut * rates.output) / 1_000_000;
}

async function logAIUsage(adminClient: any, userId: string, aiResult: AIResult, promptType: string) {
  try {
    await adminClient.from("ai_usage_log").insert({
      user_id: userId,
      provider: aiResult.provider,
      model: aiResult.model,
      prompt_type: promptType,
      tokens_input: aiResult.tokens_input,
      tokens_output: aiResult.tokens_output,
      estimated_cost_usd: estimateCost(aiResult.model, aiResult.tokens_input, aiResult.tokens_output),
    });
  } catch (e) {
    console.error("[AI] Failed to log usage:", e);
  }
}

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now(); const w = 60_000; const max = 3;
  const ts = (rateLimitMap.get(userId) || []).filter(t => now - t < w);
  if (ts.length >= max) return false; ts.push(now); rateLimitMap.set(userId, ts); return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? serviceRoleKey;

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleCheck } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id).in("role", ["admin", "professor", "institution_admin"]);
    if (!roleCheck || roleCheck.length === 0) return new Response(JSON.stringify({ error: "Acesso não autorizado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (!checkRateLimit(caller.id)) return new Response(JSON.stringify({ error: "Limite de requisições excedido. Aguarde 1 minuto." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check if user's institution has AI scenario generation enabled
    const { data: instData } = await adminClient
      .from("institutions")
      .select("id")
      .eq("owner_id", caller.id)
      .maybeSingle();

    if (instData) {
      const { data: sub } = await adminClient
        .from("subscriptions")
        .select("ai_scenario_generation")
        .eq("institution_id", instData.id)
        .limit(1)
        .maybeSingle();

      if (sub && !sub.ai_scenario_generation) {
        return new Response(JSON.stringify({ error: "A geração de cenários com IA não está disponível no seu plano atual. Faça upgrade para o plano Professional ou superior." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { objectives } = await req.json();
    if (!objectives || typeof objectives !== "string" || objectives.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Objetivos de aprendizagem são obrigatórios (mínimo 5 caracteres)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const systemPrompt = `Você é um especialista em educação médica e metodologia PBL (Problem-Based Learning).
Sua tarefa é criar um cenário clínico (caso problema) para uma sessão tutorial de PBL.

O cenário deve:
- Ser realista e baseado em uma situação clínica plausível
- Apresentar um paciente com queixa principal, história da doença atual, antecedentes e exame físico relevantes
- Conter pistas suficientes para os alunos identificarem termos desconhecidos, formularem hipóteses e definirem objetivos de aprendizagem
- Ter entre 200 e 400 palavras
- Estar em português brasileiro

Também gere:
1. Um glossário técnico com os termos médicos do cenário e suas definições (para uso exclusivo do tutor)
2. Uma lista de 5-8 perguntas socráticas que o tutor pode usar para guiar a discussão

Responda EXATAMENTE no formato JSON abaixo, sem markdown:
{
  "scenario": "texto do cenário clínico",
  "glossary": [{"term": "termo", "definition": "definição"}],
  "questions": ["pergunta 1", "pergunta 2"]
}`;

    try {
      const aiResult = await callAIWithFallback(
        adminClient,
        LOVABLE_API_KEY,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Objetivos de aprendizagem:\n${objectives.trim()}` },
        ]
      );

      // Log AI usage
      await logAIUsage(adminClient, caller.id, aiResult, "generate_scenario");

      let parsed;
      try {
        const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        else throw new Error("No JSON found");
      } catch {
        console.error("Failed to parse AI response:", aiResult.content);
        return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA. Tente novamente." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ scenario: parsed.scenario || "", glossary: parsed.glossary || [], questions: parsed.questions || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "Erro ao gerar cenário" }), { status: err.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("generate-scenario error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
