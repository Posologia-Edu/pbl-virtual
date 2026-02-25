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
      if (!res.ok) { await res.text(); return null; }
      const d = await res.json(); return d.content?.[0]?.text || null;
    }
    const res = await fetch(c.url, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: c.defaultModel, messages }) });
    if (!res.ok) { await res.text(); return null; }
    const d = await res.json(); return d.choices?.[0]?.message?.content || null;
  } catch { return null; }
}

async function callAIWithFallback(adminClient: any, institutionId: string | null, lovableKey: string, messages: AIMsg[]): Promise<string> {
  if (institutionId) {
    const { data: keys } = await adminClient.from("ai_provider_keys").select("provider, api_key, is_active").eq("institution_id", institutionId).eq("is_active", true);
    for (const pk of (keys || [])) {
      if (!pk.api_key) continue;
      const r = await callExternalProvider(pk.provider, pk.api_key, messages);
      if (r) { console.log(`[AI] Success: ${pk.provider}`); return r; }
    }
  }
  console.log("[AI] Using Lovable AI fallback");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages }) });
  if (!res.ok) { const t = await res.text(); console.error("[AI] Lovable error:", res.status, t); if (res.status === 429) throw { status: 429, message: "Rate limit exceeded." }; if (res.status === 402) throw { status: 402, message: "Payment required." }; throw { status: 500, message: "AI error" }; }
  const d = await res.json(); return d.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claimsData.claims.sub as string;

    const { session_id, room_id } = await req.json();
    if (!session_id || !room_id) return new Response(JSON.stringify({ error: "session_id and room_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: room } = await adminClient.from("rooms").select("professor_id, name, group_id").eq("id", room_id).single();
    if (!room || room.professor_id !== userId) return new Response(JSON.stringify({ error: "Only the professor can generate minutes" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Resolve institution_id
    let institutionId: string | null = null;
    const { data: groupData } = await adminClient.from("groups").select("course_id").eq("id", room.group_id).single();
    if (groupData?.course_id) {
      const { data: courseData } = await adminClient.from("courses").select("institution_id").eq("id", groupData.course_id).single();
      institutionId = courseData?.institution_id || null;
    }

    // Fetch session info
    const { data: session } = await adminClient
      .from("tutorial_sessions")
      .select("*, room_scenarios(scenario_content, label)")
      .eq("id", session_id)
      .single();

    if (!session) return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: stepItems } = await adminClient
      .from("step_items")
      .select("step, content, profiles!step_items_author_id_profiles_fkey(full_name)")
      .eq("room_id", room_id)
      .eq("session_id", session_id)
      .order("step")
      .order("created_at");

    const { data: members } = await adminClient
      .from("group_members")
      .select("profiles!group_members_student_id_profiles_fkey(full_name)")
      .eq("group_id", room.group_id);

    const participantNames = members?.map((m: any) => m.profiles?.full_name).filter(Boolean) || [];

    const stepLabels: Record<number, string> = {
      0: "Cenário", 1: "Termos Desconhecidos", 2: "Definição do Problema",
      3: "Brainstorming / Hipóteses", 5: "Objetivos de Aprendizagem", 7: "Síntese / Fechamento",
    };

    const stepData: Record<string, string[]> = {};
    for (const item of (stepItems || [])) {
      const label = stepLabels[item.step] || `Passo ${item.step}`;
      if (!stepData[label]) stepData[label] = [];
      const author = (item.profiles as any)?.full_name || "Anônimo";
      stepData[label].push(`${item.content} (${author})`);
    }

    const scenarioContent = (session as any).room_scenarios?.scenario_content || "";
    const sessionLabel = (session as any).room_scenarios?.label || session.label || "";

    const prompt = `Você é um secretário acadêmico especializado em sessões de Aprendizagem Baseada em Problemas (PBL/ABP).

Gere uma ATA FORMAL e ESTRUTURADA da sessão tutorial com base nos dados abaixo.

## Dados da Sessão
- **Sala**: ${room.name}
- **Sessão**: ${sessionLabel}
- **Participantes**: ${participantNames.join(", ")}

## Cenário Clínico
${scenarioContent || "(Não disponível)"}

## Contribuições por Etapa
${Object.entries(stepData).map(([step, items]) => `### ${step}\n${items.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}`).join("\n\n")}

## Instruções para a Ata
Gere a ata com as seguintes seções, em formato formal acadêmico:

1. **CABEÇALHO**: Identificação da sessão (sala, sessão, data, participantes)
2. **TERMOS IDENTIFICADOS**: Lista dos termos desconhecidos levantados pelo grupo
3. **PROBLEMA CENTRAL**: Definição do problema identificado
4. **HIPÓTESES LEVANTADAS**: Hipóteses formuladas durante o brainstorming
5. **OBJETIVOS DE APRENDIZAGEM**: Objetivos definidos pelo grupo
6. **SÍNTESE**: Resumo das conclusões e discussões do fechamento
7. **CONSIDERAÇÕES FINAIS**: Breve análise do progresso do grupo

A ata deve ser formal, objetiva e adequada para documentação acadêmica.
Use linguagem formal em português brasileiro.`;

    try {
      const minutesText = await callAIWithFallback(
        adminClient,
        institutionId,
        lovableApiKey,
        [
          { role: "system", content: "Você é um assistente acadêmico que gera atas formais de sessões PBL. Responda apenas com o texto da ata, sem comentários adicionais." },
          { role: "user", content: prompt },
        ]
      );

      if (!minutesText) return new Response(JSON.stringify({ error: "IA não retornou conteúdo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const minutesContent = {
        text: minutesText,
        session_label: sessionLabel,
        room_name: room.name,
        participants: participantNames,
        generated_at: new Date().toISOString(),
      };

      const { data: existing } = await callerClient.from("session_minutes").select("id").eq("session_id", session_id).maybeSingle();

      let result;
      if (existing) {
        result = await callerClient.from("session_minutes").update({ content: minutesContent, generated_by: userId }).eq("id", existing.id).select().single();
      } else {
        result = await callerClient.from("session_minutes").insert({ session_id, room_id, generated_by: userId, content: minutesContent }).select().single();
      }

      if (result.error) {
        console.error("DB error:", result.error.message);
        return new Response(JSON.stringify({ error: "Falha ao salvar ata." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ minutes: result.data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "Erro ao gerar ata" }), { status: err.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    console.error("generate-minutes error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
