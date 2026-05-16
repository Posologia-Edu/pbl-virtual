import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRADES: Record<string, number> = { O: 0, I: 25, PS: 50, S: 75, MS: 100 };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { room_id } = await req.json();
    if (!room_id) throw new Error("room_id is required");

    const { data: room } = await supabase
      .from("rooms")
      .select("id, group_id, name, groups(name, module_id)")
      .eq("id", room_id)
      .single();
    if (!room) throw new Error("Room not found");

    const { data: members } = await supabase
      .from("group_members")
      .select("student_id, profiles!group_members_student_id_profiles_fkey(full_name)")
      .eq("group_id", room.group_id);

    const studentIds = (members || []).map((m: any) => m.student_id);
    if (studentIds.length === 0) {
      return new Response(JSON.stringify({ error: "Sem alunos no grupo." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const moduleId = (room.groups as any)?.module_id ?? null;

    const [evalsRes, peerRes, chatRes, stepsRes, attRes, sessRes, objRes, objSessRes, aiUsageRes, critRes] = await Promise.all([
      supabase.from("evaluations").select("student_id, grade, problem_number, criterion_id").eq("room_id", room_id).eq("archived", true).in("student_id", studentIds),
      supabase.from("peer_evaluations").select("target_id, grade").eq("room_id", room_id).in("target_id", studentIds),
      supabase.from("chat_messages").select("user_id").eq("room_id", room_id).in("user_id", studentIds),
      supabase.from("step_items").select("author_id, step").eq("room_id", room_id).in("author_id", studentIds),
      supabase.from("attendance").select("student_id, session_id").eq("room_id", room_id).in("student_id", studentIds),
      supabase.from("tutorial_sessions").select("id").eq("room_id", room_id),
      moduleId ? supabase.from("learning_objectives").select("id, content, is_essential").eq("module_id", moduleId) : Promise.resolve({ data: [] as any[] }),
      supabase.from("objective_sessions").select("objective_id, session_id"),
      supabase.from("ai_usage_log").select("user_id, prompt_type, created_at").in("user_id", studentIds).gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
      supabase.from("evaluation_criteria").select("id, label, phase").eq("room_id", room_id),
    ]);

    const totalSessions = sessRes.data?.length || 1;
    const sessionIds = new Set((sessRes.data || []).map((s: any) => s.id));
    const objectives = (objRes.data || []) as any[];
    const objSessByObj: Record<string, number> = {};
    (objSessRes.data || []).forEach((os: any) => {
      if (sessionIds.has(os.session_id)) objSessByObj[os.objective_id] = (objSessByObj[os.objective_id] || 0) + 1;
    });
    const objectivesCovered = objectives.filter(o => (objSessByObj[o.id] || 0) > 0).length;
    const essentialPending = objectives.filter(o => o.is_essential && !(objSessByObj[o.id] > 0)).map(o => o.content);

    // Criterion difficulty (lowest avg by criterion)
    const criteria = (critRes.data || []) as any[];
    const critScores: Record<string, number[]> = {};
    (evalsRes.data || []).forEach((e: any) => {
      if (!e.grade || GRADES[e.grade] === undefined) return;
      (critScores[e.criterion_id] ||= []).push(GRADES[e.grade]);
    });
    const criterionDifficulty = criteria.map((c: any) => {
      const arr = critScores[c.id] || [];
      const avg = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
      return { label: c.label, phase: c.phase, avg, samples: arr.length };
    }).filter(c => c.avg !== null).sort((a, b) => (a.avg! - b.avg!));

    const students = (members || []).map((m: any) => {
      const sid = m.student_id;
      const name = (m.profiles as any)?.full_name || "Sem nome";
      const evals = (evalsRes.data || []).filter((e: any) => e.student_id === sid && e.grade);
      const evalAvg = evals.length ? Math.round(evals.reduce((s: number, e: any) => s + (GRADES[e.grade] ?? 0), 0) / evals.length) : null;
      const peers = (peerRes.data || []).filter((e: any) => e.target_id === sid && e.grade);
      const peerAvg = peers.length ? Math.round(peers.reduce((s: number, e: any) => s + (GRADES[e.grade] ?? 0), 0) / peers.length) : null;
      const chatCount = (chatRes.data || []).filter((c: any) => c.user_id === sid).length;
      const stepCount = (stepsRes.data || []).filter((s: any) => s.author_id === sid).length;
      const attCount = (attRes.data || []).filter((a: any) => a.student_id === sid).length;
      const attendanceRate = Math.round((attCount / totalSessions) * 100);
      const aiCount = (aiUsageRes.data || []).filter((a: any) => a.user_id === sid).length;
      return { name, evalAvg, peerAvg, chatCount, stepCount, attendanceRate, aiCount };
    });

    const groupEvalAvg = (() => {
      const vals = students.map(s => s.evalAvg).filter((v): v is number => v !== null);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    })();
    const groupAttRate = Math.round(students.reduce((a, s) => a + s.attendanceRate, 0) / Math.max(students.length, 1));
    const groupChatAvg = Math.round(students.reduce((a, s) => a + s.chatCount, 0) / Math.max(students.length, 1));
    const groupAiAvg = Math.round(students.reduce((a, s) => a + s.aiCount, 0) / Math.max(students.length, 1));

    const metrics = {
      groupEvalAvg,
      groupAttRate,
      groupChatAvg,
      groupAiAvg,
      totalSessions,
      totalObjectives: objectives.length,
      objectivesCovered,
      essentialPending,
      criterionDifficulty: criterionDifficulty.slice(0, 5),
      students,
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let insights: any = null;
    let aiPowered = false;

    if (LOVABLE_API_KEY) {
      const studentBlock = students.map(s => `- ${s.name}: nota=${s.evalAvg ?? 'N/A'}%, frequência=${s.attendanceRate}%, chat=${s.chatCount}, contribuições=${s.stepCount}, IA=${s.aiCount}`).join("\n");
      const critBlock = criterionDifficulty.slice(0, 5).map(c => `- ${c.label} (${c.phase}): ${c.avg}%`).join("\n") || "- (sem dados)";
      const objBlock = essentialPending.length ? essentialPending.slice(0, 8).map(o => `- ${o}`).join("\n") : "- (todos cobertos)";

      const systemPrompt = `Você é um consultor pedagógico especializado em Aprendizagem Baseada em Problemas (PBL).
Analise os dados agregados do grupo e produza insights práticos para o tutor otimizar as próximas sessões.
Foque em padrões de dificuldade, lacunas de cobertura, engajamento e diferenças individuais. Seja específico e acionável. Sempre em português.`;

      const userPrompt = `Sala: ${room.name}
Sessões realizadas: ${totalSessions}
Média do grupo: ${groupEvalAvg ?? 'N/A'}% | Frequência: ${groupAttRate}% | Chat médio: ${groupChatAvg} msgs | IA média: ${groupAiAvg} usos

Critérios com pior desempenho:
${critBlock}

Objetivos essenciais pendentes:
${objBlock}

Alunos:
${studentBlock}

Retorne JSON com: summary (parágrafo curto sobre o estado do grupo), strengths (lista de pontos fortes), difficulty_patterns (lista de padrões de dificuldade identificados), interventions (lista de 4 a 6 intervenções pedagógicas específicas e acionáveis para as próximas sessões), next_session_focus (lista de 2 a 4 focos prioritários para a próxima sessão).`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          tools: [{
            type: "function",
            function: {
              name: "tutor_insights",
              description: "Insights pedagógicos para o tutor",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  strengths: { type: "array", items: { type: "string" } },
                  difficulty_patterns: { type: "array", items: { type: "string" } },
                  interventions: { type: "array", items: { type: "string" } },
                  next_session_focus: { type: "array", items: { type: "string" } },
                },
                required: ["summary", "strengths", "difficulty_patterns", "interventions", "next_session_focus"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "tutor_insights" } },
        }),
      });

      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições de IA excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (aiResp.ok) {
        const aiData = await aiResp.json();
        const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (tc?.function?.arguments) {
          insights = JSON.parse(tc.function.arguments);
          aiPowered = true;
          await supabase.from("ai_usage_log").insert({
            user_id: user.id,
            provider: "lovable-gateway",
            model: "google/gemini-3-flash-preview",
            prompt_type: "tutor-insights",
            tokens_input: aiData.usage?.prompt_tokens ?? 0,
            tokens_output: aiData.usage?.completion_tokens ?? 0,
            estimated_cost_usd: ((aiData.usage?.prompt_tokens ?? 0) * 0.00001 + (aiData.usage?.completion_tokens ?? 0) * 0.00004),
          });
        }
      }
    }

    if (!insights) {
      const difficulty: string[] = [];
      if (criterionDifficulty[0] && criterionDifficulty[0].avg! < 60) {
        difficulty.push(`Critério "${criterionDifficulty[0].label}" com desempenho baixo (${criterionDifficulty[0].avg}%).`);
      }
      if (groupAttRate < 75) difficulty.push(`Frequência do grupo abaixo do esperado (${groupAttRate}%).`);
      if (groupChatAvg < 3) difficulty.push("Baixo engajamento no chat coletivo.");
      const interventions: string[] = [];
      if (essentialPending.length) interventions.push(`Retomar ${essentialPending.length} objetivo(s) essencial(is) ainda pendente(s).`);
      if (criterionDifficulty[0]) interventions.push(`Trabalhar especificamente "${criterionDifficulty[0].label}" na abertura da próxima sessão.`);
      const silent = students.filter(s => s.chatCount === 0).map(s => s.name);
      if (silent.length) interventions.push(`Estimular participação de: ${silent.slice(0, 3).join(", ")}.`);
      insights = {
        summary: `Grupo com média ${groupEvalAvg ?? 'N/A'}% e frequência ${groupAttRate}% ao longo de ${totalSessions} sessões.`,
        strengths: groupEvalAvg && groupEvalAvg >= 75 ? ["Desempenho geral acima da média"] : [],
        difficulty_patterns: difficulty,
        interventions,
        next_session_focus: criterionDifficulty.slice(0, 2).map(c => `Reforçar ${c.label}`),
      };
    }

    return new Response(JSON.stringify({ metrics, insights, ai_powered: aiPowered, room_name: room.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tutor-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
