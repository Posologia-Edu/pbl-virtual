import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
