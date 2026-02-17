import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? serviceRoleKey;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify professor role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["professor", "admin"])
      .limit(1);

    if (!roleCheck || roleCheck.length === 0) {
      return new Response(
        JSON.stringify({ error: "Professor access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { room_id, session_id, mode, module_id } = await req.json();

    if (!room_id || !session_id) {
      return new Response(
        JSON.stringify({ error: "room_id and session_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch session data
    const [stepItemsRes, scenarioRes, chatRes] = await Promise.all([
      adminClient
        .from("step_items")
        .select("step, content, profiles!step_items_author_id_profiles_fkey(full_name)")
        .eq("room_id", room_id)
        .eq("session_id", session_id)
        .order("created_at"),
      adminClient
        .from("room_scenarios")
        .select("scenario_content, tutor_glossary, tutor_questions")
        .eq("room_id", room_id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      adminClient
        .from("chat_messages")
        .select("content, profiles!chat_messages_user_id_profiles_fkey(full_name)")
        .eq("room_id", room_id)
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const stepItems = stepItemsRes.data || [];
    const scenario = scenarioRes.data;
    const recentChat = (chatRes.data || []).reverse();

    // Group step items by step
    const stepGroups: Record<number, string[]> = {};
    for (const item of stepItems) {
      if (!stepGroups[item.step]) stepGroups[item.step] = [];
      const name = (item.profiles as any)?.full_name || "Anônimo";
      stepGroups[item.step].push(`${name}: ${item.content}`);
    }

    const contributionsSummary = Object.entries(stepGroups)
      .map(([step, items]) => {
        const stepNames: Record<string, string> = {
          "0": "Cenário",
          "1": "Termos Desconhecidos",
          "2": "Definição do Problema",
          "3": "Brainstorming/Hipóteses",
          "5": "Objetivos de Aprendizagem",
          "7": "Síntese",
        };
        return `### ${stepNames[step] || `Passo ${step}`}\n${items.join("\n")}`;
      })
      .join("\n\n");

    const chatSummary = recentChat
      .map((m: any) => `${(m.profiles as any)?.full_name || "?"}: ${m.content}`)
      .join("\n");

    if (mode === "gap_analysis" && module_id) {
      // Fetch learning objectives for the module
      const { data: objectives } = await adminClient
        .from("learning_objectives")
        .select("content, is_essential")
        .eq("module_id", module_id);

      // Fetch covered objectives for this session
      const { data: covered } = await adminClient
        .from("objective_sessions")
        .select("objective_id, learning_objectives(content)")
        .eq("session_id", session_id);

      const allObjectives = (objectives || [])
        .map(
          (o: any) =>
            `${o.is_essential ? "⭐ [ESSENCIAL] " : ""}${o.content}`
        )
        .join("\n");

      const coveredList = (covered || [])
        .map((c: any) => (c.learning_objectives as any)?.content || "")
        .filter(Boolean)
        .join("\n");

      const systemPrompt = `Você é um co-tutor especialista em PBL para educação médica.
Analise as contribuições dos alunos na sessão e compare com os objetivos de aprendizagem do módulo.

Sua tarefa:
1. Identificar quais objetivos de aprendizagem estão sendo abordados nas contribuições (mesmo que parcialmente)
2. Identificar LACUNAS: objetivos que ainda NÃO foram abordados, especialmente os essenciais (⭐)
3. Sugerir 2-3 perguntas que o tutor pode fazer para direcionar a discussão para os objetivos não cobertos

Responda em JSON:
{
  "addressed": ["objetivo abordado 1", ...],
  "gaps": ["objetivo não coberto 1", ...],
  "essential_gaps": ["objetivo essencial não coberto 1", ...],
  "suggested_questions": ["pergunta 1", "pergunta 2", ...],
  "summary": "Breve resumo da cobertura curricular (2-3 frases)"
}`;

      const userPrompt = `## Objetivos do Módulo
${allObjectives || "Nenhum objetivo cadastrado."}

## Objetivos já confirmados nesta sessão
${coveredList || "Nenhum ainda."}

## Contribuições dos Alunos
${contributionsSummary || "Nenhuma contribuição ainda."}

## Chat Recente
${chatSummary || "Sem mensagens."}`;

      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        }
      );

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required. Add credits." }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        return new Response(
          JSON.stringify({ error: "AI gateway error" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      let parsed;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        console.error("Failed to parse AI gap analysis:", content);
        parsed = { summary: content, gaps: [], essential_gaps: [], suggested_questions: [], addressed: [] };
      }

      return new Response(JSON.stringify({ mode: "gap_analysis", ...parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default mode: suggest questions
    const systemPrompt = `Você é um co-tutor IA especialista em PBL (Problem-Based Learning) para educação médica.

Analise as contribuições dos alunos e o andamento da sessão para sugerir ao tutor/professor:

1. **Perguntas Socráticas** (3-5): Perguntas que estimulem pensamento crítico, baseadas no que os alunos já discutiram. Foque em aprofundar o raciocínio, não em dar respostas.

2. **Menções importantes** (0-3): Alunos que merecem atenção especial — seja por contribuições excepcionais que podem ser destacadas, ou por possíveis equívocos que podem ser redirecionados gentilmente.

3. **Observações pedagógicas** (1-2): Insights sobre a dinâmica da sessão — se há alunos dominando a discussão, se a turma está presa em um ponto, etc.

Responda em JSON:
{
  "questions": [{"question": "...", "rationale": "Por que fazer esta pergunta agora"}],
  "mentions": [{"student": "nome", "type": "highlight|redirect", "reason": "..."}],
  "observations": ["observação 1", "observação 2"]
}`;

    const userPrompt = `## Cenário Clínico
${scenario?.scenario_content || "Não disponível."}

## Contribuições por Passo
${contributionsSummary || "Nenhuma contribuição ainda."}

## Chat Recente (últimas 30 mensagens)
${chatSummary || "Sem mensagens."}`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Add credits." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error("Failed to parse AI cotutor response:", content);
      parsed = { questions: [], mentions: [], observations: [content] };
    }

    return new Response(
      JSON.stringify({ mode: "suggestions", ...parsed }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("ai-cotutor error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
