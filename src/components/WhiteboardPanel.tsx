import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Eraser, Pen, Type, Share2, Undo2, Trash2,
  Square, Circle, Triangle, Minus, ArrowRight,
  Diamond, MousePointer, Eye,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

type Tool =
  | "select"
  | "pen"
  | "eraser"
  | "text"
  | "line"
  | "arrow"
  | "rect"
  | "circle"
  | "triangle"
  | "diamond";

interface WhiteboardObject {
  id: string;
  type: "text" | "rect" | "circle" | "triangle" | "diamond" | "line" | "arrow" | "stroke";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color: string;
  lineWidth: number;
  x2?: number;
  y2?: number;
  // For freehand stroke
  points?: { x: number; y: number }[];
}

interface Props {
  onShareToChat?: (imageDataUrl: string) => void;
  sessionId?: string | null;
  readOnly?: boolean;
}

const SHAPE_TOOLS: { tool: Tool; icon: typeof Square; label: string }[] = [
  { tool: "rect", icon: Square, label: "Retângulo" },
  { tool: "circle", icon: Circle, label: "Círculo" },
  { tool: "triangle", icon: Triangle, label: "Triângulo" },
  { tool: "diamond", icon: Diamond, label: "Losango" },
];

const LINE_TOOLS: { tool: Tool; icon: typeof Minus; label: string }[] = [
  { tool: "line", icon: Minus, label: "Linha" },
  { tool: "arrow", icon: ArrowRight, label: "Seta" },
];

export default function WhiteboardPanel({ onShareToChat, sessionId, readOnly = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#1a1a2e");
  const [lineWidth, setLineWidth] = useState(2);
  const [objects, setObjects] = useState<WhiteboardObject[]>([]);
  const [historyStack, setHistoryStack] = useState<WhiteboardObject[][]>([]);

  const shapeStart = useRef<{ x: number; y: number } | null>(null);
  const currentStroke = useRef<{ x: number; y: number }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number; ox2?: number; oy2?: number } | null>(null);
  const [editingText, setEditingText] = useState<{ x: number; y: number } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const skipNextSync = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // -- Resize --
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Load initial state from session + Realtime subscription --
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    (supabase as any).from("tutorial_sessions")
      .select("whiteboard_state")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.whiteboard_state?.objects) {
          skipNextSync.current = true;
          setObjects(data.whiteboard_state.objects);
        }
      });

    const ch = supabase.channel(`wb-${sessionId}`, { config: { broadcast: { self: false } } })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "tutorial_sessions", filter: `id=eq.${sessionId}`,
      }, (payload: any) => {
        const next = payload.new?.whiteboard_state?.objects;
        if (Array.isArray(next)) {
          skipNextSync.current = true;
          setObjects(next);
        }
      })
      .on("broadcast", { event: "wb-update" }, (payload: any) => {
        const next = payload?.payload?.objects;
        if (Array.isArray(next)) {
          skipNextSync.current = true;
          setObjects(next);
        }
      })
      .subscribe();

    broadcastChannelRef.current = ch;
    return () => {
      broadcastChannelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [sessionId]);

  // -- Persist on changes (only if can edit) --
  useEffect(() => {
    if (!sessionId || readOnly) return;
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    // Broadcast immediately for low latency
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: "broadcast",
        event: "wb-update",
        payload: { objects },
      });
    }
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await (supabase as any).from("tutorial_sessions")
        .update({ whiteboard_state: { objects } })
        .eq("id", sessionId);
      if (error) console.error("[Whiteboard] save error:", error);
    }, 300);
  }, [objects, sessionId, readOnly]);

  // -- Redraw --
  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, selectedId]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawObjects(ctx);
  }, [objects, selectedId]);

  const drawObjects = (ctx: CanvasRenderingContext2D) => {
    objects.forEach((obj) => {
      ctx.save();
      ctx.strokeStyle = obj.color;
      ctx.fillStyle = obj.color;
      ctx.lineWidth = obj.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "source-over";

      switch (obj.type) {
        case "stroke": {
          if (!obj.points || obj.points.length < 1) break;
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          for (let i = 1; i < obj.points.length; i++) {
            ctx.lineTo(obj.points[i].x, obj.points[i].y);
          }
          ctx.stroke();
          break;
        }
        case "rect":
          ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
          break;
        case "circle": {
          const cx = obj.x + obj.width / 2;
          const cy = obj.y + obj.height / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.abs(obj.width / 2), Math.abs(obj.height / 2), 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case "triangle":
          ctx.beginPath();
          ctx.moveTo(obj.x + obj.width / 2, obj.y);
          ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
          ctx.lineTo(obj.x, obj.y + obj.height);
          ctx.closePath();
          ctx.stroke();
          break;
        case "diamond":
          ctx.beginPath();
          ctx.moveTo(obj.x + obj.width / 2, obj.y);
          ctx.lineTo(obj.x + obj.width, obj.y + obj.height / 2);
          ctx.lineTo(obj.x + obj.width / 2, obj.y + obj.height);
          ctx.lineTo(obj.x, obj.y + obj.height / 2);
          ctx.closePath();
          ctx.stroke();
          break;
        case "line":
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(obj.x2 ?? obj.x, obj.y2 ?? obj.y);
          ctx.stroke();
          break;
        case "arrow": {
          const x2 = obj.x2 ?? obj.x;
          const y2 = obj.y2 ?? obj.y;
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          const angle = Math.atan2(y2 - obj.y, x2 - obj.x);
          const headLen = 12;
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
          break;
        }
        case "text":
          ctx.font = "16px sans-serif";
          ctx.fillText(obj.text || "", obj.x, obj.y + 16);
          break;
      }

      if (obj.id === selectedId && !readOnly) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "hsl(217, 91%, 60%)";
        ctx.lineWidth = 1;
        if (obj.type === "line" || obj.type === "arrow") {
          const minX = Math.min(obj.x, obj.x2 ?? obj.x) - 4;
          const minY = Math.min(obj.y, obj.y2 ?? obj.y) - 4;
          const maxX = Math.max(obj.x, obj.x2 ?? obj.x) + 4;
          const maxY = Math.max(obj.y, obj.y2 ?? obj.y) + 4;
          ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        } else if (obj.type === "text") {
          ctx.strokeRect(obj.x - 2, obj.y - 2, (obj.width || 80) + 4, 24);
        } else if (obj.type !== "stroke") {
          ctx.strokeRect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4);
        }
        ctx.setLineDash([]);
      }
      ctx.restore();
    });
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const pushHistory = () => {
    setHistoryStack((prev) => [...prev.slice(-30), [...objects]]);
  };

  const hitTest = (x: number, y: number): WhiteboardObject | null => {
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (obj.type === "stroke") continue;
      if (obj.type === "line" || obj.type === "arrow") {
        const minX = Math.min(obj.x, obj.x2 ?? obj.x) - 8;
        const minY = Math.min(obj.y, obj.y2 ?? obj.y) - 8;
        const maxX = Math.max(obj.x, obj.x2 ?? obj.x) + 8;
        const maxY = Math.max(obj.y, obj.y2 ?? obj.y) + 8;
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) return obj;
      } else if (obj.type === "text") {
        if (x >= obj.x - 4 && x <= obj.x + (obj.width || 80) + 4 && y >= obj.y - 4 && y <= obj.y + 22) return obj;
      } else {
        if (x >= obj.x && x <= obj.x + obj.width && y >= obj.y && y <= obj.y + obj.height) return obj;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const pos = getPos(e);

    if (tool === "select") {
      const hit = hitTest(pos.x, pos.y);
      setSelectedId(hit?.id ?? null);
      if (hit) {
        pushHistory();
        dragStart.current = { x: pos.x, y: pos.y, ox: hit.x, oy: hit.y, ox2: hit.x2, oy2: hit.y2 };
      }
      return;
    }

    if (tool === "text") {
      setEditingText({ x: pos.x, y: pos.y });
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    if (["rect", "circle", "triangle", "diamond", "line", "arrow"].includes(tool)) {
      pushHistory();
      shapeStart.current = pos;
      setIsDrawing(true);
      return;
    }

    if (tool === "pen") {
      pushHistory();
      currentStroke.current = [pos];
      setIsDrawing(true);
      return;
    }

    if (tool === "eraser") {
      // Erase by clicking on objects
      const hit = hitTest(pos.x, pos.y);
      if (hit) {
        pushHistory();
        setObjects((prev) => prev.filter((o) => o.id !== hit.id));
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const pos = getPos(e);

    if (tool === "select" && dragStart.current && selectedId) {
      const dx = pos.x - dragStart.current.x;
      const dy = pos.y - dragStart.current.y;
      setObjects((prev) =>
        prev.map((o) =>
          o.id === selectedId
            ? {
                ...o,
                x: dragStart.current!.ox + dx,
                y: dragStart.current!.oy + dy,
                ...(o.x2 !== undefined ? { x2: (dragStart.current!.ox2 ?? 0) + dx } : {}),
                ...(o.y2 !== undefined ? { y2: (dragStart.current!.oy2 ?? 0) + dy } : {}),
              }
            : o
        )
      );
      return;
    }

    if (!isDrawing) return;

    if (tool === "pen") {
      currentStroke.current.push(pos);
      // Live preview without committing to state every frame
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && currentStroke.current.length >= 2) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const a = currentStroke.current[currentStroke.current.length - 2];
        const b = currentStroke.current[currentStroke.current.length - 1];
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    if (shapeStart.current && ["rect", "circle", "triangle", "diamond", "line", "arrow"].includes(tool)) {
      const start = shapeStart.current;
      const w = pos.x - start.x;
      const h = pos.y - start.y;
      const tempId = "__drawing__";
      setObjects((prev) => {
        const filtered = prev.filter((o) => o.id !== tempId);
        const newObj: WhiteboardObject = {
          id: tempId,
          type: tool as WhiteboardObject["type"],
          x: tool === "line" || tool === "arrow" ? start.x : Math.min(start.x, pos.x),
          y: tool === "line" || tool === "arrow" ? start.y : Math.min(start.y, pos.y),
          width: Math.abs(w),
          height: Math.abs(h),
          color,
          lineWidth,
          ...(tool === "line" || tool === "arrow" ? { x2: pos.x, y2: pos.y } : {}),
        };
        return [...filtered, newObj];
      });
    }
  };

  const handleMouseUp = () => {
    if (readOnly) return;
    if (tool === "select") {
      dragStart.current = null;
      return;
    }

    if (tool === "pen" && currentStroke.current.length > 0) {
      const points = currentStroke.current;
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      setObjects((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "stroke",
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
          color,
          lineWidth,
          points,
        },
      ]);
      currentStroke.current = [];
    }

    if (shapeStart.current && isDrawing) {
      setObjects((prev) =>
        prev.map((o) => (o.id === "__drawing__" ? { ...o, id: crypto.randomUUID() } : o))
      );
      shapeStart.current = null;
    }
    setIsDrawing(false);
  };

  const handleTextSubmit = (text: string) => {
    if (!editingText || !text.trim()) {
      setEditingText(null);
      return;
    }
    pushHistory();
    const ctx = canvasRef.current?.getContext("2d");
    let textWidth = 80;
    if (ctx) {
      ctx.font = "16px sans-serif";
      textWidth = ctx.measureText(text).width;
    }
    setObjects((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "text",
        x: editingText.x,
        y: editingText.y,
        width: textWidth,
        height: 20,
        text,
        color,
        lineWidth: 1,
      },
    ]);
    setEditingText(null);
  };

  const undo = () => {
    if (historyStack.length === 0) return;
    const prev = historyStack[historyStack.length - 1];
    setObjects(prev);
    setHistoryStack((h) => h.slice(0, -1));
  };

  const clearCanvas = () => {
    pushHistory();
    setObjects([]);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory();
    setObjects((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  };

  const shareToChat = () => {
    if (!onShareToChat) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onShareToChat(dataUrl);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (readOnly) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && tool === "select" && document.activeElement?.tagName !== "INPUT") {
          deleteSelected();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, tool, readOnly]);

  const currentShapeTool = SHAPE_TOOLS.find((s) => s.tool === tool);
  const currentLineTool = LINE_TOOLS.find((l) => l.tool === tool);
  const COLORS = ["#1a1a2e", "#e74c3c", "#2ecc71", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22"];

  const getCursor = () => {
    if (readOnly) return "cursor-not-allowed";
    if (tool === "select") return "cursor-default";
    if (tool === "text") return "cursor-text";
    if (tool === "eraser") return "cursor-cell";
    return "cursor-crosshair";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-3 py-1.5 flex items-center gap-1 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground mr-2 flex items-center gap-1">
          Whiteboard
          {readOnly && (
            <span className="text-[10px] font-normal text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> ao vivo
            </span>
          )}
        </h3>

        {!readOnly && (
          <>
            <Button variant={tool === "select" ? "default" : "outline"} size="icon" className="h-7 w-7" onClick={() => setTool("select")} title="Selecionar / Mover">
              <MousePointer className="h-3.5 w-3.5" />
            </Button>
            <Button variant={tool === "pen" ? "default" : "outline"} size="icon" className="h-7 w-7" onClick={() => setTool("pen")} title="Caneta">
              <Pen className="h-3.5 w-3.5" />
            </Button>
            <Button variant={tool === "eraser" ? "default" : "outline"} size="icon" className="h-7 w-7" onClick={() => setTool("eraser")} title="Borracha (clique no objeto)">
              <Eraser className="h-3.5 w-3.5" />
            </Button>
            <Button variant={tool === "text" ? "default" : "outline"} size="icon" className="h-7 w-7" onClick={() => setTool("text")} title="Texto">
              <Type className="h-3.5 w-3.5" />
            </Button>

            <div className="w-px h-5 bg-border mx-0.5" />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant={currentShapeTool ? "default" : "outline"} size="icon" className="h-7 w-7" title="Formas">
                  {currentShapeTool ? <currentShapeTool.icon className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1.5 flex gap-1" side="bottom" align="start">
                {SHAPE_TOOLS.map((s) => (
                  <Button key={s.tool} variant={tool === s.tool ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setTool(s.tool)} title={s.label}>
                    <s.icon className="h-4 w-4" />
                  </Button>
                ))}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant={currentLineTool ? "default" : "outline"} size="icon" className="h-7 w-7" title="Linhas / Setas">
                  {currentLineTool ? <currentLineTool.icon className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1.5 flex gap-1" side="bottom" align="start">
                {LINE_TOOLS.map((l) => (
                  <Button key={l.tool} variant={tool === l.tool ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setTool(l.tool)} title={l.label}>
                    <l.icon className="h-4 w-4" />
                  </Button>
                ))}
              </PopoverContent>
            </Popover>

            <div className="w-px h-5 bg-border mx-0.5" />

            <Popover>
              <PopoverTrigger asChild>
                <button className="h-6 w-6 rounded-full border-2 border-border" style={{ backgroundColor: color }} title="Cor" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 grid grid-cols-4 gap-1.5" side="bottom" align="start">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </PopoverContent>
            </Popover>

            <input type="range" min={1} max={8} value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="w-16 h-4 ml-1" title="Espessura" />

            <div className="w-px h-5 bg-border mx-0.5" />

            <Button variant="outline" size="icon" className="h-7 w-7" onClick={undo} title="Desfazer">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={clearCanvas} title="Limpar">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>

            {onShareToChat && (
              <>
                <div className="w-px h-5 bg-border mx-0.5" />
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={shareToChat}>
                  <Share2 className="h-3.5 w-3.5" /> Compartilhar
                </Button>
              </>
            )}
          </>
        )}
      </div>

      <div ref={containerRef} className="flex-1 bg-white relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${getCursor()}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        />
        {editingText && !readOnly && (
          <input
            ref={textInputRef}
            className="absolute bg-transparent border border-primary/50 outline-none text-base px-1 py-0.5 rounded"
            style={{ left: editingText.x, top: editingText.y, minWidth: 100, color }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleTextSubmit((e.target as HTMLInputElement).value);
              } else if (e.key === "Escape") {
                setEditingText(null);
              }
            }}
            onBlur={(e) => handleTextSubmit(e.target.value)}
            placeholder="Digite aqui..."
          />
        )}
      </div>
    </div>
  );
}
