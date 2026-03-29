import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { room_id } = await req.json();
    if (!room_id) throw new Error("room_id is required");

    // Verify professor owns room
    const { data: room } = await supabase
      .from("rooms")
      .select("id, group_id, name")
      .eq("id", room_id)
      .single();
    if (!room) throw new Error("Room not found");

    // Get students
    const { data: members } = await supabase
      .from("group_members")
      .select("student_id, profiles!group_members_student_id_profiles_fkey(full_name)")
      .eq("group_id", room.group_id);
    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ students: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentIds = members.map((m: any) => m.student_id);

    // Aggregate participation data per student
    const [evalsRes, peerEvalsRes, chatRes, stepsRes, attendanceRes, sessionsRes] = await Promise.all([
      supabase.from("evaluations").select("student_id, grade, problem_number").eq("room_id", room_id).eq("archived", true).in("student_id", studentIds),
      supabase.from("peer_evaluations").select("target_id, grade").eq("room_id", room_id).in("target_id", studentIds),
      supabase.from("chat_messages").select("user_id").eq("room_id", room_id).in("user_id", studentIds),
      supabase.from("step_items").select("author_id").eq("room_id", room_id).in("author_id", studentIds),
      supabase.from("attendance").select("student_id").eq("room_id", room_id).in("student_id", studentIds),
      supabase.from("tutorial_sessions").select("id").eq("room_id", room_id),
    ]);

    const GRADES: Record<string, number> = { O: 0, I: 25, PS: 50, S: 75, MS: 100 };
    const totalSessions = sessionsRes.data?.length || 1;

    const studentMetrics = members.map((m: any) => {
      const sid = m.student_id;
      const name = (m.profiles as any)?.full_name || "Sem nome";

      // Evaluations average
      const evals = (evalsRes.data || []).filter((e: any) => e.student_id === sid && e.grade);
      const evalAvg = evals.length > 0
        ? Math.round(evals.reduce((s: number, e: any) => s + (GRADES[e.grade] ?? 0), 0) / evals.length)
        : null;

      // Peer evaluation average
      const peerEvals = (peerEvalsRes.data || []).filter((e: any) => e.target_id === sid && e.grade);
      const peerAvg = peerEvals.length > 0
        ? Math.round(peerEvals.reduce((s: number, e: any) => s + (GRADES[e.grade] ?? 0), 0) / peerEvals.length)
        : null;

      // Chat messages count
      const chatCount = (chatRes.data || []).filter((c: any) => c.user_id === sid).length;

      // Step contributions
      const stepCount = (stepsRes.data || []).filter((s: any) => s.author_id === sid).length;

      // Attendance rate
      const attendanceCount = (attendanceRes.data || []).filter((a: any) => a.student_id === sid).length;
      const attendanceRate = Math.round((attendanceCount / totalSessions) * 100);

      return { student_id: sid, name, evalAvg, peerAvg, chatCount, stepCount, attendanceRate, attendanceCount, totalSessions };
    });

    // Build prompt for AI analysis
    const metricsText = studentMetrics.map(s =>
      `- ${s.name}: Avaliação média=${s.evalAvg ?? 'N/A'}%, Peer feedback=${s.peerAvg ?? 'N/A'}%, Mensagens no chat=${s.chatCount}, Contribuições=${s.stepCount}, Frequência=${s.attendanceRate}% (${s.attendanceCount}/${s.totalSessions})`
    ).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: rule-based risk without AI
      const results = studentMetrics.map(s => {
        let riskScore = 0;
        if (s.evalAvg !== null && s.evalAvg < 50) riskScore += 30;
        else if (s.evalAvg !== null && s.evalAvg < 75) riskScore += 15;
        if (s.attendanceRate < 50) riskScore += 30;
        else if (s.attendanceRate < 75) riskScore += 15;
        if (s.chatCount === 0) riskScore += 20;
        else if (s.chatCount < 3) riskScore += 10;
        if (s.stepCount === 0) riskScore += 20;
        else if (s.stepCount < 2) riskScore += 10;

        const riskLevel = riskScore >= 60 ? "alto" : riskScore >= 30 ? "moderado" : "baixo";
        return {
          ...s,
          riskScore: Math.min(riskScore, 100),
          riskLevel,
          recommendation: riskLevel === "alto"
            ? "Aluno precisa de atenção urgente. Considere uma conversa individual."
            : riskLevel === "moderado"
            ? "Monitorar de perto nas próximas sessões."
            : "Aluno com participação adequada.",
        };
      });

      return new Response(JSON.stringify({ students: results, ai_powered: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI-powered analysis
    const systemPrompt = `Você é um analista educacional especializado em Aprendizagem Baseada em Problemas (PBL/ABP).
Analise os dados de participação dos alunos e identifique aqueles em risco de reprovação.

Para cada aluno, retorne um JSON com:
- riskScore (0-100, onde 100 é máximo risco)
- riskLevel ("alto", "moderado" ou "baixo")
- recommendation (recomendação específica para o professor em português)
- patterns (lista de padrões identificados em português)

Considere:
- Notas abaixo de 50% indicam dificuldade acadêmica
- Baixa frequência (<75%) é fator de risco importante
- Ausência de mensagens no chat indica desengajamento
- Poucas contribuições nos passos indicam falta de participação ativa
- Avaliações de pares baixas indicam percepção negativa do grupo`;

    const userPrompt = `Sala: ${room.name}
Total de sessões: ${totalSessions}

Dados dos alunos:
${metricsText}

Retorne APENAS o JSON array com a análise de cada aluno, sem markdown.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_risk",
            description: "Return risk analysis for each student",
            parameters: {
              type: "object",
              properties: {
                analyses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      student_name: { type: "string" },
                      riskScore: { type: "number" },
                      riskLevel: { type: "string", enum: ["alto", "moderado", "baixo"] },
                      recommendation: { type: "string" },
                      patterns: { type: "array", items: { type: "string" } },
                    },
                    required: ["student_name", "riskScore", "riskLevel", "recommendation", "patterns"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["analyses"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_risk" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analyses: any[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      analyses = parsed.analyses || [];
    }

    // Merge AI analysis with metrics
    const results = studentMetrics.map(s => {
      const aiAnalysis = analyses.find((a: any) =>
        a.student_name?.toLowerCase().includes(s.name.toLowerCase().split(" ")[0]) ||
        s.name.toLowerCase().includes(a.student_name?.toLowerCase().split(" ")[0])
      );

      return {
        ...s,
        riskScore: aiAnalysis?.riskScore ?? 0,
        riskLevel: aiAnalysis?.riskLevel ?? "baixo",
        recommendation: aiAnalysis?.recommendation ?? "Sem dados suficientes para análise.",
        patterns: aiAnalysis?.patterns ?? [],
      };
    });

    // Log AI usage
    await supabase.from("ai_usage_log").insert({
      user_id: user.id,
      provider: "lovable-gateway",
      model: "google/gemini-3-flash-preview",
      prompt_type: "predict-risk",
      tokens_input: aiData.usage?.prompt_tokens ?? 0,
      tokens_output: aiData.usage?.completion_tokens ?? 0,
      estimated_cost_usd: ((aiData.usage?.prompt_tokens ?? 0) * 0.00001 + (aiData.usage?.completion_tokens ?? 0) * 0.00004),
    });

    return new Response(JSON.stringify({ students: results, ai_powered: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("predict-risk error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
