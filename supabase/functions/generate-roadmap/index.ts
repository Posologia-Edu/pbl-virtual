import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um Product Manager sênior especialista em plataformas EdTech de Aprendizagem Baseada em Problemas (PBL) para área da saúde.

Sua tarefa: propor EXATAMENTE 5 novas funcionalidades de ALTO IMPACTO para o sistema PBL Flow / PBL Virtual.

## REGRAS CRÍTICAS (não negociáveis):
1. **NUNCA proponha algo já existente** no sistema (lista abaixo) ou já no roadmap/changelog (lista abaixo)
2. **NUNCA proponha funcionalidades genéricas** tipo "modo escuro", "exportação CSV", "notificações push", "tradução para outros idiomas", "PWA mobile", "backup", "acessibilidade", "fórum"
3. **Seja contextualizado ao PBL**: as 5 funcionalidades devem AGREGAR ao fluxo PBL existente (7 passos, sessões tutoriais, avaliação por critérios, co-tutor IA, badges, planejamento semestral, etc.)
4. **Sejam complementares**: cada funcionalidade deve PREENCHER UMA LACUNA real, conectando-se a algo que já existe e amplificando seu valor — nunca isolada
5. **Alto impacto pedagógico ou administrativo**: deve resolver dor real de professor, aluno ou gestor de instituição
6. **Inovadoras**: priorize funcionalidades com IA, automação inteligente, analytics avançados, integrações que extraem valor de dados já coletados

## Para cada funcionalidade retorne:
- title: Nome curto e direto (máx 60 chars)
- description: 1-2 frases que explicam O QUE faz, COM QUE recurso existente se conecta, e QUAL valor entrega (máx 250 chars)
- priority: "alta" | "media" | "baixa" (a maioria deve ser "alta" ou "media")

Responda APENAS via tool call, em português do Brasil.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch existing roadmap + changelog so the AI doesn't repeat
    const { data: existing } = await admin
      .from("pipeline_updates")
      .select("title, status")
      .order("created_at", { ascending: false })
      .limit(500);

    const existingTitles = (existing || []).map((u: any) => `- ${u.title} [${u.status}]`).join("\n") || "(nenhum)";

    // Inventory of features actually implemented in the system (from memory + codebase)
    const implementedFeatures = `
- Salas PBL com cenários múltiplos e sessões tutoriais isoladas (7 passos do PBL)
- Chat em tempo real, Whiteboard colaborativo, Timer controlado pelo coordenador
- Banco de Referências com upload de arquivos e busca em PubMed/SciELO
- Geração automática de Ata da sessão com IA + exportação PDF
- Avaliação por critérios customizáveis (abertura/fechamento) e Avaliação por Pares
- Banco de Objetivos de Aprendizagem por módulo
- AI Co-tutor integrado à sessão (perguntas guiadas + glossário)
- Badges e gamificação automática (participação, liderança, colaboração, excelência)
- Painel de Frequência automatizada (geolocalização e QR Code)
- Planejamento de Semestre com calendário interativo
- Dashboard personalizado do Aluno (Meu Painel) com progresso, notas, feedback de pares e badges
- Análise Preditiva de Risco com IA (identifica alunos em risco)
- API Pública REST (/v1/) para integrações externas com SIS/LMS, autenticada por API keys
- Gestão multi-tenant: Instituições, Cursos, Módulos, Grupos, Usuários, Cenários
- Branding white-label (cores, logo, nome da plataforma)
- Sistema de assinaturas Stripe (Starter, Professional, Enterprise) com auto-gestão
- Painel admin com Analytics multi-dimensão (Visitantes, IA, Plataforma, Engajamento)
- Dashboard Financeiro do superadmin
- Gestão de chaves de API de provedores de IA (OpenAI, Groq, Anthropic, OpenRouter, Google) + fallback Lovable AI Gateway
- Rastreamento de consumo de IA por instituição (limites mensais)
- Convites de administradores institucionais com plano pré-atribuído
- Onboarding com sessão demo
- Login com Google OAuth + senhas efêmeras
- Formulário de contato (Resend)
- Agentes IA flutuantes: Oráculo (suporte interno) e Consultor de Vendas (landing)
- Cookie consent LGPD/GDPR + Visitor Analytics
- Pipeline de Atualizações (Roadmap + Changelog) — VOCÊ ESTÁ PROPONDO PARA ELE
`.trim();

    const userPrompt = `## Funcionalidades JÁ IMPLEMENTADAS no sistema (NÃO repita nada parecido):
${implementedFeatures}

## Itens JÁ presentes no Roadmap ou Changelog (NÃO repita):
${existingTitles}

Agora proponha as 5 NOVAS funcionalidades de alto impacto, contextualizadas ao PBL e complementares ao que já existe.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "propose_features",
              description: "Retorne exatamente 5 propostas de funcionalidades novas, contextualizadas e complementares.",
              parameters: {
                type: "object",
                properties: {
                  features: {
                    type: "array",
                    minItems: 5,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", maxLength: 80 },
                        description: { type: "string", maxLength: 300 },
                        priority: { type: "string", enum: ["alta", "media", "baixa"] },
                      },
                      required: ["title", "description", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["features"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "propose_features" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Falha no AI gateway");
    }

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("IA não retornou propostas");

    const parsed = JSON.parse(toolCall.function.arguments);
    const features: Array<{ title: string; description: string; priority: string }> = parsed.features || [];
    if (!Array.isArray(features) || features.length === 0) throw new Error("IA retornou lista vazia");

    // Filter against existing titles (defensive — case-insensitive substring match)
    const existingNorm = (existing || []).map((u: any) => u.title.toLowerCase().trim());
    const fresh = features.filter((f) => {
      const t = f.title.toLowerCase().trim();
      return !existingNorm.some((e) => e === t || e.includes(t) || t.includes(e));
    });

    if (fresh.length === 0) {
      return new Response(
        JSON.stringify({ inserted: 0, message: "A IA propôs apenas itens já presentes. Tente novamente." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const batchDate = new Date().toISOString().split("T")[0];
    const inserts = fresh.map((f) => ({
      title: f.title,
      description: f.description,
      priority: ["alta", "media", "baixa"].includes(f.priority) ? f.priority : "media",
      status: "roadmap",
      is_auto_generated: true,
      batch_date: batchDate,
    }));

    const { error: insErr } = await admin.from("pipeline_updates").insert(inserts as any);
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ inserted: inserts.length, features: fresh }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-roadmap error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// @ts-ignore - Deno global
declare const Deno: any;
// @ts-ignore - serve from Deno std
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
