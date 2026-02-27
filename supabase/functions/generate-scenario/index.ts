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

async function callExternalProvider(provider: string, apiKey: string, messages: AIMsg[]): Promise<string | null> {
  const c = PROVIDER_ENDPOINTS[provider];
  if (!c) return null;
  try {
    console.log(`[AI] Trying ${provider}`);
    if (c.format === "anthropic") {
      const sys = messages.find(m => m.role === "system");
      const res = await fetch(c.url, { method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" }, body: JSON.stringify({ model: c.defaultModel, max_tokens: 4096, system: sys?.content || "", messages: messages.filter(m => m.role !== "system") }) });
      if (!res.ok) { console.error(`[AI] ${provider} ${res.status}`); await res.text(); return null; }
      const d = await res.json(); return d.content?.[0]?.text || null;
    }
    const res = await fetch(c.url, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: c.defaultModel, messages }) });
    if (!res.ok) { console.error(`[AI] ${provider} ${res.status}`); await res.text(); return null; }
    const d = await res.json(); return d.choices?.[0]?.message?.content || null;
  } catch (e) { console.error(`[AI] ${provider} error:`, e); return null; }
}

async function callAIWithFallback(adminClient: any, lovableKey: string, messages: AIMsg[]): Promise<string> {
  // Always try external provider keys first (global keys set by superadmin)
  const { data: keys } = await adminClient.from("ai_provider_keys").select("provider, api_key, is_active").eq("is_active", true).order("updated_at", { ascending: false });
  for (const pk of (keys || [])) {
    if (!pk.api_key) continue;
    const r = await callExternalProvider(pk.provider, pk.api_key, messages);
    if (r) { console.log(`[AI] Success: ${pk.provider}`); return r; }
  }
  // Fallback to Lovable AI only if all external providers failed
  console.log("[AI] Using Lovable AI fallback");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }) });
  if (!res.ok) { const t = await res.text(); console.error("[AI] Lovable error:", res.status, t); if (res.status === 429) throw { status: 429, message: "Rate limit exceeded." }; if (res.status === 402) throw { status: 402, message: "Payment required." }; throw { status: 500, message: "AI error" }; }
  const d = await res.json(); return d.choices?.[0]?.message?.content || "";
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
      const content = await callAIWithFallback(
        adminClient,
        LOVABLE_API_KEY,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Objetivos de aprendizagem:\n${objectives.trim()}` },
        ]
      );

      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        else throw new Error("No JSON found");
      } catch {
        console.error("Failed to parse AI response:", content);
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
