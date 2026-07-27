import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveInstitutionIdFromRoom, checkAiQuota, incrementAiQuota, aiQuotaExceededResponse } from "../_shared/planLimits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Only providers confirmed to accept OpenAI-compatible `input_audio` content are attempted here.
const AUDIO_PROVIDER_ENDPOINTS: Record<string, { url: string; defaultModel: string }> = {
  google: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", defaultModel: "gemini-2.5-flash" },
};

async function callAudioAIWithTool(
  adminClient: any,
  lovableKey: string | undefined,
  messages: any[],
  tool: any,
): Promise<{ args: any; provider: string; model: string; usage: any }> {
  const tools = [tool];
  const tool_choice = { type: "function", function: { name: tool.function.name } };

  const { data: keys } = await adminClient.from("ai_provider_keys").select("provider, api_key, is_active").eq("is_active", true).order("updated_at", { ascending: false });
  for (const pk of keys || []) {
    const cfg = AUDIO_PROVIDER_ENDPOINTS[pk.provider];
    if (!cfg || !pk.api_key) continue;
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${pk.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: cfg.defaultModel, messages, tools, tool_choice }),
      });
      if (!res.ok) { console.error(`[AI] ${pk.provider} ${res.status}`); continue; }
      const d = await res.json();
      const call = d.choices?.[0]?.message?.tool_calls?.[0];
      if (call?.function?.arguments) {
        return { args: JSON.parse(call.function.arguments), provider: pk.provider, model: cfg.defaultModel, usage: d.usage || {} };
      }
    } catch (e) { console.error(`[AI] ${pk.provider} error:`, e); }
  }

  if (!lovableKey) throw { status: 500, message: "Nenhum provedor de IA disponível." };
  const model = "google/gemini-2.5-flash";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, tools, tool_choice }),
  });
  if (!res.ok) {
    if (res.status === 429) throw { status: 429, message: "Muitas requisições à IA. Tente em instantes." };
    if (res.status === 402) throw { status: 402, message: "Créditos de IA insuficientes." };
    throw { status: res.status, message: "Falha ao transcrever áudio." };
  }
  const d = await res.json();
  const call = d.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw { status: 502, message: "IA não retornou transcrição." };
  return { args: JSON.parse(call.function.arguments), provider: "lovable", model, usage: d.usage || {} };
}

const TRANSCRIBE_TOOL = {
  type: "function",
  function: {
    name: "return_transcript",
    description:
      "Transcrição com diarização (Speaker A/B/C...), tempo de fala e termos do glossário citados.",
    parameters: {
      type: "object",
      properties: {
        full_text: { type: "string", description: "Texto corrido completo da transcrição em português." },
        segments: {
          type: "array",
          maxItems: 120,
          items: {
            type: "object",
            properties: {
              speaker: { type: "string", description: "Rótulo do falante: Speaker A, Speaker B, etc." },
              start: { type: "number", description: "Início em segundos." },
              end: { type: "number", description: "Fim em segundos." },
              text: { type: "string" },
            },
            required: ["speaker", "start", "end", "text"],
            additionalProperties: false,
          },
        },
        glossary_hits: {
          type: "array",
          maxItems: 30,
          items: {
            type: "object",
            properties: {
              term: { type: "string" },
              speaker: { type: "string" },
              context: { type: "string" },
            },
            required: ["term", "speaker"],
            additionalProperties: false,
          },
        },
      },
      required: ["full_text", "segments", "glossary_hits"],
      additionalProperties: false,
    },
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { recording_id } = body || {};
    if (!recording_id) {
      return new Response(JSON.stringify({ error: "recording_id obrigatório." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: rec } = await admin
      .from("session_audio_recordings")
      .select("id, room_id, session_id, audio_path, mime_type, started_by, status")
      .eq("id", recording_id)
      .maybeSingle();
    if (!rec) {
      return new Response(JSON.stringify({ error: "Gravação não encontrada." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorize: must be professor or coordinator of the room
    const { data: room } = await admin
      .from("rooms")
      .select("id, professor_id, coordinator_id")
      .eq("id", rec.room_id)
      .maybeSingle();
    if (!room || (room.professor_id !== userId && room.coordinator_id !== userId && rec.started_by !== userId)) {
      return new Response(JSON.stringify({ error: "Acesso negado." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const institutionId = await resolveInstitutionIdFromRoom(admin, rec.room_id);
    const quota = await checkAiQuota(admin, institutionId);
    if (!quota.allowed) return aiQuotaExceededResponse(quota, corsHeaders);

    // Optional scenario glossary for term detection
    let glossaryTerms: string[] = [];
    if (rec.session_id) {
      const { data: sess } = await admin
        .from("tutorial_sessions")
        .select("scenario_id")
        .eq("id", rec.session_id)
        .maybeSingle();
      if (sess?.scenario_id) {
        const { data: sc } = await admin
          .from("scenarios")
          .select("glossary, content")
          .eq("id", sess.scenario_id)
          .maybeSingle();
        const g = (sc as any)?.glossary;
        if (Array.isArray(g)) {
          glossaryTerms = g
            .map((t: any) => (typeof t === "string" ? t : t?.term || t?.name))
            .filter(Boolean)
            .slice(0, 40);
        }
      }
    }

    // Mark processing
    await admin
      .from("session_audio_recordings")
      .update({ status: "processing", error_message: null } as any)
      .eq("id", recording_id);

    // Download audio and convert to base64
    const { data: file, error: dlErr } = await admin.storage
      .from("references")
      .download(rec.audio_path);
    if (dlErr || !file) {
      await admin
        .from("session_audio_recordings")
        .update({ status: "failed", error_message: "Falha ao baixar áudio." } as any)
        .eq("id", recording_id);
      return new Response(JSON.stringify({ error: "Falha ao baixar áudio." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.byteLength > 20 * 1024 * 1024) {
      await admin
        .from("session_audio_recordings")
        .update({ status: "failed", error_message: "Áudio acima de 20MB (limite atual)." } as any)
        .eq("id", recording_id);
      return new Response(JSON.stringify({ error: "Áudio acima de 20MB." }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // base64 encode (chunked to avoid stack overflow)
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)) as any);
    }
    const base64Audio = btoa(binary);
    const format = (rec.mime_type || "audio/webm").includes("mp4")
      ? "mp4"
      : (rec.mime_type || "audio/webm").includes("mpeg") ? "mp3" : "webm";

    const systemPrompt = `Você é um sistema de transcrição e diarização de áudio de sessões educacionais em português brasileiro (Aprendizagem Baseada em Problemas).
- Diarize os falantes com rótulos consistentes (Speaker A, Speaker B, Speaker C...). Use o mesmo rótulo para a mesma voz ao longo do áudio.
- Forneça segmentos com start/end em segundos.
- Detecte se algum dos TERMOS DO GLOSSÁRIO foi mencionado e por quem.
- Use exclusivamente a tool return_transcript.`;

    const userText = `TERMOS DO GLOSSÁRIO a procurar (case-insensitive, aceite variações): ${glossaryTerms.length ? glossaryTerms.join(", ") : "(nenhum)"}.
Transcreva e diarize o áudio anexado.`;

    let result;
    try {
      result = await callAudioAIWithTool(
        admin,
        LOVABLE_API_KEY,
        [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "input_audio", input_audio: { data: base64Audio, format } },
            ],
          },
        ],
        TRANSCRIBE_TOOL,
      );
    } catch (e: any) {
      const msg = e?.message || "Falha ao transcrever áudio.";
      await admin
        .from("session_audio_recordings")
        .update({ status: "failed", error_message: msg } as any)
        .eq("id", recording_id);
      return new Response(JSON.stringify({ error: msg }), {
        status: e?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = result.args;
    const segments: Array<{ speaker: string; start: number; end: number; text: string }> = parsed.segments || [];
    const full_text: string = parsed.full_text || "";
    const glossary_hits = parsed.glossary_hits || [];

    // Participation aggregation
    const bySpeaker = new Map<string, { speaking_seconds: number; turns: number }>();
    for (const s of segments) {
      const dur = Math.max(0, (s.end || 0) - (s.start || 0));
      const cur = bySpeaker.get(s.speaker) || { speaking_seconds: 0, turns: 0 };
      cur.speaking_seconds += dur;
      cur.turns += 1;
      bySpeaker.set(s.speaker, cur);
    }
    const participation = {
      by_speaker: Array.from(bySpeaker.entries()).map(([speaker, v]) => ({
        speaker,
        speaking_seconds: Math.round(v.speaking_seconds),
        turns: v.turns,
      })),
    };
    const totalDuration = Math.round(
      segments.reduce((max, s) => Math.max(max, s.end || 0), 0),
    );

    await admin
      .from("session_audio_recordings")
      .update({
        status: "ready",
        transcript: { full_text, segments, glossary_hits },
        participation,
        duration_seconds: totalDuration || null,
      } as any)
      .eq("id", recording_id);

    // Log usage
    const usage = result.usage || {};
    await admin.from("ai_usage_log").insert({
      user_id: userId,
      provider: result.provider,
      model: result.model,
      prompt_type: "transcribe_session",
      tokens_input: usage.prompt_tokens || 0,
      tokens_output: usage.completion_tokens || 0,
      estimated_cost_usd: 0,
    } as any);
    await incrementAiQuota(admin, institutionId);

    return new Response(
      JSON.stringify({ ok: true, recording_id, duration: totalDuration }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("transcribe-session error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
