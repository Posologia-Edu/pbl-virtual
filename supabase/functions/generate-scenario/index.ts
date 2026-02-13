import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? serviceRoleKey;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles").select("role")
      .eq("user_id", caller.id).eq("role", "admin").single();
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { objectives } = await req.json();
    if (!objectives || typeof objectives !== "string" || objectives.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Objetivos de aprendizagem são obrigatórios (mínimo 5 caracteres)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Objetivos de aprendizagem:\n${objectives.trim()}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar cenário com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from the AI response
    let parsed;
    try {
      // Try to extract JSON from possible markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Erro ao processar resposta da IA. Tente novamente." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      scenario: parsed.scenario || "",
      glossary: parsed.glossary || [],
      questions: parsed.questions || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-scenario error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
