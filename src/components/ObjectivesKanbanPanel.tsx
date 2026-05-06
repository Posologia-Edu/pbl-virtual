import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Target, Link2, FileUp, Loader2, ExternalLink, Trash2, Plus,
  ShieldCheck, ChevronDown, ChevronRight,
} from "lucide-react";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  roomId: string;
  sessionId: string;
  isProfessor: boolean;
  moduleId: string | null;
}

/**
 * Kanban-style display of P5 objectives (step_items step=5) for use during P7.
 * Each objective is a column where students upload references they used during P6
 * to evidence their study. Professor also sees pre-determined module objectives
 * (learning_objectives marked essential) for comparison.
 */
export default function ObjectivesKanbanPanel({ roomId, sessionId, isProfessor, moduleId }: Props) {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<any[]>([]);
  const [predetermined, setPredetermined] = useState<any[]>([]);
  const [refs, setRefs] = useState<any[]>([]);
  const [links, setLinks] = useState<Record<string, { url: string; title: string; show: boolean }>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [showPredetermined, setShowPredetermined] = useState(true);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchAll = useCallback(async () => {
    if (!sessionId) return;
    const [objRes, refRes, predRes] = await Promise.all([
      (supabase as any)
        .from("step_items")
        .select("*, profiles!step_items_author_id_profiles_fkey(full_name)")
        .eq("room_id", roomId)
        .eq("session_id", sessionId)
        .eq("step", 5)
        .order("created_at"),
      (supabase as any)
        .from("session_references")
        .select("*, profiles!session_references_author_id_profiles_fkey(full_name), session_objective_references(id, objective_step_item_id, created_by)")
        .eq("room_id", roomId)
        .eq("session_id", sessionId)
        .order("created_at"),
      moduleId
        ? (supabase as any).from("learning_objectives").select("*").eq("module_id", moduleId).order("is_essential", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);
    setObjectives(objRes.data || []);
    setRefs(refRes.data || []);
    setPredetermined(predRes.data || []);
  }, [roomId, sessionId, moduleId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase
      .channel(`kanban-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_references", filter: `session_id=eq.${sessionId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "session_objective_references", filter: `session_id=eq.${sessionId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "step_items", filter: `session_id=eq.${sessionId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, fetchAll]);

  const refsForObjective = (objId: string) =>
    refs.filter((r: any) => (r.session_objective_references || []).some((j: any) => j.objective_step_item_id === objId));

  const openFile = async (ref: any) => {
    if (ref.ref_type !== "file") return window.open(ref.url, "_blank");
    const path = ref.url?.startsWith("storage:references/")
      ? ref.url.replace("storage:references/", "")
      : decodeURIComponent(ref.url?.split("/references/")[1] || "");
    if (!path) return;
    const { data } = await supabase.storage.from("references").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const addLink = async (objId: string) => {
    const st = links[objId];
    if (!user || !st?.url?.trim()) return;
    const url = st.url.trim().startsWith("http") ? st.url.trim() : `https://${st.url.trim()}`;
    const { data: ref, error } = await (supabase as any).from("session_references").insert({
      room_id: roomId, session_id: sessionId, author_id: user.id,
      ref_type: "link", url, title: st.title?.trim() || url,
    }).select().single();
    if (error || !ref) { toast({ title: "Erro", description: error?.message, variant: "destructive" }); return; }
    await (supabase as any).from("session_objective_references").insert({
      session_id: sessionId, room_id: roomId, objective_step_item_id: objId,
      reference_id: ref.id, created_by: user.id,
    });
    setLinks((s) => ({ ...s, [objId]: { url: "", title: "", show: false } }));
    await fetchAll();
    toast({ title: "Referência adicionada ao objetivo" });
  };

  const uploadFile = async (objId: string, file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 20MB.", variant: "destructive" });
      return;
    }
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Formato inválido", description: "PDF ou DOC/DOCX.", variant: "destructive" });
      return;
    }
    setUploading(objId);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("references").upload(path, file);
    if (upErr) { toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" }); setUploading(null); return; }
    const { data: ref, error } = await (supabase as any).from("session_references").insert({
      room_id: roomId, session_id: sessionId, author_id: user.id,
      ref_type: "file", url: `storage:references/${path}`, title: file.name,
    }).select().single();
    if (error || !ref) { toast({ title: "Erro", description: error?.message, variant: "destructive" }); setUploading(null); return; }
    await (supabase as any).from("session_objective_references").insert({
      session_id: sessionId, room_id: roomId, objective_step_item_id: objId,
      reference_id: ref.id, created_by: user.id,
    });
    setUploading(null);
    toast({ title: "Arquivo anexado ao objetivo" });
  };

  const detachReference = async (joinId: string, refId: string) => {
    await (supabase as any).from("session_objective_references").delete().eq("id", joinId);
    // Also remove the orphan reference if no other objective uses it
    const { data: remaining } = await (supabase as any)
      .from("session_objective_references").select("id").eq("reference_id", refId);
    if (!remaining || remaining.length === 0) {
      await (supabase as any).from("session_references").delete().eq("id", refId);
    }
  };

  if (!sessionId) return null;

  return (
    <div className="space-y-4">
      <div className="clinical-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Objetivos do P5 — Evidências do P6</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Cada objetivo definido no P5 é uma coluna. Anexe aqui as referências usadas no estudo individual (P6) para sustentar a discussão do P7.
        </p>

        {objectives.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Nenhum objetivo foi registrado no P5 desta sessão.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {objectives.map((obj: any) => {
              const objRefs = refsForObjective(obj.id);
              const linkState = links[obj.id] || { url: "", title: "", show: false };
              return (
                <div key={obj.id} className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground leading-snug">{obj.content}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Proposto por {(obj.profiles as any)?.full_name || "—"}
                    </p>
                  </div>

                  <div className="flex-1 space-y-1.5 min-h-[40px]">
                    {objRefs.length === 0 ? (
                      <p className="text-[11px] italic text-muted-foreground/70 text-center py-2">
                        Sem referências anexadas
                      </p>
                    ) : objRefs.map((ref: any) => {
                      const join = (ref.session_objective_references || []).find((j: any) => j.objective_step_item_id === obj.id);
                      const canDelete = isProfessor || join?.created_by === user?.id;
                      return (
                        <div key={ref.id} className="group flex items-center gap-2 rounded-lg bg-background/70 px-2.5 py-2 text-xs">
                          {ref.ref_type === "link" ? <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" /> : <FileUp className="h-3.5 w-3.5 shrink-0 text-primary" />}
                          <button onClick={() => openFile(ref)} className="flex-1 truncate text-left hover:text-primary hover:underline">
                            {ref.title}
                          </button>
                          <span className="text-[10px] text-muted-foreground shrink-0 hidden md:inline">
                            {(ref.profiles as any)?.full_name?.split(" ")[0]}
                          </span>
                          <button onClick={() => openFile(ref)} className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="h-3 w-3" />
                          </button>
                          {canDelete && (
                            <button onClick={() => detachReference(join.id, ref.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add controls */}
                  <div className="space-y-1.5 pt-1 border-t border-border/60">
                    {linkState.show ? (
                      <div className="space-y-1.5">
                        <Input value={linkState.url} onChange={(e) => setLinks((s) => ({ ...s, [obj.id]: { ...linkState, url: e.target.value } }))} placeholder="URL" className="h-8 text-xs" />
                        <Input value={linkState.title} onChange={(e) => setLinks((s) => ({ ...s, [obj.id]: { ...linkState, title: e.target.value } }))} placeholder="Título (opcional)" className="h-8 text-xs" />
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 text-xs flex-1" onClick={() => addLink(obj.id)} disabled={!linkState.url?.trim()}>Adicionar</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setLinks((s) => ({ ...s, [obj.id]: { ...linkState, show: false } }))}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => setLinks((s) => ({ ...s, [obj.id]: { url: "", title: "", show: true } }))}>
                          <Link2 className="h-3 w-3 mr-1" /> Link
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" disabled={uploading === obj.id} onClick={() => fileRefs.current[obj.id]?.click()}>
                          {uploading === obj.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FileUp className="h-3 w-3 mr-1" />} Arquivo
                        </Button>
                        <input
                          ref={(el) => { fileRefs.current[obj.id] = el; }}
                          type="file" className="hidden" accept=".pdf,.doc,.docx"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(obj.id, f); e.target.value = ""; }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Predetermined objectives — professor only */}
      {isProfessor && predetermined.length > 0 && (
        <Collapsible open={showPredetermined} onOpenChange={setShowPredetermined}>
          <div className="clinical-card p-5 border-amber-500/30 bg-amber-500/5">
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              {showPredetermined ? <ChevronDown className="h-4 w-4 text-amber-700" /> : <ChevronRight className="h-4 w-4 text-amber-700" />}
              <ShieldCheck className="h-5 w-5 text-amber-700" />
              <h3 className="text-base font-semibold text-foreground flex-1">Objetivos pré-determinados (somente tutor)</h3>
              <span className="text-[11px] text-muted-foreground">{predetermined.length}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Compare com o que o grupo escreveu no P5. Use para identificar lacunas durante a discussão.
              </p>
              {predetermined.map((p: any) => (
                <div key={p.id} className="rounded-lg bg-background/70 px-3 py-2 text-sm flex items-start gap-2">
                  {p.is_essential && <span className="text-[10px] font-bold uppercase text-amber-700 mt-0.5">★</span>}
                  <span className="flex-1 text-foreground/90">{p.content}</span>
                </div>
              ))}
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}
    </div>
  );
}
