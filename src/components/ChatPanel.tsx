import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface Props {
  roomId: string;
  profilesMap?: Record<string, string>; // user_id -> full_name
}

export default function ChatPanel({ roomId, profilesMap = {} }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [localProfiles, setLocalProfiles] = useState<Record<string, string>>(profilesMap);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep localProfiles in sync with prop
  useEffect(() => {
    setLocalProfiles((prev) => ({ ...prev, ...profilesMap }));
  }, [profilesMap]);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at");
      if (data) {
        // Collect unique user_ids we don't have profiles for
        const unknownIds = [...new Set(data.map((m) => m.user_id))].filter(
          (id) => !localProfiles[id]
        );
        if (unknownIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", unknownIds);
          if (profiles) {
            const newMap: Record<string, string> = {};
            profiles.forEach((p) => { newMap[p.user_id] = p.full_name; });
            setLocalProfiles((prev) => ({ ...prev, ...newMap }));
          }
        }
        setMessages(data);
      }
    };
    fetchMessages();

    const channel = supabase
      .channel(`chat-${roomId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const newMsg = payload.new as any;
        // Fetch profile if we don't have it cached
        if (!localProfiles[newMsg.user_id]) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", newMsg.user_id)
            .single();
          if (profile) {
            setLocalProfiles((prev) => ({ ...prev, [newMsg.user_id]: profile.full_name }));
          }
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    await supabase.from("chat_messages").insert({
      room_id: roomId,
      user_id: user.id,
      content: text.trim(),
    });
    setText("");
  };

  const getName = (userId: string) => localProfiles[userId] || "—";

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Chat da Sessão</h3>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2 scrollbar-thin">
        {messages.map((msg) => {
          const isOwn = msg.user_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
              <p className="text-[11px] text-muted-foreground mb-0.5">
                {getName(msg.user_id)}
              </p>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {msg.content?.startsWith("📋 [Whiteboard compartilhado]") ? (
                  <div>
                    <p className="text-xs font-medium mb-1">📋 Whiteboard compartilhado</p>
                    <img
                      src={msg.content.split("\n")[1]}
                      alt="Whiteboard"
                      className="rounded-lg max-w-full border border-border"
                    />
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <Input
          placeholder="Mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="text-sm"
        />
        <Button size="icon" onClick={send} disabled={!text.trim()} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
