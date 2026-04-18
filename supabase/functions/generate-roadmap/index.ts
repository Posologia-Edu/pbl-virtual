import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDER_ENDPOINTS: Record<string, { url: string; format: "openai" | "anthropic"; defaultModel: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", format: "openai", defaultModel: "gpt-4o-mini" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", format: "openai", defaultModel: "llama-3.3-70b-versatile" },
  anthropic: { url: "https://api.anthropic.com/v1/messages", format: "anthropic", defaultModel: "claude-sonnet-4-20250514" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", format: "openai", defaultModel: "google/gemini-2.5-flash" },
  google: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", format: "openai", defaultModel: "gemini-2.5-flash" },
};

const PROPOSE_FEATURES_TOOL = {
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
};

type RoadmapFeature = { title: string; description: string; priority: string };

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function generateWithProvider(provider: string, apiKey: string, systemPrompt: string, userPrompt: string): Promise<RoadmapFeature[] | null> {
  const config = PROVIDER_ENDPOINTS[provider];
  if (!config || config.format !== "openai") return null;

  try {
    console.log(`[generate-roadmap] Trying provider: ${provider}`);
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [PROPOSE_FEATURES_TOOL],
        tool_choice: { type: "function", function: { name: "propose_features" } },
      }),
    });

    if (!response.ok) {
      console.error(`[generate-roadmap] ${provider} error:`, response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return null;

    const parsed = JSON.parse(toolCall.function.arguments);
    return Array.isArray(parsed?.features) ? parsed.features : null;
  } catch (error) {
    console.error(`[generate-roadmap] ${provider} exception:`, error);
    return null;
  }
}

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

const IMPLEMENTED_FEATURES = `
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
- Pipeline de Atualizações (Roadmap + Changelog)
`.trim();

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: existing } = await admin
      .from("pipeline_updates")
      .select("title, status")
      .order("created_at", { ascending: false })
      .limit(500);

    const existingTitles = (existing || []).map((u: any) => `- ${u.title} [${u.status}]`).join("\n") || "(nenhum)";

    const userPrompt = `## Funcionalidades JÁ IMPLEMENTADAS no sistema (NÃO repita nada parecido):
${IMPLEMENTED_FEATURES}

## Itens JÁ presentes no Roadmap ou Changelog (NÃO repita):
${existingTitles}

Agora proponha as 5 NOVAS funcionalidades de alto impacto, contextualizadas ao PBL e complementares ao que já existe.`;

    const { data: providerKeys } = await admin
      .from("ai_provider_keys")
      .select("provider, api_key, is_active")
      .is("institution_id", null)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    let features: RoadmapFeature[] = [];

    if (providerKeys?.length) {
      for (const pk of providerKeys) {
        if (!pk.api_key) continue;
        const providerFeatures = await generateWithProvider(pk.provider, pk.api_key, SYSTEM_PROMPT, userPrompt);
        if (providerFeatures?.length) {
          console.log(`[generate-roadmap] Generated with provider: ${pk.provider}`);
          features = providerFeatures;
          break;
        }
        console.log(`[generate-roadmap] Provider ${pk.provider} failed, trying next...`);
      }
    }

    if (features.length === 0) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          tools: [PROPOSE_FEATURES_TOOL],
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
          return new Response(JSON.stringify({ error: "Créditos de IA insuficientes e nenhuma chave externa ativa conseguiu responder." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Falha no AI gateway");
      }

      const aiData = await aiRes.json();
      const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) throw new Error("IA não retornou propostas");

      const parsed = JSON.parse(toolCall.function.arguments);
      features = parsed.features || [];
    }

    if (!Array.isArray(features) || features.length === 0) throw new Error("IA retornou lista vazia");

    const existingNorm = (existing || []).map((u: any) => normalizeText(u.title));
    const implementedNorm = IMPLEMENTED_FEATURES.split("\n")
      .map((line) => normalizeText(line.replace(/^-\s*/, "")))
      .filter(Boolean);
    const seenTitles = new Set<string>();
    const fresh = features.filter((f) => {
      const t = normalizeText(f.title || "");
      if (!t || seenTitles.has(t)) return false;
      seenTitles.add(t);
      const existsInRoadmap = existingNorm.some((e) => e === t || e.includes(t) || t.includes(e));
      const existsInImplemented = implementedNorm.some((e) => e.includes(t));
      return !existsInRoadmap && !existsInImplemented;
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
