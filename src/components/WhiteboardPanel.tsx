import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Eraser, Pen, Type, Share2, Undo2, Trash2,
  Square, Circle, Triangle, Minus, ArrowRight,
  Diamond, MousePointer,
} from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

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
  type: "text" | "rect" | "circle" | "triangle" | "diamond" | "line" | "arrow";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  color: string;
  lineWidth: number;
  // For line/arrow: endpoint
  x2?: number;
  y2?: number;
}

interface Props {
  onShareToChat: (imageDataUrl: string) => void;
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

export default function WhiteboardPanel({ onShareToChat }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#1a1a2e");
  const [lineWidth, setLineWidth] = useState(2);

  // Freehand drawing stored as image snapshots for undo
  const [history, setHistory] = useState<string[]>([]);
  // Objects layer (shapes, text, lines, arrows)
  const [objects, setObjects] = useState<WhiteboardObject[]>([]);
  const [objectsHistory, setObjectsHistory] = useState<WhiteboardObject[][]>([]);

  // Shape drawing state
  const shapeStart = useRef<{ x: number; y: number } | null>(null);

  // Select / drag state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number; ox2?: number; oy2?: number } | null>(null);

  // Inline text editing
  const [editingText, setEditingText] = useState<{ x: number; y: number } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // -- resize canvas --
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

  // -- redraw everything when objects change --
  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, selectedId]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // Restore freehand base from last history entry
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (history.length > 0) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        drawObjects(ctx);
      };
      img.src = history[history.length - 1];
    } else {
      drawObjects(ctx);
    }
  }, [history, objects, selectedId]);

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
        case "rect":
          ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
          break;
        case "circle": {
          const cx = obj.x + obj.width / 2;
          const cy = obj.y + obj.height / 2;
          const rx = Math.abs(obj.width / 2);
          const ry = Math.abs(obj.height / 2);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case "triangle": {
          ctx.beginPath();
          ctx.moveTo(obj.x + obj.width / 2, obj.y);
          ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
          ctx.lineTo(obj.x, obj.y + obj.height);
          ctx.closePath();
          ctx.stroke();
          break;
        }
        case "diamond": {
          ctx.beginPath();
          ctx.moveTo(obj.x + obj.width / 2, obj.y);
          ctx.lineTo(obj.x + obj.width, obj.y + obj.height / 2);
          ctx.lineTo(obj.x + obj.width / 2, obj.y + obj.height);
          ctx.lineTo(obj.x, obj.y + obj.height / 2);
          ctx.closePath();
          ctx.stroke();
          break;
        }
        case "line": {
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(obj.x2 ?? obj.x, obj.y2 ?? obj.y);
          ctx.stroke();
          break;
        }
        case "arrow": {
          const x2 = obj.x2 ?? obj.x;
          const y2 = obj.y2 ?? obj.y;
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          // Arrowhead
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
        case "text": {
          ctx.font = "16px sans-serif";
          ctx.fillText(obj.text || "", obj.x, obj.y + 16);
          break;
        }
      }

      // Selection outline
      if (obj.id === selectedId) {
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
        } else {
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

  const saveCanvasSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Only save the freehand layer (without objects)
    // We'll just save the current full canvas as a data URL
  };

  const saveFreehandSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Draw only freehand (clear, draw freehand base, save, then redraw objects)
    const dataUrl = canvas.toDataURL("image/png");
    setHistory((prev) => [...prev.slice(-20), dataUrl]);
  };

  const pushObjectsHistory = () => {
    setObjectsHistory((prev) => [...prev.slice(-20), [...objects]]);
  };

  // -- Hit test for select tool --
  const hitTest = (x: number, y: number): WhiteboardObject | null => {
    // Reverse order so topmost objects are hit first
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
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

  // -- Mouse handlers --
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);

    if (tool === "select") {
      const hit = hitTest(pos.x, pos.y);
      setSelectedId(hit?.id ?? null);
      if (hit) {
        pushObjectsHistory();
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
      pushObjectsHistory();
      shapeStart.current = pos;
      setIsDrawing(true);
      return;
    }

    // pen / eraser
    saveFreehandSnapshot();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getPos(e);

    // Dragging selected object
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

    // Shape preview
    if (shapeStart.current && ["rect", "circle", "triangle", "diamond", "line", "arrow"].includes(tool)) {
      // We create/update a temporary object
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
      return;
    }

    // Freehand pen / eraser
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = tool === "eraser" ? 20 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (tool === "select") {
      dragStart.current = null;
      return;
    }

    if (shapeStart.current && isDrawing) {
      // Finalize shape – replace temp id with real id
      setObjects((prev) =>
        prev.map((o) => (o.id === "__drawing__" ? { ...o, id: crypto.randomUUID() } : o))
      );
      shapeStart.current = null;
    }

    // Save freehand snapshot after pen/eraser stroke
    if (tool === "pen" || tool === "eraser") {
      // Snapshot the canvas (which has freehand drawn on it)
      const canvas = canvasRef.current;
      if (canvas) {
        // We need to save only the freehand part. Since objects are drawn in redraw,
        // we capture the current state before objects overlay gets redrawn next cycle.
        const dataUrl = canvas.toDataURL("image/png");
        setHistory((prev) => [...prev.slice(-20), dataUrl]);
      }
    }

    setIsDrawing(false);
  };

  const handleTextSubmit = (text: string) => {
    if (!editingText || !text.trim()) {
      setEditingText(null);
      return;
    }
    pushObjectsHistory();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
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
    // Undo objects first, then freehand
    if (objectsHistory.length > 0) {
      const prev = objectsHistory[objectsHistory.length - 1];
      setObjects(prev);
      setObjectsHistory((h) => h.slice(0, -1));
      return;
    }
    if (history.length > 1) {
      setHistory((h) => h.slice(0, -1));
    } else if (history.length === 1) {
      setHistory([]);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const clearCanvas = () => {
    pushObjectsHistory();
    if (history.length > 0) {
      setHistory((prev) => [...prev]); // keep freehand history for undo
    }
    setObjects([]);
    setHistory([]);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    pushObjectsHistory();
    setObjects((prev) => prev.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  };

  const shareToChat = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ensure objects are drawn on canvas for sharing
    const ctx = canvas.getContext("2d");
    if (ctx) drawObjects(ctx);
    const dataUrl = canvas.toDataURL("image/png");
    onShareToChat(dataUrl);
  };

  // Handle keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && tool === "select" && document.activeElement?.tagName !== "INPUT") {
          deleteSelected();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, tool]);

  const currentShapeTool = SHAPE_TOOLS.find((s) => s.tool === tool);
  const currentLineTool = LINE_TOOLS.find((l) => l.tool === tool);

  const COLORS = ["#1a1a2e", "#e74c3c", "#2ecc71", "#3498db", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22"];

  const getCursor = () => {
    if (tool === "select") return "cursor-default";
    if (tool === "text") return "cursor-text";
    if (tool === "eraser") return "cursor-cell";
    return "cursor-crosshair";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-border px-3 py-1.5 flex items-center gap-1 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground mr-2">Whiteboard</h3>

        {/* Select */}
        <Button variant={tool === "select" ? "default" : "outline"} size="icon" className="h-7 w-7" onClick={() => setTool("select")} title="Selecionar / Mover">
          <MousePointer className="h-3.5 w-3.5" />
        </Button>

        {/* Pen */}
        <Button variant={tool === "pen" ? "default" : "outline"} size="icon" className="h-7 w-7" onClick={() => setTool("pen")} title="Caneta">
          <Pen className="h-3.5 w-3.5" />
        </Button>

        {/* Eraser */}
        <Button variant={tool === "eraser" ? "default" : "outline"} size="icon" className="h-7 w-7" onClick={() => setTool("eraser")} title="Borracha">
          <Eraser className="h-3.5 w-3.5" />
        </Button>

        {/* Text */}
        <Button variant={tool === "text" ? "default" : "outline"} size="icon" className="h-7 w-7" onClick={() => setTool("text")} title="Texto">
          <Type className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Shapes dropdown */}
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

        {/* Lines dropdown */}
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

        {/* Colors */}
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

        {/* Line width */}
        <input type="range" min={1} max={8} value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="w-16 h-4 ml-1" title="Espessura" />

        <div className="w-px h-5 bg-border mx-0.5" />

        <Button variant="outline" size="icon" className="h-7 w-7" onClick={undo} title="Desfazer">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={clearCanvas} title="Limpar">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5" />

        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={shareToChat}>
          <Share2 className="h-3.5 w-3.5" /> Compartilhar
        </Button>
      </div>

      {/* Canvas area */}
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
        {/* Inline text input */}
        {editingText && (
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
