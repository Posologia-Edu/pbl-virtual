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
      if (!res.ok) { await res.text(); return null; }
      const d = await res.json();
      const content = d.content?.[0]?.text || null;
      if (!content) return null;
      return { content, provider, model: c.defaultModel, tokens_input: d.usage?.input_tokens ?? 0, tokens_output: d.usage?.output_tokens ?? 0 };
    }
    const res = await fetch(c.url, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: c.defaultModel, messages }) });
    if (!res.ok) { await res.text(); return null; }
    const d = await res.json();
    const content = d.choices?.[0]?.message?.content || null;
    if (!content) return null;
    return { content, provider, model: c.defaultModel, tokens_input: d.usage?.prompt_tokens ?? 0, tokens_output: d.usage?.completion_tokens ?? 0 };
  } catch { return null; }
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

    // Fetch references for this session
    const { data: references } = await adminClient
      .from("session_references")
      .select("title, url, ref_type, profiles!session_references_author_id_profiles_fkey(full_name)")
      .eq("room_id", room_id)
      .eq("session_id", session_id)
      .order("created_at");

    const refsGrouped: Record<string, { title: string; url: string; ref_type: string }[]> = {};
    for (const ref of (references || [])) {
      const author = (ref.profiles as any)?.full_name || "Anônimo";
      if (!refsGrouped[author]) refsGrouped[author] = [];
      refsGrouped[author].push({ title: ref.title, url: ref.url, ref_type: ref.ref_type });
    }

    const referencesText = Object.entries(refsGrouped).length > 0
      ? Object.entries(refsGrouped).map(([author, refs]) =>
          `**${author}**:\n${refs.map((r, i) => {
            const displayTitle = r.title && r.title.trim() ? r.title : (r.ref_type === 'file' ? 'Arquivo enviado' : r.url);
            const cleanTitle = decodeURIComponent(displayTitle).replace(/^.*\//, '');
            return `${i + 1}. [${r.ref_type === 'file' ? 'Arquivo' : 'Link'}] ${cleanTitle}`;
          }).join("\n")}`
        ).join("\n\n")
      : "(Nenhuma referência adicionada)";

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

    const hasContributions = Object.keys(stepData).length > 0;
    const hasReferences = Object.keys(refsGrouped).length > 0;

    const contributionsBlock = hasContributions
      ? Object.entries(stepData).map(([step, items]) => `### ${step}\n${items.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}`).join("\n\n")
      : "(NENHUMA contribuição foi registrada pelos alunos durante a sessão)";

    const prompt = `Você é um secretário acadêmico que TRANSCREVE fielmente uma sessão de Aprendizagem Baseada em Problemas (PBL/ABP).

REGRAS ABSOLUTAS — leia antes de escrever qualquer coisa:
1. Use EXCLUSIVAMENTE as contribuições e referências fornecidas abaixo. Nada mais.
2. É TERMINANTEMENTE PROIBIDO inventar, inferir, completar, complementar, sugerir ou supor termos, hipóteses, objetivos, conclusões ou referências que não estejam explicitamente listados nos dados fornecidos.
3. Se uma seção não tiver dados registrados, escreva literalmente: "Nenhuma contribuição registrada pelo grupo nesta etapa." NÃO preencha com informação do cenário clínico, conhecimento prévio ou suposições.
4. O cenário clínico abaixo é apenas referência contextual — NÃO extraia termos, problemas ou hipóteses dele para a ata. Somente o que os alunos digitaram pode aparecer.
5. Mantenha as palavras dos alunos. Você pode reorganizar e formatar, mas não reescrever significativamente nem adicionar interpretação.
6. Atribua autoria quando indicada (entre parênteses ao lado de cada contribuição).

## Dados da Sessão
- **Sala**: ${room.name}
- **Sessão**: ${sessionLabel}
- **Participantes**: ${participantNames.join(", ") || "(não informados)"}

## Cenário Clínico (CONTEXTO APENAS — não usar como conteúdo da ata)
${scenarioContent || "(Não disponível)"}

## Contribuições registradas pelos alunos (ÚNICA fonte permitida)
${contributionsBlock}

## Referências Bibliográficas registradas
${hasReferences ? referencesText : "(Nenhuma referência registrada)"}

## Estrutura da Ata
Produza a ata com as seções abaixo, em formato formal acadêmico (português brasileiro). Para cada seção, use SOMENTE os itens que aparecem nas "Contribuições registradas". Se não houver itens para a seção, escreva "Nenhuma contribuição registrada pelo grupo nesta etapa."

1. **CABEÇALHO**: sala, sessão, data (use a data atual), participantes
2. **TERMOS IDENTIFICADOS**: somente os itens da etapa "Termos Desconhecidos"
3. **PROBLEMA CENTRAL**: somente os itens da etapa "Definição do Problema"
4. **HIPÓTESES LEVANTADAS**: somente os itens da etapa "Brainstorming / Hipóteses"
5. **OBJETIVOS DE APRENDIZAGEM**: somente os itens da etapa "Objetivos de Aprendizagem"
6. **SÍNTESE**: somente os itens da etapa "Síntese / Fechamento"
7. **REFERÊNCIAS**: lista exatamente como fornecida, agrupada por autor
8. **CONSIDERAÇÕES FINAIS**: 1 ou 2 frases factuais sobre o registro (ex.: "A sessão registrou X contribuições no total" ou "Não houve registros nesta sessão"). Não emita julgamentos sobre desempenho.

LEMBRE-SE: ata ZERADA é melhor que ata com conteúdo inventado. Se um aluno não escreveu, a ata não pode ter aquela informação.`;

    try {
      const aiResult = await callAIWithFallback(
        adminClient,
        lovableApiKey,
        [
          { role: "system", content: "Você é um secretário acadêmico que apenas TRANSCREVE contribuições já registradas. Nunca invente, infira ou complemente conteúdo. Se não há dados, declare ausência. Responda apenas com o texto da ata." },
          { role: "user", content: prompt },
        ]
      );

      if (!aiResult.content) return new Response(JSON.stringify({ error: "IA não retornou conteúdo." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Log AI usage
      await logAIUsage(adminClient, userId, aiResult, "generate_minutes");

      const minutesContent = {
        text: aiResult.content,
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
