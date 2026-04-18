import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { KeyRound, Plus, Copy, CheckCircle2, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}

interface Props {
  institutionId: string;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateApiKey(): { full: string; prefix: string } {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const full = `pbl_live_${body}`;
  const prefix = full.slice(0, 16); // pbl_live_ + 8 hex chars
  return { full, prefix };
}

export default function ApiKeysTab({ institutionId }: Props) {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [allowWrite, setAllowWrite] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchKeys = async () => {
    if (!institutionId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, created_at, last_used_at, revoked_at, expires_at")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setKeys((data as ApiKeyRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, [institutionId]);

  const createKey = async () => {
    if (!newKeyName.trim() || !user || !institutionId) return;
    setCreating(true);
    try {
      const { full, prefix } = generateApiKey();
      const hash = await sha256Hex(full);
      const scopes = allowWrite ? ["read", "write"] : ["read"];
      const { error } = await supabase.from("api_keys").insert({
        institution_id: institutionId,
        name: newKeyName.trim(),
        key_prefix: prefix,
        key_hash: hash,
        scopes,
        created_by: user.id,
      });
      if (error) throw error;
      setCreatedKey(full);
      setNewKeyName("");
      setAllowWrite(false);
      fetchKeys();
    } catch (err: any) {
      toast({ title: "Erro ao criar chave", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    const { error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Chave revogada" }); fetchKeys(); }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  if (!institutionId) {
    return <div className="text-muted-foreground py-8">Selecione uma instituição primeiro.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">API Pública para Integrações</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gere chaves de API para integrar sistemas externos (SIS, LMS) com a plataforma. Consulte a Documentação para a referência completa de endpoints.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setCreatedKey(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nova chave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{createdKey ? "Chave criada com sucesso" : "Criar nova chave de API"}</DialogTitle>
              <DialogDescription>
                {createdKey
                  ? "Copie agora. Por segurança, ela não será exibida novamente."
                  : "Dê um nome descritivo (ex: 'Integração SIS' ou 'LMS Moodle')."}
              </DialogDescription>
            </DialogHeader>
            {createdKey ? (
              <div className="space-y-3">
                <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      Esta é a única vez que você verá esta chave completa. Guarde-a em local seguro.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <code className="flex-1 font-mono text-xs bg-background p-2 rounded border break-all">{createdKey}</code>
                    <Button size="icon" variant="outline" onClick={() => copy(createdKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => { setCreatedKey(null); setDialogOpen(false); }}>Concluído</Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="key-name">Nome</Label>
                    <Input id="key-name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Ex: Integração SIS" maxLength={100} />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <Checkbox id="write-scope" checked={allowWrite} onCheckedChange={(v) => setAllowWrite(!!v)} />
                    <Label htmlFor="write-scope" className="cursor-pointer flex-1">
                      Permitir escrita (criar usuários e cursos)
                      <p className="text-xs text-muted-foreground font-normal mt-0.5">Sem isso, a chave terá apenas leitura.</p>
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={createKey} disabled={creating || !newKeyName.trim()}>
                    {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando…</> : "Criar chave"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando chaves…
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nenhuma chave de API criada ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => {
            const revoked = !!k.revoked_at;
            const expired = k.expires_at && new Date(k.expires_at) < new Date();
            return (
              <div key={k.id} className={`rounded-lg border p-4 ${revoked || expired ? "opacity-60 bg-muted/30" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{k.name}</span>
                      {revoked && <Badge variant="destructive">Revogada</Badge>}
                      {expired && !revoked && <Badge variant="destructive">Expirada</Badge>}
                      {!revoked && !expired && <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Ativa</Badge>}
                      {k.scopes.includes("write") && <Badge variant="secondary">read+write</Badge>}
                      {!k.scopes.includes("write") && <Badge variant="outline">read</Badge>}
                    </div>
                    <code className="text-xs font-mono text-muted-foreground mt-1 block">{k.key_prefix}…</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criada {new Date(k.created_at).toLocaleDateString()}
                      {k.last_used_at ? ` · Último uso ${new Date(k.last_used_at).toLocaleString()}` : " · Nunca usada"}
                    </p>
                  </div>
                  {!revoked && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revogar chave?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A chave <strong>{k.name}</strong> deixará de funcionar imediatamente. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => revokeKey(k.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Revogar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
