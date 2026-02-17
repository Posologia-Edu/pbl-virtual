import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? serviceRoleKey;

    // Verify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { user_id, room_id } = await req.json();

    const targetUserId = user_id || caller.id;

    // Fetch badge definitions
    const { data: badgeDefs } = await adminClient
      .from("badge_definitions")
      .select("*");
    if (!badgeDefs) throw new Error("Failed to fetch badge definitions");

    const badgeMap = new Map(badgeDefs.map((b: any) => [b.slug, b]));

    // Fetch existing badges for user
    const { data: existingBadges } = await adminClient
      .from("user_badges")
      .select("badge_id, room_id")
      .eq("user_id", targetUserId);

    const existingSet = new Set(
      (existingBadges || []).map((b: any) => `${b.badge_id}_${b.room_id || "global"}`)
    );

    // Fetch metrics
    const [
      contributionsRes,
      chatRes,
      sessionsRes,
      coordinatorRes,
      reporterRes,
      peerEvalsRes,
      referencesRes,
      evaluationsRes,
    ] = await Promise.all([
      adminClient
        .from("step_items")
        .select("id", { count: "exact", head: true })
        .eq("author_id", targetUserId),
      adminClient
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", targetUserId),
      adminClient
        .from("tutorial_sessions")
        .select("id, coordinator_id, reporter_id, room_id")
        .or(`coordinator_id.eq.${targetUserId},reporter_id.eq.${targetUserId}`)
        .limit(1000),
      adminClient
        .from("tutorial_sessions")
        .select("id", { count: "exact", head: true })
        .eq("coordinator_id", targetUserId),
      adminClient
        .from("tutorial_sessions")
        .select("id", { count: "exact", head: true })
        .eq("reporter_id", targetUserId),
      adminClient
        .from("peer_evaluations")
        .select("id", { count: "exact", head: true })
        .eq("evaluator_id", targetUserId)
        .eq("archived", false),
      adminClient
        .from("session_references")
        .select("id", { count: "exact", head: true })
        .eq("author_id", targetUserId),
      adminClient
        .from("evaluations")
        .select("grade, created_at")
        .eq("student_id", targetUserId)
        .eq("archived", false)
        .order("created_at"),
    ]);

    // Count unique sessions participated in (via step_items)
    const { data: sessionParticipation } = await adminClient
      .from("step_items")
      .select("session_id")
      .eq("author_id", targetUserId)
      .not("session_id", "is", null);

    const uniqueSessions = new Set(
      (sessionParticipation || []).map((s: any) => s.session_id)
    ).size;

    const contributionCount = contributionsRes.count || 0;
    const chatCount = chatRes.count || 0;
    const coordinatorCount = coordinatorRes.count || 0;
    const reporterCount = reporterRes.count || 0;
    const peerEvalCount = peerEvalsRes.count || 0;
    const referenceCount = referencesRes.count || 0;

    // Evaluate grades for top_performer
    const grades = (evaluationsRes.data || []).map((e: any) => e.grade).filter(Boolean);
    const aGrades = grades.filter((g: string) => g.toUpperCase() === "A").length;
    const isTopPerformer = grades.length >= 3 && aGrades / grades.length >= 0.6;

    // Evaluate improvement streak
    const gradeValues: Record<string, number> = { D: 1, C: 2, B: 3, A: 4 };
    let hasImprovement = false;
    if (grades.length >= 4) {
      const halfPoint = Math.floor(grades.length / 2);
      const firstHalf = grades.slice(0, halfPoint);
      const secondHalf = grades.slice(halfPoint);
      const avgFirst = firstHalf.reduce((s: number, g: string) => s + (gradeValues[g.toUpperCase()] || 2), 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s: number, g: string) => s + (gradeValues[g.toUpperCase()] || 2), 0) / secondHalf.length;
      hasImprovement = avgSecond > avgFirst + 0.3;
    }

    // Determine which badges to award
    const newBadges: { badge_id: string; room_id: string | null; metadata: any }[] = [];

    const checkAndAward = (slug: string, condition: boolean, roomId: string | null = null, meta: any = {}) => {
      const def = badgeMap.get(slug);
      if (!def) return;
      const key = `${def.id}_${roomId || "global"}`;
      if (existingSet.has(key)) return;
      if (condition) {
        newBadges.push({ badge_id: def.id, room_id: roomId, metadata: meta });
      }
    };

    checkAndAward("first_contribution", contributionCount >= 1, room_id, { count: contributionCount });
    checkAndAward("active_contributor_10", contributionCount >= 10, room_id, { count: contributionCount });
    checkAndAward("prolific_contributor_50", contributionCount >= 50, room_id, { count: contributionCount });
    checkAndAward("chat_enthusiast_20", chatCount >= 20, room_id, { count: chatCount });
    checkAndAward("consistent_presence_5", uniqueSessions >= 5, null, { sessions: uniqueSessions });
    checkAndAward("dedicated_learner_10", uniqueSessions >= 10, null, { sessions: uniqueSessions });
    checkAndAward("coordinator_star", coordinatorCount >= 1, room_id);
    checkAndAward("reporter_star", reporterCount >= 1, room_id);
    checkAndAward("peer_evaluator_5", peerEvalCount >= 5, room_id, { count: peerEvalCount });
    checkAndAward("reference_sharer_3", referenceCount >= 3, room_id, { count: referenceCount });
    checkAndAward("top_performer", isTopPerformer, room_id, { aPercentage: grades.length ? Math.round((aGrades / grades.length) * 100) : 0 });
    checkAndAward("improvement_streak", hasImprovement, room_id);

    // Insert new badges
    if (newBadges.length > 0) {
      const rows = newBadges.map((b) => ({
        user_id: targetUserId,
        badge_id: b.badge_id,
        room_id: b.room_id,
        metadata: b.metadata,
      }));
      await adminClient.from("user_badges").upsert(rows, {
        onConflict: "user_id,badge_id,room_id",
        ignoreDuplicates: true,
      });
    }

    // Fetch all user badges with definitions
    const { data: allUserBadges } = await adminClient
      .from("user_badges")
      .select("*, badge_definitions(*)")
      .eq("user_id", targetUserId)
      .order("earned_at", { ascending: false });

    // Build metrics summary
    const metrics = {
      contributions: contributionCount,
      chat_messages: chatCount,
      sessions_participated: uniqueSessions,
      coordinator_times: coordinatorCount,
      reporter_times: reporterCount,
      peer_evaluations: peerEvalCount,
      references_shared: referenceCount,
      total_grades: grades.length,
      a_percentage: grades.length ? Math.round((aGrades / grades.length) * 100) : 0,
    };

    return new Response(
      JSON.stringify({
        badges: allUserBadges || [],
        new_badges: newBadges.length,
        metrics,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("compute-badges error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
