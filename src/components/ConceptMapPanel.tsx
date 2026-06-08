import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Brain, Loader2, RefreshCw, Eye } from "lucide-react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface Props {
  roomId: string;
  sessionId: string | undefined;
  phase: "opening" | "closing";
  isProfessor: boolean;
  isReporter: boolean;
}

const KIND_COLOR: Record<string, string> = {
  problem: "hsl(0 70% 92%)",
  hypothesis: "hsl(35 95% 90%)",
  concept: "hsl(220 80% 92%)",
  objective: "hsl(140 60% 88%)",
  term: "hsl(280 60% 92%)",
};

const KIND_LABEL: Record<string, string> = {
  problem: "Problema",
  hypothesis: "Hipótese",
  concept: "Conceito",
  objective: "Objetivo",
  term: "Termo",
};

export default function ConceptMapPanel({ roomId, sessionId, phase, isProfessor, isReporter }: Props) {
  const { user } = useAuth();
  const [mapRow, setMapRow] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [otherMap, setOtherMap] = useState<any>(null);
  const [localNodes, setLocalNodes] = useState<Node[]>([]);
  const canEdit = isProfessor || isReporter;

  // Fetch map for this phase
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const run = async () => {
      const { data } = await (supabase as any)
        .from("session_concept_maps")
        .select("*")
        .eq("session_id", sessionId)
        .eq("phase", phase)
        .maybeSingle();
      if (!cancelled) setMapRow(data || null);
    };
    run();

    const ch = supabase
      .channel(`cmap-${sessionId}-${phase}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "session_concept_maps", filter: `session_id=eq.${sessionId}` },
        async () => {
          const { data } = await (supabase as any)
            .from("session_concept_maps")
            .select("*")
            .eq("session_id", sessionId)
            .eq("phase", phase)
            .maybeSingle();
          if (!cancelled) setMapRow(data || null);
        }
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [sessionId, phase]);

  // Fetch the OTHER phase map for diff comparison
  useEffect(() => {
    if (!sessionId) return;
    const other = phase === "opening" ? "closing" : "opening";
    (async () => {
      const { data } = await (supabase as any)
        .from("session_concept_maps")
        .select("nodes, edges, phase")
        .eq("session_id", sessionId)
        .eq("phase", other)
        .maybeSingle();
      setOtherMap(data || null);
    })();
  }, [sessionId, phase, mapRow?.updated_at]);

  // Build React Flow nodes/edges
  const rfNodes = useMemo<Node[]>(() => {
    const src = (mapRow?.nodes || []) as any[];
    return src.map((n) => ({
      id: n.id,
      position: { x: n.x ?? 0, y: n.y ?? 0 },
      data: { label: n.label },
      style: {
        background: KIND_COLOR[n.kind] || "hsl(var(--secondary))",
        border: "1px solid hsl(var(--border))",
        color: "hsl(var(--foreground))",
        borderRadius: 12,
        padding: "8px 12px",
        fontSize: 12,
        fontWeight: 500,
        maxWidth: 180,
      },
    }));
  }, [mapRow]);

  useEffect(() => { setLocalNodes(rfNodes); }, [rfNodes]);

  const rfEdges = useMemo<Edge[]>(() => {
    const src = (mapRow?.edges || []) as any[];
    return src.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      animated: false,
      style: { stroke: "hsl(var(--primary) / 0.6)" },
      labelStyle: { fontSize: 10, fill: "hsl(var(--foreground))" },
      labelBgStyle: { fill: "hsl(var(--background))" },
    }));
  }, [mapRow]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setLocalNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const persistLayout = async () => {
    if (!mapRow?.id) return;
    const updated = (mapRow.nodes || []).map((n: any) => {
      const rf = localNodes.find((x) => x.id === n.id);
      return rf ? { ...n, x: rf.position.x, y: rf.position.y } : n;
    });
    const { error } = await (supabase as any)
      .from("session_concept_maps")
      .update({ nodes: updated, is_manual_edit: true })
      .eq("id", mapRow.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Layout salvo" });
  };

  const generate = async () => {
    if (!sessionId || !roomId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-concept-map", {
        body: { room_id: roomId, session_id: sessionId, phase },
      });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      } else if (data?.map) {
        setMapRow(data.map);
        toast({ title: mapRow ? "Mapa atualizado" : "Mapa gerado!" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Erro inesperado", variant: "destructive" });
    }
    setGenerating(false);
  };

  // Diff metrics (opening vs closing)
  const diff = useMemo(() => {
    if (!mapRow || !otherMap) return null;
    const opening = phase === "opening" ? mapRow : otherMap;
    const closing = phase === "closing" ? mapRow : otherMap;
    const openLabels = new Set((opening.nodes || []).map((n: any) => (n.label || "").toLowerCase()));
    const closeLabels = new Set((closing.nodes || []).map((n: any) => (n.label || "").toLowerCase()));
    const added = [...closeLabels].filter((l) => !openLabels.has(l));
    const removed = [...openLabels].filter((l) => !closeLabels.has(l));
    return {
      openCount: openLabels.size,
      closeCount: closeLabels.size,
      added,
      removed,
      growth: closeLabels.size - openLabels.size,
    };
  }, [mapRow, otherMap, phase]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Mapa Conceitual — {phase === "opening" ? "Abertura" : "Fechamento"}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {otherMap && (
            <Button variant="ghost" size="sm" onClick={() => setShowDiff((v) => !v)} title="Comparar abertura × fechamento">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={generate} disabled={generating}>
              {generating ? (
                <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Gerando...</>
              ) : mapRow ? (
                <><RefreshCw className="mr-1 h-3.5 w-3.5" /> Regenerar</>
              ) : (
                <><Brain className="mr-1 h-3.5 w-3.5" /> Gerar</>
              )}
            </Button>
          )}
        </div>
      </div>

      {showDiff && diff && (
        <div className="border-b border-border bg-secondary/40 px-4 py-2 text-xs space-y-1">
          <div className="flex items-center gap-3 font-medium">
            <span>Abertura: {diff.openCount} conceitos</span>
            <span>Fechamento: {diff.closeCount} conceitos</span>
            <span className={diff.growth >= 0 ? "text-emerald-700" : "text-amber-700"}>
              ({diff.growth >= 0 ? "+" : ""}{diff.growth})
            </span>
          </div>
          {diff.added.length > 0 && (
            <p className="text-emerald-700">+ Novos: {diff.added.slice(0, 5).join(", ")}{diff.added.length > 5 ? "…" : ""}</p>
          )}
          {diff.removed.length > 0 && (
            <p className="text-muted-foreground">- Removidos: {diff.removed.slice(0, 5).join(", ")}{diff.removed.length > 5 ? "…" : ""}</p>
          )}
        </div>
      )}

      <div className="flex-1 relative bg-muted/20">
        {!mapRow ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <Brain className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Nenhum mapa conceitual gerado ainda. {canEdit ? "Clique em \"Gerar\" para criar a partir das discussões." : "Aguarde o tutor ou relator gerar o mapa."}
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={localNodes}
            edges={rfEdges}
            onNodesChange={canEdit ? onNodesChange : undefined}
            nodesDraggable={canEdit}
            nodesConnectable={false}
            elementsSelectable
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
          </ReactFlow>
        )}
      </div>

      {canEdit && mapRow && (
        <div className="border-t border-border p-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Arraste os nós para reorganizar.</span>
          <Button variant="outline" size="sm" onClick={persistLayout} className="h-7">Salvar layout</Button>
        </div>
      )}

      {mapRow && (
        <div className="border-t border-border px-3 py-2 flex flex-wrap gap-2 text-[10px]">
          {Object.entries(KIND_LABEL).map(([k, l]) => (
            <span key={k} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: KIND_COLOR[k] }}>
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
