import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
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
    console.error("oracle-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
