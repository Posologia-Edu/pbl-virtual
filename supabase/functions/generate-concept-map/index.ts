import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveInstitutionIdFromRoom, checkAiQuota, incrementAiQuota, aiQuotaExceededResponse } from "../_shared/planLimits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDER_ENDPOINTS: Record<string, { url: string; defaultModel: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", defaultModel: "llama-3.3-70b-versatile" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", defaultModel: "google/gemini-2.5-flash" },
  google: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", defaultModel: "gemini-2.5-flash" },
};

async function callAIWithTool(
  adminClient: any,
  lovableKey: string | undefined,
  messages: any[],
  tool: any,
): Promise<{ args: any; provider: string; model: string; usage: any }> {
  const tools = [tool];
  const tool_choice = { type: "function", function: { name: tool.function.name } };

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
    if (res.status === 429) throw { status: 429, message: "Muitas requisições. Aguarde alguns instantes." };
    if (res.status === 402) throw { status: 402, message: "Créditos de IA insuficientes." };
    throw { status: 500, message: "Falha ao contatar a IA." };
  }
  const d = await res.json();
  const call = d.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw { status: 502, message: "IA não retornou mapa estruturado." };
  return { args: JSON.parse(call.function.arguments), provider: "lovable", model, usage: d.usage || {} };
}

const TOOL = {
  type: "function",
  function: {
    name: "return_concept_map",
    description: "Retorna um mapa conceitual estruturado em nós e relações.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título curto do mapa." },
        nodes: {
          type: "array",
          maxItems: 18,
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "id curto, ex. n1, n2..." },
              label: { type: "string", description: "Termo/conceito (máx 6 palavras)." },
              kind: { type: "string", enum: ["problem", "hypothesis", "concept", "objective", "term"] },
            },
            required: ["id", "label", "kind"],
            additionalProperties: false,
          },
        },
        edges: {
          type: "array",
          maxItems: 25,
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              target: { type: "string" },
              label: { type: "string", description: "Relação curta (verbo, máx 4 palavras)." },
            },
            required: ["source", "target", "label"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "nodes", "edges"],
      additionalProperties: false,
    },
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { room_id, session_id, phase } = body || {};
    if (!room_id || !session_id || !["opening", "closing"].includes(phase)) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authorize: professor or reporter
    const { data: room } = await admin
      .from("rooms")
      .select("id, professor_id, reporter_id, group_id, name")
      .eq("id", room_id)
      .maybeSingle();
    if (!room) {
      return new Response(JSON.stringify({ error: "Sala não encontrada." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (room.professor_id !== userId && room.reporter_id !== userId) {
      return new Response(JSON.stringify({ error: "Apenas o tutor ou relator pode gerar o mapa." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const institutionId = await resolveInstitutionIdFromRoom(admin, room_id);
    const quota = await checkAiQuota(admin, institutionId);
    if (!quota.allowed) return aiQuotaExceededResponse(quota, corsHeaders);

    // Steps relevant per phase
    const phaseSteps = phase === "opening" ? [1, 2, 3, 5] : [1, 2, 3, 5, 7];

    const [stepsR, chatR, sessionR] = await Promise.all([
      admin
        .from("step_items")
        .select("step, content")
        .eq("room_id", room_id)
        .eq("session_id", session_id)
        .in("step", phaseSteps)
        .order("step")
        .order("created_at"),
      admin
        .from("chat_messages")
        .select("content")
        .eq("room_id", room_id)
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(120),
      admin
        .from("tutorial_sessions")
        .select("label, room_scenarios(scenario_content, label)")
        .eq("id", session_id)
        .maybeSingle(),
    ]);

    const stepItems = stepsR.data || [];
    const chat = (chatR.data || []).reverse();
    const scenarioContent = (sessionR.data as any)?.room_scenarios?.scenario_content || "";

    const stepLabels: Record<number, string> = {
      1: "Termos", 2: "Problema", 3: "Hipóteses", 5: "Objetivos", 7: "Síntese",
    };
    const groupedSteps: Record<string, string[]> = {};
    for (const it of stepItems) {
      const k = stepLabels[it.step as number] || `P${it.step}`;
      (groupedSteps[k] ||= []).push((it.content || "").slice(0, 240));
    }

    const systemPrompt = `Você é um assistente pedagógico especialista em PBL (Aprendizagem Baseada em Problemas). Sua tarefa é gerar um MAPA CONCEITUAL a partir das discussões da sessão.

Regras:
- Identifique de 6 a 14 conceitos centrais (nós), em português, com rótulos curtos.
- Crie de 6 a 20 relações (arestas) com verbos curtos (ex: "causa", "está relacionado a", "leva a").
- Use os tipos: problem (problema central), hypothesis (hipóteses do grupo), concept (conceitos/termos), objective (objetivos de aprendizagem), term (termos desconhecidos definidos).
- Priorize coerência clínica/científica e relevância pedagógica.
- Toda aresta DEVE referenciar ids existentes em nodes.`;

    const payload = {
      fase: phase === "opening" ? "Abertura (P3 hipóteses + P4/P5 objetivos)" : "Fechamento (P7)",
      sala: room.name,
      cenario: scenarioContent.slice(0, 1500),
      etapas: groupedSteps,
      trechos_de_chat: chat.slice(0, 60).map((m: any) => (m.content || "").slice(0, 200)),
    };

    const userPrompt = `Gere o mapa conceitual da fase **${payload.fase}**.\n\nDADOS:\n${JSON.stringify(payload, null, 2)}\n\nResponda APENAS via tool call \`return_concept_map\`.`;

    let result;
    try {
      result = await callAIWithTool(
        admin,
        LOVABLE_API_KEY,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        TOOL,
      );
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e?.message || "Falha ao contatar a IA." }), {
        status: e?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = result.args;
    const rawNodes: any[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const rawEdges: any[] = Array.isArray(parsed.edges) ? parsed.edges : [];

    // Auto layout (radial-ish grid)
    const cols = Math.max(3, Math.ceil(Math.sqrt(rawNodes.length)));
    const nodes = rawNodes.map((n, i) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      x: (i % cols) * 220 + 40,
      y: Math.floor(i / cols) * 140 + 40,
    }));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = rawEdges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e, i) => ({ id: `e${i}`, source: e.source, target: e.target, label: e.label }));

    // Log usage
    const usage = result.usage || {};
    await admin.from("ai_usage_log").insert({
      user_id: userId,
      provider: result.provider,
      model: result.model,
      prompt_type: "generate_concept_map",
      tokens_input: usage.prompt_tokens || 0,
      tokens_output: usage.completion_tokens || 0,
      estimated_cost_usd: 0,
    } as any);
    await incrementAiQuota(admin, institutionId);

    // Upsert (session_id, phase)
    const { data: existing } = await admin
      .from("session_concept_maps")
      .select("id")
      .eq("session_id", session_id)
      .eq("phase", phase)
      .maybeSingle();

    const record = {
      room_id,
      session_id,
      phase,
      nodes,
      edges,
      source_signals: { title: parsed.title || "", chat_count: chat.length, steps: Object.keys(groupedSteps) },
      generated_by: userId,
      is_manual_edit: false,
    };

    let saved;
    if (existing?.id) {
      const { data } = await admin
        .from("session_concept_maps")
        .update(record)
        .eq("id", existing.id)
        .select("*")
        .maybeSingle();
      saved = data;
    } else {
      const { data } = await admin
        .from("session_concept_maps")
        .insert(record)
        .select("*")
        .maybeSingle();
      saved = data;
    }

    return new Response(
      JSON.stringify({ map: saved }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-concept-map error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
