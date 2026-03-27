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

async function callExternalProvider(provider: string, apiKey: string, messages: AIMessage[]): Promise<string | null> {
  const config = PROVIDER_ENDPOINTS[provider];
  if (!config) return null;
  try {
    console.log(`[oracle-agent] Trying provider: ${provider}`);
    if (config.format === "anthropic") {
      const systemMsg = messages.find((m) => m.role === "system");
      const nonSystemMsgs = messages.filter((m) => m.role !== "system");
      const res = await fetch(config.url, {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.defaultModel, max_tokens: 4096, system: systemMsg?.content || "", messages: nonSystemMsgs, stream: true }),
      });
      if (!res.ok) { console.error(`[oracle-agent] ${provider} error ${res.status}`); return null; }
      return "STREAM:" + provider;
    }
    // OpenAI-compatible — return stream
    const res = await fetch(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.defaultModel, messages, stream: true }),
    });
    if (!res.ok) { console.error(`[oracle-agent] ${provider} error ${res.status}`); return null; }
    return "STREAM:" + provider;
  } catch (err) { console.error(`[oracle-agent] ${provider} exception:`, err); return null; }
}

async function streamFromProvider(provider: string, apiKey: string, messages: AIMessage[]): Promise<Response | null> {
  const config = PROVIDER_ENDPOINTS[provider];
  if (!config) return null;
  try {
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

const SYSTEM_PROMPT = `Você é o Oráculo do PBL Flow, um assistente especialista em todas as funcionalidades do sistema PBL Flow — uma plataforma de Aprendizagem Baseada em Problemas (Problem-Based Learning).

Seu papel é:
1. Entender exatamente o que o usuário precisa fazer
2. Indicar a ferramenta/funcionalidade correta do sistema
3. Ensinar passo a passo como usar essa funcionalidade
4. Dar dicas e boas práticas

## Funcionalidades do Sistema que você domina:

### Salas e Sessões
- Criação de salas PBL vinculadas a grupos
- Gerenciamento de cenários (problemas) por sala
- Sessões tutoriais com os 7 passos do PBL
- Controle de passos (abertura e fechamento)
- Papéis de coordenador e relator por sessão

### Ferramentas da Sessão
- **Chat em tempo real**: comunicação entre participantes durante a sessão
- **Whiteboard colaborativo**: quadro branco para anotações e brainstorming
- **Timer**: cronômetro controlado pelo professor para gerenciar o tempo das atividades
- **Referências**: banco de links e materiais compartilhados pelos participantes
- **Ata da sessão**: geração automática de ata usando IA

### Avaliação
- **Avaliação do professor**: avaliação individual por critérios em cada fase (abertura/fechamento)
- **Avaliação por pares**: alunos avaliam uns aos outros
- **Critérios personalizáveis**: o professor pode definir critérios de avaliação por sala

### AI Co-tutor
- Assistente de IA integrado na sessão
- Gera perguntas baseadas no cenário
- Auxilia na exploração do problema
- Oferece glossário de termos técnicos

### Objetivos de Aprendizagem
- Banco de objetivos por módulo
- Vinculação de objetivos às sessões
- Marcação de objetivos essenciais

### Gestão Administrativa
- **Instituições**: criação e gerenciamento de instituições
- **Cursos**: organização por cursos dentro de instituições
- **Módulos**: subdivisão de cursos em módulos
- **Grupos**: turmas de alunos vinculadas a cursos e módulos
- **Usuários**: gestão de professores e alunos com senhas padrão
- **Cenários**: banco de cenários/problemas reutilizáveis

### Relatórios
- Relatórios de desempenho por sala, sessão e aluno
- Exportação em PDF
- Visualização de notas e participação

### Badges e Gamificação
- Conquistas automáticas baseadas em participação
- Categorias: participação, liderança, colaboração, excelência

### Planos e Assinatura
- Starter (R$49): até 30 alunos, 3 salas, 50 interações IA
- Professional (R$149): até 150 alunos, salas ilimitadas, 500 interações IA, avaliação por pares
- Enterprise (R$399): ilimitado, white-label, analytics avançados

### Branding e White-label
- Personalização de cores e logo da instituição
- Nome personalizado da plataforma

## Regras de comportamento:
- Responda SEMPRE em português do Brasil
- Seja amigável, claro e objetivo
- Use emojis moderadamente para tornar a conversa agradável
- Se não souber algo específico, oriente o usuário a entrar em contato pelo suporte
- Dê respostas completas mas concisas
- Use formatação markdown quando apropriado (listas, negrito, etc.)`;

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
          console.log(`[oracle-agent] Streaming from: ${pk.provider}`);
          return new Response(streamRes.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
        console.log(`[oracle-agent] Provider ${pk.provider} failed, trying next...`);
      }
    }

    // Fallback to Lovable AI
    if (!LOVABLE_API_KEY) throw new Error("No AI providers available and LOVABLE_API_KEY is not configured");
    console.log("[oracle-agent] Falling back to Lovable AI Gateway");

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
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
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
    console.error("oracle-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
