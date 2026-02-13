import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Pen, Type, Share2, Undo2, Trash2 } from "lucide-react";

type Tool = "pen" | "eraser" | "text";

interface Props {
  onShareToChat: (imageDataUrl: string) => void;
}

export default function WhiteboardPanel({ onShareToChat }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [color] = useState("#1a1a2e");
  const [lineWidth, setLineWidth] = useState(2);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Resize canvas to container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Save current content
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      // Restore content
      ctx.putImageData(imageData, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory((prev) => [...prev.slice(-20), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === "text") return;
    saveState();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = tool === "eraser" ? 20 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool !== "text") return;
    saveState();
    const pos = getPos(e);
    const text = prompt("Digite o texto:");
    if (!text) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.font = "14px sans-serif";
    ctx.fillStyle = color;
    ctx.fillText(text, pos.x, pos.y);
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || history.length === 0) return;
    const prev = history[history.length - 1];
    ctx.putImageData(prev, 0, 0);
    setHistory((h) => h.slice(0, -1));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    saveState();
    ctx.clearRect(0, 0, canvas!.width, canvas!.height);
  };

  const shareToChat = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onShareToChat(dataUrl);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground flex-1">Whiteboard — Relator</h3>
        <div className="flex items-center gap-1">
          <Button
            variant={tool === "pen" ? "default" : "outline"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setTool("pen")}
          >
            <Pen className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={tool === "eraser" ? "default" : "outline"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setTool("eraser")}
          >
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={tool === "text" ? "default" : "outline"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setTool("text")}
          >
            <Type className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={undo}>
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={clearCanvas}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={shareToChat}>
            <Share2 className="h-3.5 w-3.5" /> Compartilhar
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-muted/30">
        <label className="text-xs text-muted-foreground">Espessura:</label>
        <input
          type="range"
          min={1}
          max={8}
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="w-20 h-4"
        />
      </div>
      <div ref={containerRef} className="flex-1 bg-white relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${tool === "text" ? "cursor-text" : tool === "eraser" ? "cursor-cell" : "cursor-crosshair"}`}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          onClick={handleCanvasClick}
        />
      </div>
    </div>
  );
}
