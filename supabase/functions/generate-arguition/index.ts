import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { sessionId, roomId, presentationId } = await req.json();
    if (!sessionId || !roomId || !presentationId) {
      return new Response(JSON.stringify({ error: "missing params" }), { status: 400, headers: corsHeaders });
    }

    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the caller is the professor of the room (or admin)
    const { data: room } = await admin.from("rooms").select("professor_id").eq("id", roomId).single();
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!room || (room.professor_id !== user.id && !roleRow)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    // Gather P5 objectives + presentation file URL
    const [objsRes, presRes] = await Promise.all([
      admin.from("step_items").select("content").eq("session_id", sessionId).eq("step", 5),
      admin.from("session_presentations").select("file_url, file_name, mime_type").eq("id", presentationId).single(),
    ]);
    const objectives = (objsRes.data || []).map((o: any) => o.content).filter(Boolean);
    const presentation = presRes.data;
    if (!presentation) {
      return new Response(JSON.stringify({ error: "presentation not found" }), { status: 404, headers: corsHeaders });
    }

    if (objectives.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum objetivo P5 disponível para análise" }), { status: 400, headers: corsHeaders });
    }

    const prompt = `Você é um tutor PBL avaliando uma apresentação de fechamento (P7).

OBJETIVOS DE APRENDIZAGEM definidos pelo grupo no P5:
${objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}

ARQUIVO DE APRESENTAÇÃO ENVIADO PELO GRUPO:
Nome: ${presentation.file_name}
Tipo: ${presentation.mime_type}
URL: ${presentation.file_url}

Como você não pode abrir o arquivo, baseie sua análise APENAS nos objetivos listados.
Sua tarefa: gerar um "Card de Arguição" para o tutor com:
1. Um resumo curto (1-2 frases) sobre que objetivos provavelmente exigem maior arguição.
2. Exatamente 3 perguntas de aprofundamento que o tutor pode fazer, cada uma alinhada a um objetivo específico, no estilo: "Sobre o objetivo X, peça que aprofundem em Y…".

Responda APENAS em JSON estrito:
{"coverage_summary":"…","questions":["…","…","…"]}`;

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI key missing" }), { status: 500, headers: corsHeaders });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um tutor PBL. Responda apenas JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI failed", detail: t }), { status: aiRes.status, headers: corsHeaders });
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    let parsed: { coverage_summary?: string; questions?: string[] } = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = { coverage_summary: cleaned, questions: [] }; }

    const { error: insErr } = await admin.from("arguition_cards").insert({
      session_id: sessionId,
      room_id: roomId,
      presentation_id: presentationId,
      coverage_summary: parsed.coverage_summary || "",
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      generated_by: user.id,
    });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
