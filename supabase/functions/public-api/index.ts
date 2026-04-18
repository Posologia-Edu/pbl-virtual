import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface AuthCtx {
  keyId: string;
  institutionId: string;
  scopes: string[];
}

async function authenticate(req: Request): Promise<AuthCtx | Response> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Missing Authorization Bearer token" }, 401);
  const rawKey = auth.slice(7).trim();
  if (!rawKey) return json({ error: "Empty token" }, 401);

  const hash = await sha256Hex(rawKey);
  const { data: keyRow, error } = await supabase
    .from("api_keys")
    .select("id, institution_id, scopes, revoked_at, expires_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error || !keyRow) return json({ error: "Invalid API key" }, 401);
  if (keyRow.revoked_at) return json({ error: "API key revoked" }, 401);
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return json({ error: "API key expired" }, 401);
  }

  // Fire-and-forget last_used update
  supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id).then(() => {});

  return { keyId: keyRow.id, institutionId: keyRow.institution_id, scopes: keyRow.scopes ?? [] };
}

async function logRequest(ctx: AuthCtx | null, endpoint: string, method: string, status: number) {
  try {
    await supabase.from("api_request_log").insert({
      api_key_id: ctx?.keyId ?? null,
      institution_id: ctx?.institutionId ?? null,
      endpoint,
      method,
      status_code: status,
    });
  } catch (_) { /* ignore */ }
}

function paginate(url: URL): { from: number; to: number; page: number; pageSize: number } {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("page_size") ?? "20")));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to, page, pageSize };
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Strip the function prefix: /public-api/v1/...
  const path = url.pathname.replace(/^\/public-api/, "").replace(/\/+$/, "") || "/";
  const method = req.method;

  // Health & root unauthenticated
  if (path === "/v1/health" || path === "/" || path === "") {
    return json({ status: "ok", service: "public-api", version: "v1", time: new Date().toISOString() });
  }

  if (!path.startsWith("/v1/")) return json({ error: "Unknown route" }, 404);

  const ctxOrRes = await authenticate(req);
  if (ctxOrRes instanceof Response) {
    await logRequest(null, path, method, ctxOrRes.status);
    return ctxOrRes;
  }
  const ctx = ctxOrRes;
  const inst = ctx.institutionId;

  let res: Response;

  try {
    // GET /v1/institution
    if (path === "/v1/institution" && method === "GET") {
      const { data } = await supabase.from("institutions").select("id, name, brand_platform_name, created_at").eq("id", inst).maybeSingle();
      res = json({ data });
    }
    // GET /v1/courses
    else if (path === "/v1/courses" && method === "GET") {
      const { from, to, page, pageSize } = paginate(url);
      const { data, count } = await supabase.from("courses").select("id, name, institution_id, is_hidden, created_at", { count: "exact" }).eq("institution_id", inst).range(from, to);
      res = json({ data: data ?? [], meta: { page, page_size: pageSize, total: count ?? 0 } });
    }
    // GET /v1/courses/:id
    else if (path.startsWith("/v1/courses/") && method === "GET") {
      const id = path.split("/")[3];
      const { data } = await supabase.from("courses").select("*").eq("id", id).eq("institution_id", inst).maybeSingle();
      if (!data) res = json({ error: "Not found" }, 404);
      else res = json({ data });
    }
    // POST /v1/courses (write scope)
    else if (path === "/v1/courses" && method === "POST") {
      if (!ctx.scopes.includes("write")) { res = json({ error: "Insufficient scope (write required)" }, 403); }
      else {
        const body = await req.json().catch(() => ({}));
        const name = String(body?.name ?? "").trim();
        if (!name || name.length > 200) { res = json({ error: "Invalid 'name' (1-200 chars)" }, 422); }
        else {
          const { data, error } = await supabase.from("courses").insert({ name, institution_id: inst }).select().single();
          if (error) res = json({ error: error.message }, 400);
          else res = json({ data }, 201);
        }
      }
    }
    // GET /v1/groups
    else if (path === "/v1/groups" && method === "GET") {
      const { from, to, page, pageSize } = paginate(url);
      const courseIds = await supabase.from("courses").select("id").eq("institution_id", inst);
      const ids = (courseIds.data ?? []).map((c) => c.id);
      if (!ids.length) { res = json({ data: [], meta: { page, page_size: pageSize, total: 0 } }); }
      else {
        const { data, count } = await supabase.from("groups").select("id, name, course_id, module_id, professor_id, created_at", { count: "exact" }).in("course_id", ids).range(from, to);
        res = json({ data: data ?? [], meta: { page, page_size: pageSize, total: count ?? 0 } });
      }
    }
    // GET /v1/rooms
    else if (path === "/v1/rooms" && method === "GET") {
      const { from, to, page, pageSize } = paginate(url);
      const courseIds = await supabase.from("courses").select("id").eq("institution_id", inst);
      const ids = (courseIds.data ?? []).map((c) => c.id);
      if (!ids.length) { res = json({ data: [], meta: { page, page_size: pageSize, total: 0 } }); }
      else {
        const groupsR = await supabase.from("groups").select("id").in("course_id", ids);
        const gids = (groupsR.data ?? []).map((g) => g.id);
        if (!gids.length) { res = json({ data: [], meta: { page, page_size: pageSize, total: 0 } }); }
        else {
          const { data, count } = await supabase.from("rooms").select("id, name, group_id, professor_id, status, current_step, created_at", { count: "exact" }).in("group_id", gids).range(from, to);
          res = json({ data: data ?? [], meta: { page, page_size: pageSize, total: count ?? 0 } });
        }
      }
    }
    // GET /v1/users — institution course members
    else if (path === "/v1/users" && method === "GET") {
      const { from, to, page, pageSize } = paginate(url);
      const courseIds = await supabase.from("courses").select("id").eq("institution_id", inst);
      const ids = (courseIds.data ?? []).map((c) => c.id);
      if (!ids.length) { res = json({ data: [], meta: { page, page_size: pageSize, total: 0 } }); }
      else {
        const { data: members } = await supabase.from("course_members").select("user_id, course_id, created_at").in("course_id", ids);
        const userIds = Array.from(new Set((members ?? []).map((m) => m.user_id)));
        const { data: profs } = userIds.length ? await supabase.from("profiles").select("user_id, full_name, created_at").in("user_id", userIds) : { data: [] as any[] };
        const profMap = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
        const merged = (members ?? []).map((m: any) => ({ ...m, profile: profMap.get(m.user_id) ?? null }));
        const sliced = merged.slice(from, to + 1);
        res = json({ data: sliced, meta: { page, page_size: pageSize, total: merged.length } });
      }
    }
    // POST /v1/users — provision user + course membership
    else if (path === "/v1/users" && method === "POST") {
      if (!ctx.scopes.includes("write")) { res = json({ error: "Insufficient scope (write required)" }, 403); }
      else {
        const body = await req.json().catch(() => ({}));
        const email = String(body?.email ?? "").trim().toLowerCase();
        const fullName = String(body?.full_name ?? "").trim();
        const courseId = String(body?.course_id ?? "").trim();
        const role = (body?.role === "professor" ? "professor" : "student") as "professor" | "student";
        if (!email || !fullName || !courseId) { res = json({ error: "Required: email, full_name, course_id" }, 422); }
        else {
          // Verify course belongs to institution
          const { data: course } = await supabase.from("courses").select("id").eq("id", courseId).eq("institution_id", inst).maybeSingle();
          if (!course) { res = json({ error: "course_id not in your institution" }, 403); }
          else {
            // Create auth user
            const { data: created, error: cErr } = await supabase.auth.admin.createUser({
              email,
              email_confirm: true,
              user_metadata: { full_name: fullName },
            });
            if (cErr || !created.user) { res = json({ error: cErr?.message ?? "Failed to create user" }, 400); }
            else {
              const uid = created.user.id;
              await supabase.from("user_roles").upsert({ user_id: uid, role }, { onConflict: "user_id,role" });
              await supabase.from("course_members").insert({ user_id: uid, course_id: courseId });
              res = json({ data: { user_id: uid, email, full_name: fullName, role, course_id: courseId } }, 201);
            }
          }
        }
      }
    }
    // GET /v1/sessions
    else if (path === "/v1/sessions" && method === "GET") {
      const { from, to, page, pageSize } = paginate(url);
      const courseIds = await supabase.from("courses").select("id").eq("institution_id", inst);
      const ids = (courseIds.data ?? []).map((c) => c.id);
      const groupsR = ids.length ? await supabase.from("groups").select("id").in("course_id", ids) : { data: [] as any[] };
      const gids = (groupsR.data ?? []).map((g: any) => g.id);
      const roomsR = gids.length ? await supabase.from("rooms").select("id").in("group_id", gids) : { data: [] as any[] };
      const rids = (roomsR.data ?? []).map((r: any) => r.id);
      if (!rids.length) { res = json({ data: [], meta: { page, page_size: pageSize, total: 0 } }); }
      else {
        const { data, count } = await supabase.from("tutorial_sessions").select("id, room_id, label, status, started_at, ended_at, current_step", { count: "exact" }).in("room_id", rids).range(from, to);
        res = json({ data: data ?? [], meta: { page, page_size: pageSize, total: count ?? 0 } });
      }
    }
    // GET /v1/evaluations
    else if (path === "/v1/evaluations" && method === "GET") {
      const { from, to, page, pageSize } = paginate(url);
      const courseIds = await supabase.from("courses").select("id").eq("institution_id", inst);
      const cids = (courseIds.data ?? []).map((c) => c.id);
      const groupsR = cids.length ? await supabase.from("groups").select("id").in("course_id", cids) : { data: [] as any[] };
      const gids = (groupsR.data ?? []).map((g: any) => g.id);
      const roomsR = gids.length ? await supabase.from("rooms").select("id").in("group_id", gids) : { data: [] as any[] };
      const rids = (roomsR.data ?? []).map((r: any) => r.id);
      if (!rids.length) { res = json({ data: [], meta: { page, page_size: pageSize, total: 0 } }); }
      else {
        let q = supabase.from("evaluations").select("id, student_id, professor_id, room_id, criterion_id, grade, problem_number, created_at", { count: "exact" }).in("room_id", rids);
        const studentId = url.searchParams.get("student_id");
        if (studentId) q = q.eq("student_id", studentId);
        const since = url.searchParams.get("since");
        if (since) q = q.gte("created_at", since);
        const { data, count } = await q.range(from, to);
        res = json({ data: data ?? [], meta: { page, page_size: pageSize, total: count ?? 0 } });
      }
    }
    // GET /v1/attendance
    else if (path === "/v1/attendance" && method === "GET") {
      const { from, to, page, pageSize } = paginate(url);
      const courseIds = await supabase.from("courses").select("id").eq("institution_id", inst);
      const cids = (courseIds.data ?? []).map((c) => c.id);
      const groupsR = cids.length ? await supabase.from("groups").select("id").in("course_id", cids) : { data: [] as any[] };
      const gids = (groupsR.data ?? []).map((g: any) => g.id);
      const roomsR = gids.length ? await supabase.from("rooms").select("id").in("group_id", gids) : { data: [] as any[] };
      const rids = (roomsR.data ?? []).map((r: any) => r.id);
      if (!rids.length) { res = json({ data: [], meta: { page, page_size: pageSize, total: 0 } }); }
      else {
        const { data, count } = await supabase.from("attendance").select("id, student_id, room_id, session_id, method, checked_in_at", { count: "exact" }).in("room_id", rids).range(from, to);
        res = json({ data: data ?? [], meta: { page, page_size: pageSize, total: count ?? 0 } });
      }
    }
    else {
      res = json({ error: "Unknown route", path, method }, 404);
    }
  } catch (err: any) {
    console.error("[public-api] error", err);
    res = json({ error: err?.message ?? "Internal error" }, 500);
  }

  await logRequest(ctx, path, method, res.status);
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return await handle(req);
});
