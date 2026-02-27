import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Link2, FileUp, Trash2, ExternalLink, FileText, Plus, Loader2 } from "lucide-react";

interface Props {
  roomId: string;
  sessionId?: string;
  readOnly?: boolean;
}

export default function ReferencesPanel({ roomId, sessionId, readOnly }: Props) {
  const { user } = useAuth();
  const [references, setReferences] = useState<any[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReferences();

    const channel = supabase
      .channel(`refs-${roomId}-${sessionId || "all"}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "session_references",
        filter: `room_id=eq.${roomId}`,
      }, () => fetchReferences())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, sessionId]);

  const fetchReferences = async () => {
    const q = supabase
      .from("session_references" as any)
      .select("*, profiles!session_references_author_id_profiles_fkey(full_name)")
      .eq("room_id", roomId)
      .order("created_at");
    const { data, error } = sessionId ? await q.eq("session_id", sessionId) : await q;
    if (error) console.error("Fetch references error:", error);
    if (data) setReferences(data as any[]);
  };

  const addLink = async () => {
    if (!user || !linkUrl.trim()) return;
    const url = linkUrl.trim().startsWith("http") ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    const title = linkTitle.trim() || url;

    // Optimistic: add immediately to UI
    const tempId = crypto.randomUUID();
    const optimistic = {
      id: tempId,
      room_id: roomId,
      author_id: user.id,
      ref_type: "link",
      url,
      title,
      session_id: sessionId || null,
      profiles: { full_name: user.user_metadata?.full_name || user.email },
      created_at: new Date().toISOString(),
    };
    setReferences(prev => [...prev, optimistic]);
    setLinkUrl("");
    setLinkTitle("");
    setShowAddLink(false);

    const { error } = await supabase.from("session_references" as any).insert({
      room_id: roomId,
      author_id: user.id,
      ref_type: "link",
      url,
      title,
      ...(sessionId ? { session_id: sessionId } : {}),
    });

    if (error) {
      // Rollback optimistic update
      setReferences(prev => prev.filter(r => r.id !== tempId));
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Referência adicionada!" });
      // Refresh to get real ID and data
      setTimeout(() => fetchReferences(), 500);
    }
  };

  const uploadFile = async (file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo de 20MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Tipo de arquivo não permitido", description: "Apenas PDF e DOC/DOCX são aceitos.", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from("references")
      .upload(path, file);

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    // Optimistic: add immediately to UI
    const tempId = crypto.randomUUID();
    const optimistic = {
      id: tempId,
      room_id: roomId,
      author_id: user.id,
      ref_type: "file",
      url: `storage:references/${path}`,
      title: file.name,
      session_id: sessionId || null,
      profiles: { full_name: user.user_metadata?.full_name || user.email },
      created_at: new Date().toISOString(),
    };
    setReferences(prev => [...prev, optimistic]);

    const { error } = await supabase.from("session_references" as any).insert({
      room_id: roomId,
      author_id: user.id,
      ref_type: "file",
      url: `storage:references/${path}`,
      title: file.name,
      ...(sessionId ? { session_id: sessionId } : {}),
    });

    setUploading(false);
    if (error) {
      setReferences(prev => prev.filter(r => r.id !== tempId));
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Arquivo enviado!" });
      setTimeout(() => fetchReferences(), 500);
    }
  };

  const getFileUrl = useCallback(async (ref: any): Promise<string | null> => {
    if (ref.ref_type !== "file") return ref.url;
    // Handle new storage path format
    if (ref.url?.startsWith("storage:references/")) {
      const path = ref.url.replace("storage:references/", "");
      const { data } = await supabase.storage.from("references").createSignedUrl(path, 3600);
      return data?.signedUrl || null;
    }
    // Handle legacy public URLs — extract path and create signed URL
    const pathMatch = ref.url?.split("/references/")[1];
    if (pathMatch) {
      const decoded = decodeURIComponent(pathMatch);
      const { data } = await supabase.storage.from("references").createSignedUrl(decoded, 3600);
      return data?.signedUrl || null;
    }
    return ref.url;
  }, []);

  const openFile = async (ref: any) => {
    const url = await getFileUrl(ref);
    if (url) window.open(url, "_blank");
    else toast({ title: "Erro ao abrir arquivo", variant: "destructive" });
  };

  const deleteReference = async (ref: any) => {
    // Delete storage file if it's a file type
    if (ref.ref_type === "file") {
      let storagePath: string | undefined;
      if (ref.url?.startsWith("storage:references/")) {
        storagePath = ref.url.replace("storage:references/", "");
      } else {
        const pathMatch = ref.url?.split("/references/")[1];
        if (pathMatch) storagePath = decodeURIComponent(pathMatch);
      }
      if (storagePath) {
        await supabase.storage.from("references").remove([storagePath]);
      }
    }
    setReferences(prev => prev.filter(r => r.id !== ref.id));
    const { error } = await supabase.from("session_references" as any).delete().eq("id", ref.id);
    if (!error) {
      toast({ title: "Referência removida" });
    } else {
      fetchReferences(); // rollback on error
    }
  };

  return (
    <div className="clinical-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Referências e Fontes
        </h4>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddLink(!showAddLink)}
              className="text-xs"
            >
              <Link2 className="mr-1 h-3.5 w-3.5" /> Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs"
            >
              {uploading ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileUp className="mr-1 h-3.5 w-3.5" />
              )}
              PDF
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      {/* Add link form */}
      {showAddLink && !readOnly && (
        <div className="mb-4 space-y-2 rounded-xl border border-border p-3 animate-fade-in">
          <Input
            placeholder="URL da referência"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="text-sm"
          />
          <Input
            placeholder="Título (opcional)"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addLink} disabled={!linkUrl.trim()} className="text-xs">
              <Plus className="mr-1 h-3 w-3" /> Adicionar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddLink(false)} className="text-xs">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* References list */}
      {references.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          Nenhuma referência adicionada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {references.map((ref) => (
            <div
              key={ref.id}
              className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5 group"
            >
              {ref.ref_type === "link" ? (
                <Link2 className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-primary" />
              )}
              <div className="min-w-0 flex-1">
                {ref.ref_type === "file" ? (
                  <button
                    onClick={() => openFile(ref)}
                    className="text-sm text-foreground hover:text-primary hover:underline truncate block text-left w-full"
                  >
                    {ref.title || "Arquivo"}
                  </button>
                ) : (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-foreground hover:text-primary hover:underline truncate block"
                  >
                    {ref.title || ref.url}
                  </a>
                )}
                <p className="text-[10px] text-muted-foreground truncate">
                  {(ref.profiles as any)?.full_name || "—"}
                </p>
              </div>
              <button
                onClick={() => ref.ref_type === "file" ? openFile(ref) : window.open(ref.url, "_blank")}
                className="shrink-0 text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
              {!readOnly && ref.author_id === user?.id && (
                <button
                  onClick={() => deleteReference(ref)}
                  className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
