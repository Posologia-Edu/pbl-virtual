import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDER_ENDPOINTS: Record<string, { url: string; defaultModel: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", defaultModel: "llama-3.3-70b-versatile" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", defaultModel: "google/gemini-2.5-flash" },
  google: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", defaultModel: "gemini-2.5-flash" },
};

const ADAPTIVE_TOOL = {
  type: "function",
  function: {
    name: "create_adaptive_scenario",
    description: "Cria um cenário PBL adaptativo focado nas lacunas de aprendizagem.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string", description: "Texto narrativo do caso." },
        tutor_questions: { type: "array", items: { type: "string" } },
        tutor_glossary: { type: "array", items: { type: "object", properties: { term: { type: "string" }, definition: { type: "string" } }, required: ["term", "definition"] } },
        targeted_objectives: { type: "array", items: { type: "string" } },
        targeted_criteria: { type: "array", items: { type: "string" } },
      },
      required: ["title", "content", "tutor_questions"],
      additionalProperties: false,
    },
  },
};

async function callAI(adminClient: any, lovableKey: string | undefined, messages: any[]): Promise<any> {
  const tools = [ADAPTIVE_TOOL];
  const tool_choice = { type: "function", function: { name: "create_adaptive_scenario" } };

  const { data: keys } = await adminClient.from("ai_provider_keys").select("provider, api_key, is_active").eq("is_active", true).order("updated_at", { ascending: false });
  for (const pk of keys || []) {
    const cfg = PROVIDER_ENDPOINTS[pk.provider];
    if (!cfg || !pk.api_key) continue;
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${pk.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: cfg.defaultModel, messages, tools, tool_choice }),
      });
      if (!res.ok) { console.error(`[AI] ${pk.provider} ${res.status}`); continue; }
      const d = await res.json();
      const call = d.choices?.[0]?.message?.tool_calls?.[0];
      if (call?.function?.arguments) {
        return { args: JSON.parse(call.function.arguments), provider: pk.provider, model: cfg.defaultModel, usage: d.usage || {} };
      }
    } catch (e) { console.error(`[AI] ${pk.provider} error:`, e); }
  }

  if (!lovableKey) throw { status: 500, message: "Nenhum provedor de IA disponível." };
  const model = "google/gemini-3-flash-preview";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, tools, tool_choice }),
  });
  if (!res.ok) {
    if (res.status === 429) throw { status: 429, message: "Limite de requisições da IA excedido. Aguarde alguns instantes." };
    if (res.status === 402) throw { status: 402, message: "Créditos da IA esgotados. Adicione créditos no workspace ou configure uma API key." };
    throw { status: 500, message: "Erro ao chamar IA." };
  }
  const d = await res.json();
  const call = d.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw { status: 500, message: "IA não retornou cenário estruturado." };
  return { args: JSON.parse(call.function.arguments), provider: "lovable", model, usage: d.usage || {} };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { source_type, target_type, target_id, base_scenario_id, gaps_payload, course_id, module_id } = body || {};

    if (!["variation", "subscenario"].includes(source_type)) return new Response(JSON.stringify({ error: "source_type inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!["group", "student"].includes(target_type) || !target_id) return new Response(JSON.stringify({ error: "target inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Resolve base scenario (optional)
    let baseScenario: any = null;
    if (base_scenario_id) {
      const { data } = await admin.from("scenarios").select("title, content, course_id, module_id, tutor_glossary, tutor_questions").eq("id", base_scenario_id).maybeSingle();
      baseScenario = data;
    }

    const finalCourseId = course_id || baseScenario?.course_id || null;
    const finalModuleId = module_id || baseScenario?.module_id || null;

    const weak = (gaps_payload?.weakCriteria || []).map((c: any) => `- ${c.label} (média ${c.average}/100, ${c.samples} avaliações, fase ${c.phase})`).join("\n") || "Nenhum crítico.";
    const pending = (gaps_payload?.pendingObjectives || []).map((o: any) => `- ${o.content}${o.is_essential ? " (essencial)" : ""}`).join("\n") || "Nenhum pendente.";
    const covered = (gaps_payload?.coveredScenarios || []).map((s: any) => `- ${s.label || "Cenário"}: ${s.snippet || ""}`).join("\n") || "Nenhum cenário prévio.";

    const styleInstruction = source_type === "subscenario"
      ? "Gere um SUB-CENÁRIO curto (no máximo 2 parágrafos) com UMA pergunta-chave central, focado exclusivamente nas lacunas mais urgentes."
      : "Gere uma VARIAÇÃO completa do caso com novo contexto clínico/situacional, mantendo os objetivos de aprendizagem-alvo mas trocando totalmente o cenário narrativo.";

    const systemPrompt = `Você é um designer experiente de casos PBL (Aprendizagem Baseada em Problemas) para a área da saúde.
Sua tarefa: gerar um cenário ADAPTATIVO baseado no desempenho real dos alunos.
${styleInstruction}
NUNCA repita literalmente cenários já cursados. Garanta que o caso aborde explicitamente as lacunas listadas.
Use linguagem clara, contexto realista (idade, sintomas, ambiente) e termine com perguntas que incentivem hipóteses e objetivos de aprendizagem.
Responda SEMPRE através da função create_adaptive_scenario.`;

    const userPrompt = `## Lacunas a serem trabalhadas

### Critérios fracos (escala O=0 / I=25 / PS=50 / S=75 / MS=100)
${weak}

### Objetivos de aprendizagem pendentes
${pending}

### Cenários já cursados (NÃO repetir)
${covered}

${baseScenario ? `### Cenário-base de referência (use como inspiração, mas adapte)\nTítulo: ${baseScenario.title}\n${baseScenario.content}` : ""}

Gere agora o cenário adaptativo seguindo as regras.`;

    const result = await callAI(admin, lovableKey, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const a = result.args;

    // Insert scenario
    const { data: scenario, error: scErr } = await admin.from("scenarios").insert({
      title: a.title,
      content: a.content,
      course_id: finalCourseId,
      module_id: finalModuleId,
      tutor_questions: a.tutor_questions || null,
      tutor_glossary: a.tutor_glossary || null,
      is_adaptive: true,
    }).select("*").single();
    if (scErr) throw scErr;

    // Insert adaptive_scenarios linkage
    await admin.from("adaptive_scenarios").insert({
      scenario_id: scenario.id,
      source_type,
      target_type,
      target_id,
      base_scenario_id: base_scenario_id || null,
      gaps_payload: { ...gaps_payload, targeted_objectives: a.targeted_objectives || [], targeted_criteria: a.targeted_criteria || [] },
      created_by: user.id,
    });

    // Log AI usage
    await admin.from("ai_usage_log").insert({
      user_id: user.id,
      provider: result.provider,
      model: result.model,
      prompt_type: "adaptive_scenario",
      tokens_input: result.usage?.prompt_tokens || result.usage?.input_tokens || 0,
      tokens_output: result.usage?.completion_tokens || result.usage?.output_tokens || 0,
    });

    return new Response(JSON.stringify({ scenario, source_type, provider: result.provider }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("generate-adaptive-scenario error:", e);
    const status = e?.status || 500;
    return new Response(JSON.stringify({ error: e?.message || "Erro desconhecido" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
