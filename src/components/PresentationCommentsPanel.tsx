import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  MessageCircle, Pin, CheckCircle2, Trash2, Send, ChevronLeft, ChevronRight,
} from "lucide-react";

interface Props {
  roomId: string;
  sessionId: string;
  presentationId: string;
  isProfessor: boolean;
  currentSlide: number;
  onSlideChange: (n: number) => void;
}

export default function PresentationCommentsPanel({
  roomId, sessionId, presentationId, isProfessor, currentSlide, onSlideChange,
}: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [filterCurrent, setFilterCurrent] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("presentation_comments")
      .select("*, profiles!presentation_comments_author_id_profiles_fkey(full_name)")
      .eq("presentation_id", presentationId)
      .order("created_at");
    setComments(data || []);
  }, [presentationId]);

  useEffect(() => { if (presentationId) fetchAll(); }, [presentationId, fetchAll]);

  useEffect(() => {
    if (!presentationId) return;
    const ch = supabase
      .channel(`pc-${presentationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "presentation_comments", filter: `presentation_id=eq.${presentationId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [presentationId, fetchAll]);

  const submit = async () => {
    if (!user || !draft.trim()) return;
    const { error } = await (supabase as any).from("presentation_comments").insert({
      session_id: sessionId, room_id: roomId, presentation_id: presentationId,
      slide_number: currentSlide, author_id: user.id, content: draft.trim(),
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setDraft("");
  };

  const toggleResolved = async (c: any) => {
    await (supabase as any).from("presentation_comments").update({ resolved: !c.resolved }).eq("id", c.id);
  };

  const remove = async (id: string) => {
    await (supabase as any).from("presentation_comments").delete().eq("id", id);
  };

  const visible = filterCurrent ? comments.filter((c) => c.slide_number === currentSlide) : comments;
  const slideStats = comments.reduce((acc: Record<number, number>, c: any) => { acc[c.slide_number] = (acc[c.slide_number] || 0) + 1; return acc; }, {});

  return (
    <div className="clinical-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Comentários ancorados</h4>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onSlideChange(Math.max(1, currentSlide - 1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-1 text-xs px-2">
            <Pin className="h-3 w-3 text-primary" />
            <span>Slide</span>
            <Input
              type="number" min={1} value={currentSlide}
              onChange={(e) => onSlideChange(Math.max(1, parseInt(e.target.value || "1")))}
              className="h-6 w-14 text-xs px-1"
            />
            {slideStats[currentSlide] > 0 && (
              <span className="rounded-full bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 font-medium">
                {slideStats[currentSlide]}
              </span>
            )}
          </div>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onSlideChange(currentSlide + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={filterCurrent} onChange={(e) => setFilterCurrent(e.target.checked)} />
        Mostrar apenas comentários do slide atual
      </label>

      <div className="space-y-2 max-h-72 overflow-auto scrollbar-thin pr-1">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-3">
            Nenhum comentário {filterCurrent ? `no slide ${currentSlide}` : "ainda"}.
          </p>
        ) : visible.map((c: any) => (
          <div key={c.id} className={`rounded-xl border p-2.5 text-xs space-y-1 ${c.resolved ? "border-emerald-500/30 bg-emerald-500/5 opacity-70" : "border-border bg-background/70"}`}>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 font-medium">Slide {c.slide_number}</span>
              <span className="font-medium text-foreground">{(c.profiles as any)?.full_name || "—"}</span>
              <span className="text-muted-foreground ml-auto text-[10px]">{new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <p className="text-foreground/90 whitespace-pre-wrap">{c.content}</p>
            <div className="flex items-center gap-1 pt-1">
              {(isProfessor || c.author_id === user?.id) && (
                <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => toggleResolved(c)}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {c.resolved ? "Reabrir" : "Resolver"}
                </Button>
              )}
              {(isProfessor || c.author_id === user?.id) && (
                <Button size="sm" variant="ghost" className="h-6 text-[11px] text-destructive hover:text-destructive" onClick={() => remove(c.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1 border-t border-border">
        <Textarea
          value={draft} onChange={(e) => setDraft(e.target.value)}
          placeholder={`Comentar no slide ${currentSlide}…`}
          className="min-h-[60px] text-sm"
        />
        <Button onClick={submit} disabled={!draft.trim()} className="shrink-0 self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
