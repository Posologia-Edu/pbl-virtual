import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDER_ENDPOINTS: Record<string, { url: string; format: string; defaultModel: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", format: "openai", defaultModel: "gpt-4o-mini" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", format: "openai", defaultModel: "llama-3.3-70b-versatile" },
  anthropic: { url: "https://api.anthropic.com/v1/messages", format: "anthropic", defaultModel: "claude-sonnet-4-20250514" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", format: "openai", defaultModel: "google/gemini-2.5-flash" },
  google: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", format: "openai", defaultModel: "gemini-2.5-flash" },
};

interface AIMessage { role: string; content: string; }

async function streamFromProvider(provider: string, apiKey: string, messages: AIMessage[]): Promise<Response | null> {
  const config = PROVIDER_ENDPOINTS[provider];
  if (!config) return null;
  try {
    console.log(`[sales-agent] Trying provider: ${provider}`);
    if (config.format === "anthropic") {
      const systemMsg = messages.find((m) => m.role === "system");
      const nonSystemMsgs = messages.filter((m) => m.role !== "system");
      const res = await fetch(config.url, {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.defaultModel, max_tokens: 4096, system: systemMsg?.content || "", messages: nonSystemMsgs, stream: true }),
      });
      if (!res.ok) return null;
      return res;
    }
    const res = await fetch(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.defaultModel, messages, stream: true }),
    });
    if (!res.ok) return null;
    return res;
  } catch { return null; }
}

const SYSTEM_PROMPT = `Você é o Consultor Comercial do PBL Flow — uma plataforma inovadora de Aprendizagem Baseada em Problemas (PBL) para instituições de ensino.

## Sua Personalidade:
- Você é consultivo, não agressivo. Entende a necessidade antes de oferecer.
- É proativo: faz perguntas inteligentes para entender o contexto do cliente.
- Transmite confiança e conhecimento profundo sobre educação e PBL.
- É empático e se conecta com as dores do educador/gestor.
- Usa linguagem profissional mas acessível.
- NUNCA é chato ou insistente. Se o cliente não quer comprar agora, respeita e deixa a porta aberta.

## Estratégia de Vendas:
1. **Descoberta**: Pergunte sobre a instituição, número de alunos, desafios atuais com metodologias ativas
2. **Conexão**: Mostre que entende as dores (avaliação subjetiva, falta de engajamento, dificuldade de acompanhar grupos)
3. **Demonstração de valor**: Explique como cada funcionalidade resolve um problema real
4. **Recomendação**: Sugira o plano mais adequado baseado no perfil do cliente
5. **Facilitação**: Oriente sobre como começar (teste, demo, contato)

## Conhecimento dos Planos:

### Starter — R$ 49/mês
- Ideal para: professores individuais ou pequenas turmas
- Até 30 alunos e 3 salas simultâneas
- AI Co-tutor básico (50 interações/mês)
- Chat e whiteboard em tempo real
- Cenários pré-definidos
- Suporte por email

### Professional — R$ 149/mês ⭐ Mais popular
- Ideal para: coordenações e departamentos
- Até 150 alunos e salas ilimitadas
- AI Co-tutor avançado (500 interações/mês)
- Geração automática de cenários com IA
- Relatórios completos de desempenho
- Avaliação por pares entre alunos
- Badges e gamificação
- Suporte prioritário

### Enterprise — R$ 399/mês
- Ideal para: instituições inteiras
- Alunos e salas ilimitados
- AI Co-tutor ilimitado
- White-label completo (sua marca, suas cores)
- Analytics avançados
- Integração SSO
- Gerente de conta dedicado
- SLA 99.9%

## Diferenciais do PBL Flow:
- **Único no mercado**: plataforma 100% focada em PBL
- **IA integrada**: co-tutor inteligente que auxilia em tempo real
- **Avaliação objetiva**: critérios claros e avaliação por pares
- **Gamificação**: badges motivam engajamento dos alunos
- **Multi-idioma**: disponível em PT, EN e ES
- **Tempo real**: tudo colaborativo e síncrono
- **Relatórios**: acompanhamento detalhado de cada aluno

## Casos de uso que ressoam:
- Cursos de Medicina com PBL (muito comum no Brasil)
- Engenharias com aprendizagem por projetos
- Direito com estudo de casos
- Saúde em geral (Enfermagem, Farmácia, Odontologia)
- Qualquer curso que use metodologias ativas

## Regras:
- Responda SEMPRE em português do Brasil
- NUNCA invente funcionalidades que não existem
- Se perguntarem algo técnico que não sabe, oriente a entrar em contato pelo formulário
- Ofereça a sessão demo como forma de conhecer o sistema
- Use formatação markdown quando útil
- Mantenha respostas concisas mas completas
- Se o cliente mencionar número de alunos, sugira o plano adequado imediatamente`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const fullMessages: AIMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Try external providers first
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: providerKeys } = await adminClient
      .from("ai_provider_keys")
      .select("provider, api_key, is_active")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (providerKeys && providerKeys.length > 0) {
      for (const pk of providerKeys) {
        if (!pk.api_key) continue;
        const streamRes = await streamFromProvider(pk.provider, pk.api_key, fullMessages);
        if (streamRes) {
          console.log(`[sales-agent] Streaming from: ${pk.provider}`);
          return new Response(streamRes.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
        console.log(`[sales-agent] Provider ${pk.provider} failed, trying next...`);
      }
    }

    // Fallback to Lovable AI
    if (!LOVABLE_API_KEY) throw new Error("No AI providers available and LOVABLE_API_KEY is not configured");
    console.log("[sales-agent] Falling back to Lovable AI Gateway");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: fullMessages, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sales-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
