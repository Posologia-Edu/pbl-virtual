import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (res.status === 429) throw { status: 429, message: "Muitas requisições. Aguarde alguns instantes e tente de novo." };
    if (res.status === 402) throw { status: 402, message: "Créditos de IA insuficientes. Adicione créditos no workspace." };
    throw { status: 500, message: "Falha ao contatar a IA." };
  }
  const d = await res.json();
  const call = d.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw { status: 502, message: "IA não retornou resposta estruturada." };
  return { args: JSON.parse(call.function.arguments), provider: "lovable", model, usage: d.usage || {} };
}

const TOOL = {
  type: "function",
  function: {
    name: "suggest_evaluation",
    description: "Sugere uma nota (escala O/I/PS/S/MS) com justificativa e evidências citáveis.",
    parameters: {
      type: "object",
      properties: {
        grade: { type: "string", enum: ["O", "I", "PS", "S", "MS"] },
        rationale: { type: "string", description: "Justificativa em 3-5 frases, em português." },
        evidences: {
          type: "array",
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["chat", "reference", "comment", "objective", "peer"] },
              snippet: { type: "string", description: "Trecho curto da evidência (máx 200 chars)." },
              timestamp: { type: "string", description: "ISO 8601 opcional." },
            },
            required: ["type", "snippet"],
            additionalProperties: false,
          },
        },
      },
      required: ["grade", "rationale", "evidences"],
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
    const { room_id, session_id, student_id, criterion_id } = body || {};
    if (!room_id || !student_id || !criterion_id) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authorize: must be the room's professor
    const { data: room } = await admin
      .from("rooms")
      .select("id, professor_id, group_id, name")
      .eq("id", room_id)
      .maybeSingle();
    if (!room || room.professor_id !== userId) {
      return new Response(JSON.stringify({ error: "Acesso negado a esta sala." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Criterion
    const { data: criterion } = await admin
      .from("evaluation_criteria")
      .select("id, label, phase")
      .eq("id", criterion_id)
      .maybeSingle();
    if (!criterion) {
      return new Response(JSON.stringify({ error: "Critério não encontrado." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Student profile
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("user_id", student_id)
      .maybeSingle();

    // Aggregate evidence
    const chatQ = admin
      .from("chat_messages")
      .select("content, created_at")
      .eq("room_id", room_id)
      .eq("user_id", student_id)
      .order("created_at", { ascending: false })
      .limit(80);
    const commentsQ = admin
      .from("presentation_comments")
      .select("content, slide_number, created_at")
      .eq("room_id", room_id)
      .eq("author_id", student_id)
      .order("created_at", { ascending: false })
      .limit(30);
    const peerQ = admin
      .from("peer_evaluations")
      .select("grade, criterion_id")
      .eq("room_id", room_id)
      .eq("target_id", student_id)
      .eq("criterion_id", criterion_id);

    let refsQ: any = admin
      .from("session_references")
      .select("title, url, ref_type, created_at")
      .eq("room_id", room_id)
      .eq("author_id", student_id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (session_id) refsQ = refsQ.eq("session_id", session_id);

    const [chatR, commentsR, peerR, refsR] = await Promise.all([chatQ, commentsQ, peerQ, refsQ]);

    const chat = (chatR.data || []).reverse();
    const comments = commentsR.data || [];
    const peers = peerR.data || [];
    const refs = refsR.data || [];

    const peerAvg = (() => {
      const map: Record<string, number> = { O: 0, I: 25, PS: 50, S: 75, MS: 100 };
      const vals = peers.map((p: any) => map[p.grade]).filter((v: number) => v !== undefined);
      if (!vals.length) return null;
      return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
    })();

    const systemPrompt = `Você é um assistente pedagógico especialista em PBL (Aprendizagem Baseada em Problemas) da área da saúde.
Sua tarefa: sugerir uma nota (escala O=Insatisfatório, I=Insuficiente, PS=Parcialmente Suficiente, S=Suficiente, MS=Muito Suficiente) para UM critério de avaliação de UM aluno, baseando-se EXCLUSIVAMENTE nas evidências fornecidas (mensagens de chat, comentários nos slides, referências anexadas, autoavaliação dos pares).

Regras:
- Seja conservador: na ausência de evidências suficientes, sugira "PS" e explicite a falta de dados.
- Cite evidências concretas (snippets curtos) na resposta.
- Justificativa em português, 3-5 frases, tom respeitoso e formativo.
- A sugestão é APENAS uma recomendação; o tutor decide.`;

    const evidencePayload = {
      criterio: { label: criterion.label, fase: criterion.phase },
      aluno: profile?.full_name || "Aluno",
      sala: room.name,
      chat_do_aluno: chat.slice(-60).map((m: any) => ({ t: m.created_at, msg: (m.content || "").slice(0, 300) })),
      comentarios_nos_slides: comments.map((c: any) => ({ slide: c.slide_number, t: c.created_at, msg: (c.content || "").slice(0, 250) })),
      referencias_anexadas: refs.map((r: any) => ({ titulo: r.title, tipo: r.ref_type, url: r.url, t: r.created_at })),
      media_avaliacao_pares_neste_criterio: peerAvg,
    };

    const userPrompt = `Avalie o aluno **${profile?.full_name || "Aluno"}** no critério **"${criterion.label}"** (fase: ${criterion.phase === "opening" ? "Abertura" : "Fechamento"}).

EVIDÊNCIAS (JSON):
${JSON.stringify(evidencePayload, null, 2)}

Responda APENAS via tool call \`suggest_evaluation\`.`;

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
    const suggested_grade = parsed.grade;
    const rationale = parsed.rationale || "";
    const evidences = Array.isArray(parsed.evidences) ? parsed.evidences : [];

    // Log usage
    const usage = result.usage || {};
    await admin.from("ai_usage_log").insert({
      user_id: userId,
      provider: result.provider,
      model: result.model,
      prompt_type: "suggest_evaluation",
      tokens_input: usage.prompt_tokens || 0,
      tokens_output: usage.completion_tokens || 0,
      estimated_cost_usd: 0,
    } as any);

    // Persist suggestion (audit)
    const { data: inserted } = await admin
      .from("evaluation_suggestions")
      .insert({
        room_id,
        session_id: session_id || null,
        student_id,
        criterion_id,
        professor_id: userId,
        suggested_grade,
        rationale,
        evidences,
      } as any)
      .select("id")
      .single();

    return new Response(
      JSON.stringify({
        suggestion_id: inserted?.id,
        grade: suggested_grade,
        rationale,
        evidences,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("suggest-evaluation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
