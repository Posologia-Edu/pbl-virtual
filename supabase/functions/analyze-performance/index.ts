import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRADE_MAP: Record<string, number> = { O: 0, I: 25, PS: 50, S: 75, MS: 100 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { group_id, student_id } = body || {};
    if (!group_id && !student_id) {
      return new Response(JSON.stringify({ error: "group_id or student_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve student set + module/course context from group
    let studentIds: string[] = [];
    let moduleId: string | null = null;
    let courseId: string | null = null;

    if (group_id) {
      const { data: g } = await admin.from("groups").select("id, module_id, course_id").eq("id", group_id).maybeSingle();
      moduleId = g?.module_id || null;
      courseId = g?.course_id || null;
      const { data: members } = await admin.from("group_members").select("student_id").eq("group_id", group_id);
      studentIds = (members || []).map((m: any) => m.student_id);
    } else if (student_id) {
      studentIds = [student_id];
    }

    if (studentIds.length === 0) {
      return new Response(JSON.stringify({ weakCriteria: [], pendingObjectives: [], coveredScenarios: [], summary: "Sem alunos no grupo." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Evaluations grouped by criterion
    const { data: evals } = await admin
      .from("evaluations")
      .select("criterion_id, grade")
      .in("student_id", studentIds)
      .eq("archived", false);

    const byCriterion: Record<string, number[]> = {};
    for (const e of evals || []) {
      if (!e.criterion_id || !(e.grade in GRADE_MAP)) continue;
      (byCriterion[e.criterion_id] ||= []).push(GRADE_MAP[e.grade]);
    }

    const criterionIds = Object.keys(byCriterion);
    const { data: criteria } = criterionIds.length
      ? await admin.from("evaluation_criteria").select("id, label, phase").in("id", criterionIds)
      : { data: [] as any[] };

    const weakCriteria = (criteria || [])
      .map((c: any) => {
        const arr = byCriterion[c.id] || [];
        if (arr.length < 2) return null;
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        return avg < 75 ? { id: c.id, label: c.label, phase: c.phase, average: Math.round(avg), samples: arr.length } : null;
      })
      .filter(Boolean);

    // Learning objectives (pending vs confirmed)
    let pendingObjectives: any[] = [];
    let confirmedObjectiveIds = new Set<string>();
    if (moduleId) {
      const { data: objectives } = await admin.from("learning_objectives").select("id, content, is_essential").eq("module_id", moduleId);
      const objIds = (objectives || []).map((o: any) => o.id);
      if (objIds.length) {
        const { data: confirmed } = await admin.from("objective_sessions").select("objective_id").in("objective_id", objIds);
        confirmedObjectiveIds = new Set((confirmed || []).map((c: any) => c.objective_id));
      }
      pendingObjectives = (objectives || []).filter((o: any) => !confirmedObjectiveIds.has(o.id)).map((o: any) => ({ id: o.id, content: o.content, is_essential: o.is_essential }));
    }

    // Covered scenarios (from rooms in this group/course)
    let coveredScenarios: any[] = [];
    if (group_id) {
      const { data: rooms } = await admin.from("rooms").select("id").eq("group_id", group_id);
      const roomIds = (rooms || []).map((r: any) => r.id);
      if (roomIds.length) {
        const { data: rs } = await admin.from("room_scenarios").select("scenario_id, label, scenario_content").in("room_id", roomIds);
        const seen = new Set<string>();
        for (const r of rs || []) {
          const key = (r.label || r.scenario_id || "").toString();
          if (key && !seen.has(key)) {
            seen.add(key);
            coveredScenarios.push({ scenario_id: r.scenario_id, label: r.label, snippet: (r.scenario_content || "").slice(0, 200) });
          }
        }
      }
    }

    const summary = `${weakCriteria.length} critério(s) abaixo de S, ${pendingObjectives.length} objetivo(s) pendente(s), ${coveredScenarios.length} cenário(s) já cursado(s).`;

    return new Response(JSON.stringify({ weakCriteria, pendingObjectives, coveredScenarios, summary, moduleId, courseId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze-performance error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
