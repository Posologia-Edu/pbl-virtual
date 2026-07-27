// Shared plan-limit helpers used by edge functions that consume AI quota
// or enroll students. Institutions/subscriptions are read with the
// service-role client passed in by each caller.

export async function resolveInstitutionIdFromRoom(admin: any, roomId: string): Promise<string | null> {
  const { data: room } = await admin.from("rooms").select("group_id").eq("id", roomId).maybeSingle();
  if (!room?.group_id) return null;
  const { data: group } = await admin.from("groups").select("course_id").eq("id", room.group_id).maybeSingle();
  if (!group?.course_id) return null;
  const { data: course } = await admin.from("courses").select("institution_id").eq("id", group.course_id).maybeSingle();
  return course?.institution_id ?? null;
}

export async function resolveInstitutionIdFromCourse(admin: any, courseId: string): Promise<string | null> {
  const { data: course } = await admin.from("courses").select("institution_id").eq("id", courseId).maybeSingle();
  return course?.institution_id ?? null;
}

export interface AiQuotaResult {
  allowed: boolean;
  max: number;
  current: number;
}

export async function checkAiQuota(admin: any, institutionId: string | null): Promise<AiQuotaResult> {
  if (!institutionId) return { allowed: true, max: 99999, current: 0 };

  const { data: sub } = await admin
    .from("subscriptions")
    .select("max_ai_interactions")
    .eq("institution_id", institutionId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  const max = sub?.max_ai_interactions ?? 99999;
  const monthYear = new Date().toISOString().slice(0, 7);
  const { data: usage } = await admin
    .from("ai_interaction_counts")
    .select("interaction_count")
    .eq("institution_id", institutionId)
    .eq("month_year", monthYear)
    .maybeSingle();

  const current = usage?.interaction_count ?? 0;
  return { allowed: current < max, max, current };
}

export async function incrementAiQuota(admin: any, institutionId: string | null): Promise<void> {
  if (!institutionId) return;
  const monthYear = new Date().toISOString().slice(0, 7);
  const { data: existing } = await admin
    .from("ai_interaction_counts")
    .select("id, interaction_count")
    .eq("institution_id", institutionId)
    .eq("month_year", monthYear)
    .maybeSingle();

  if (existing) {
    await admin
      .from("ai_interaction_counts")
      .update({ interaction_count: existing.interaction_count + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await admin
      .from("ai_interaction_counts")
      .insert({ institution_id: institutionId, month_year: monthYear, interaction_count: 1 });
  }
}

export function aiQuotaExceededResponse(quota: AiQuotaResult, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: `Limite de ${quota.max} interações IA/mês atingido. Faça upgrade do plano para continuar usando a IA.`,
      limit_reached: true,
      current: quota.current,
      max: quota.max,
    }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export async function checkFeatureFlag(admin: any, institutionId: string | null, column: string): Promise<boolean> {
  if (!institutionId) return true;
  const { data: sub } = await admin
    .from("subscriptions")
    .select(column)
    .eq("institution_id", institutionId)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (!sub) return true;
  return !!(sub as Record<string, unknown>)[column];
}

// True if `userId` is the professor, coordinator, reporter, or an enrolled
// student of the room's group. Used to authorize cross-user reads (e.g.
// viewing a session-mate's badges) that are scoped to a shared room.
export async function isRoomParticipant(admin: any, userId: string, roomId: string): Promise<boolean> {
  const { data: room } = await admin
    .from("rooms")
    .select("professor_id, group_id, coordinator_id, reporter_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return false;
  if (room.professor_id === userId || room.coordinator_id === userId || room.reporter_id === userId) return true;
  const { data: membership } = await admin
    .from("group_members")
    .select("id")
    .eq("group_id", room.group_id)
    .eq("student_id", userId)
    .maybeSingle();
  return !!membership;
}

// True if `callerId` is the room's professor, a platform admin, or the
// institution_admin who owns the institution the room belongs to.
export async function isRoomProfessorOrAdmin(
  admin: any,
  callerId: string,
  professorId: string,
  institutionId: string | null
): Promise<boolean> {
  if (professorId === callerId) return true;
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .in("role", ["admin", "institution_admin"]);
  const roleNames = (roles || []).map((r: any) => r.role);
  if (roleNames.includes("admin")) return true;
  if (roleNames.includes("institution_admin") && institutionId) {
    const { data: inst } = await admin
      .from("institutions")
      .select("id")
      .eq("owner_id", callerId)
      .eq("id", institutionId)
      .maybeSingle();
    if (inst) return true;
  }
  return false;
}

export interface StudentLimitResult {
  allowed: boolean;
  max: number | null;
}

export async function checkStudentLimit(admin: any, institutionId: string): Promise<StudentLimitResult> {
  const { data: sub } = await admin
    .from("subscriptions")
    .select("max_students")
    .eq("institution_id", institutionId)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (!sub || sub.max_students === null || sub.max_students >= 99999) {
    return { allowed: true, max: sub?.max_students ?? null };
  }

  const { data: courses } = await admin.from("courses").select("id").eq("institution_id", institutionId);
  const courseIds = (courses || []).map((c: any) => c.id);
  if (courseIds.length === 0) return { allowed: true, max: sub.max_students };

  const { data: members } = await admin.from("course_members").select("user_id").in("course_id", courseIds);
  const uniqueUserIds = [...new Set((members || []).map((m: any) => m.user_id))];
  if (uniqueUserIds.length === 0) return { allowed: true, max: sub.max_students };

  const { data: studentRoles } = await admin
    .from("user_roles")
    .select("user_id")
    .in("user_id", uniqueUserIds)
    .eq("role", "student");

  return { allowed: (studentRoles || []).length < sub.max_students, max: sub.max_students };
}
