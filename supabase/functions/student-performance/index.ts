import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

// Called by an external system (a WhatsApp AI-agent platform, wp.agents) to
// let a "performance consultant" agent look up a student's own results by
// e-mail. Mirrors, on purpose, the student-performance function already
// shipped in the sibling posologia-clinical-hub (simulador) and prova.facil
// repos — same two-step e-mail+code verification shape, same shared-secret
// auth header — so the wp.agents side reuses the exact same integration/
// prompt pattern for all platforms.
//
// Two-step flow, to stop a classmate from reading someone else's grades by
// just typing their e-mail (there's no other identity check on the WhatsApp
// side — the agent only knows what the conversation tells it):
//   1. Called with only `email` -> generates a 6-digit code, e-mails it to
//      that address, returns {status:"code_sent"}. The agent is expected to
//      ask the student for the code they received.
//   2. Called with `email` + `code` -> validates the code (correct, not
//      expired, not already used, capped attempts) and only then returns
//      the actual results.
//
// Unlike simulador/prova.facil, PBL Flow uses *real* Supabase Auth accounts
// (see supabase/functions/login/index.ts's `resolveEligibleUser`) rather
// than a freely-typed e-mail column — so identity here is resolved via
// `auth.admin.listUsers()`, same as the platform's own login. Results are
// per-individual-student rubric grades (`evaluations`/`peer_evaluations`,
// grade in {O,I,PS,S,MS} = {0,25,50,75,100}), not per-question right/wrong —
// there is no stored free-text "why" on a grade, so the summary this
// produces is "how you were rated on each PBL competency" rather than
// "you got question X wrong".

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wpagents-key",
};

const GRADE_MAP: Record<string, number> = { O: 0, I: 25, PS: 50, S: 75, MS: 100 };
const MAX_RECENT_EVALUATIONS = 20;
// Mirrors the sibling TBL/simulador/prova.facil repos' fix for the same
// underlying problem (a heavy account's full history in one payload can
// time out the caller's own LLM tool-result call): default to only the
// most recent room's evaluations, not every recent evaluation across every
// room this student was ever in. Trade-off accepted on purpose: PBL's
// "criterios_fracos" pattern (a criterion averaging low across >=2 samples)
// is now scoped to one room instead of the student's whole history, so it
// needs >=2 samples *within that room* to fire — a real student who wants
// their cross-room pattern back can still name a specific room via `sala`.
const DEFAULT_ROOM_LIMIT = 1;

const CODE_TTL_MINUTES = 10;
const MAX_CODE_REQUESTS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const FROM_EMAIL = "PBL Flow <convite@tbl.posologia.app>";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerificationEmail(email: string, code: string) {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject: "Seu código de verificação — Consultor de Desempenho",
    html: `
      <p>Olá!</p>
      <p>Alguém (esperamos que você 😊) pediu para consultar seu desempenho recente no PBL Flow pelo assistente no WhatsApp.</p>
      <p>Seu código de verificação é:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>Ele expira em ${CODE_TTL_MINUTES} minutos. Se você não pediu isso, pode ignorar este e-mail.</p>
    `,
  });
  if (error) throw new Error(typeof error === "string" ? error : error.message || "Falha ao enviar e-mail");
}

// Groups a list of {criterion_id, grade, label, phase} rows by criterion and
// averages the numeric grade — same aggregation analyze-performance/index.ts
// already uses for its "weakCriteria" feature, applied globally across all
// of this one student's evaluations instead of one group at a time.
function averageByCriterion(rows: { criterion_id: string; grade: string | null; label: string; phase: string }[]) {
  const byCriterion = new Map<string, { label: string; phase: string; values: number[] }>();
  for (const row of rows) {
    if (!row.grade || !(row.grade in GRADE_MAP)) continue;
    const entry = byCriterion.get(row.criterion_id) || { label: row.label, phase: row.phase, values: [] };
    entry.values.push(GRADE_MAP[row.grade]);
    byCriterion.set(row.criterion_id, entry);
  }
  return Array.from(byCriterion.values()).map((e) => ({
    criterio: e.label,
    fase: e.phase,
    media: Math.round((e.values.reduce((a, b) => a + b, 0) / e.values.length) * 10) / 10,
    amostras: e.values.length,
  }));
}

async function findStudentPerformance(supabase: any, email: string, salaFilter?: string | null) {
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) throw usersErr;
  const user = (usersData?.users || []).find((u: any) => u.email?.toLowerCase() === email);
  if (!user) return { aluno_email: email, encontrado: false, avaliacoes_professor: [], criterios_fracos: [], avaliacao_dos_colegas: [] };

  const { data: allEvals, error: evalErr } = await supabase
    .from("evaluations")
    .select("room_id, grade, created_at, problem_number, criterion_id, evaluation_criteria(label, phase), rooms(name, groups(name))")
    .eq("student_id", user.id)
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(MAX_RECENT_EVALUATIONS);
  if (evalErr) throw evalErr;

  let evals = allEvals || [];
  let maisSalasDisponiveis: string[] = [];
  if (salaFilter) {
    const matched = evals.filter((e: any) => (e.rooms?.name || "").toLowerCase().includes(salaFilter.toLowerCase()));
    if (matched.length === 0) {
      return {
        aluno_email: email,
        encontrado: true,
        sala_nao_encontrada: salaFilter,
        salas_disponiveis: Array.from(new Set(evals.map((e: any) => e.rooms?.name).filter(Boolean))),
        avaliacoes_professor: [],
        criterios_fracos: [],
        avaliacao_dos_colegas: [],
      };
    }
    evals = matched;
  } else if (evals.length > 0) {
    const mostRecentRoom = evals[0].rooms?.name || null;
    maisSalasDisponiveis = Array.from(
      new Set(evals.slice(1).map((e: any) => e.rooms?.name).filter((name: any) => name && name !== mostRecentRoom))
    );
    evals = evals.filter((e: any) => (e.rooms?.name || null) === mostRecentRoom);
  }
  const targetRoomId = evals[0]?.room_id || null;

  const avaliacoes_professor = (evals || []).map((e: any) => ({
    turma: e.rooms?.groups?.name || null,
    sala: e.rooms?.name || null,
    fase: e.evaluation_criteria?.phase || null,
    criterio: e.evaluation_criteria?.label || null,
    nota: e.grade,
    nota_valor: e.grade in GRADE_MAP ? GRADE_MAP[e.grade] : null,
    data: e.created_at,
  }));

  const criterionRowsForAvg = (evals || [])
    .filter((e: any) => e.evaluation_criteria)
    .map((e: any) => ({
      criterion_id: e.criterion_id,
      grade: e.grade,
      label: e.evaluation_criteria.label,
      phase: e.evaluation_criteria.phase,
    }));
  const criterios_fracos = averageByCriterion(criterionRowsForAvg).filter((c) => c.amostras >= 2 && c.media < 75);

  const { data: peerEvals, error: peerErr } = targetRoomId
    ? await supabase
        .from("peer_evaluations")
        .select("grade, criterion_id, evaluation_criteria(label, phase)")
        .eq("target_id", user.id)
        .eq("room_id", targetRoomId)
        .eq("is_self", false)
        .eq("archived", false)
    : { data: [], error: null };
  if (peerErr) throw peerErr;

  const peerRowsForAvg = (peerEvals || [])
    .filter((e: any) => e.evaluation_criteria)
    .map((e: any) => ({
      criterion_id: e.criterion_id,
      grade: e.grade,
      label: e.evaluation_criteria.label,
      phase: e.evaluation_criteria.phase,
    }));
  const avaliacao_dos_colegas = averageByCriterion(peerRowsForAvg);

  const encontrado = avaliacoes_professor.length > 0 || avaliacao_dos_colegas.length > 0;
  return {
    aluno_email: email,
    encontrado,
    avaliacoes_professor,
    criterios_fracos,
    avaliacao_dos_colegas,
    ...(maisSalasDisponiveis.length ? { mais_salas_disponiveis: maisSalasDisponiveis } : {}),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedKey = Deno.env.get("WPAGENTS_API_KEY");
    const providedKey = req.headers.get("x-wpagents-key");
    if (!expectedKey || providedKey !== expectedKey) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    let email = url.searchParams.get("email");
    let code = url.searchParams.get("code");
    let sala = url.searchParams.get("sala");
    if (!email && req.method === "POST") {
      try {
        const body = await req.json();
        email = body?.email ?? null;
        code = body?.code ?? code;
        sala = body?.sala ?? sala;
      } catch {
        // no/invalid JSON body — email stays null, handled below
      }
    }
    email = (email || "").trim().toLowerCase();
    code = (code || "").trim();
    sala = (sala || "").trim() || null;

    if (!email || !email.includes("@")) {
      return json({ error: "Parâmetro 'email' ausente ou inválido." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Step 2: a code was provided — verify it, then return results ──
    if (code) {
      const { data: pending, error: codeErr } = await supabase
        .from("wpagents_verification_codes")
        .select("id, code, expires_at, consumed_at, attempts")
        .ilike("email", email)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (codeErr) throw codeErr;

      if (!pending || new Date(pending.expires_at) < new Date()) {
        return json({
          status: "invalid_code",
          mensagem: "Não há um código válido para esse e-mail (expirado ou nunca solicitado). Peça um novo código.",
        });
      }
      if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
        return json({
          status: "too_many_attempts",
          mensagem: "Esse código foi tentado várias vezes sem sucesso. Peça um novo código.",
        });
      }
      if (pending.code !== code) {
        await supabase
          .from("wpagents_verification_codes")
          .update({ attempts: pending.attempts + 1 })
          .eq("id", pending.id);
        return json({
          status: "wrong_code",
          mensagem: "Código incorreto. Confirme o código recebido por e-mail e tente novamente.",
        });
      }

      // Correct — single-use, mark consumed so it can't be replayed.
      await supabase
        .from("wpagents_verification_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", pending.id);

      const result = await findStudentPerformance(supabase, email, sala);
      return json({ status: "verified", ...result });
    }

    // ── Step 1: no code yet — rate-limit, generate one, e-mail it ──
    const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: countErr } = await supabase
      .from("wpagents_verification_codes")
      .select("id", { count: "exact", head: true })
      .ilike("email", email)
      .gte("created_at", sinceHour);
    if (countErr) throw countErr;
    if ((recentCount || 0) >= MAX_CODE_REQUESTS_PER_HOUR) {
      return json({
        status: "rate_limited",
        mensagem: "Muitos códigos pedidos recentemente para esse e-mail. Peça para tentar novamente em uma hora.",
      });
    }

    const newCode = generateCode();
    const { error: insertErr } = await supabase.from("wpagents_verification_codes").insert({
      email,
      code: newCode,
      expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString(),
    });
    if (insertErr) throw insertErr;

    await sendVerificationEmail(email, newCode);

    return json({
      status: "code_sent",
      mensagem: `Um código de verificação foi enviado para ${email}. Peça ao aluno o código de 6 dígitos recebido, e chame esta mesma ferramenta de novo com o e-mail e o código.`,
    });
  } catch (err) {
    console.error("student-performance error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
