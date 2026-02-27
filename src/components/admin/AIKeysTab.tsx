import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { KeyRound, Eye, EyeOff, Trash2, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProviderConfig {
  id: string;
  name: string;
  placeholder: string;
  docsUrl: string;
}

const PROVIDERS: ProviderConfig[] = [
  { id: "groq", name: "Groq", placeholder: "gsk_...", docsUrl: "https://console.groq.com/keys" },
  { id: "openai", name: "OpenAI", placeholder: "sk-...", docsUrl: "https://platform.openai.com/api-keys" },
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-...", docsUrl: "https://console.anthropic.com/settings/keys" },
  { id: "openrouter", name: "OpenRouter", placeholder: "sk-or-...", docsUrl: "https://openrouter.ai/keys" },
  { id: "google", name: "Google AI", placeholder: "AIza...", docsUrl: "https://aistudio.google.com/apikey" },
];

interface KeyData {
  id: string;
  provider: string;
  api_key_masked: string;
  has_key: boolean;
  is_active: boolean;
  updated_at: string;
}

export default function AIKeysTab() {
  const [keys, setKeys] = useState<KeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const fetchKeys = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "list" },
      });
      if (error) throw error;
      setKeys(data.keys || []);
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar chaves de API.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const saveKey = async (provider: string) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "upsert", provider, api_key: editValue },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Chave salva com sucesso!" });
      setEditingProvider(null);
      setEditValue("");
      fetchKeys();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "delete", key_id: keyId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: "Chave removida." });
      fetchKeys();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const getKeyData = (providerId: string) => keys.find((k) => k.provider === providerId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando chaves de API...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">API Keys externas</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as API Keys das suas LLMs favoritas. Elas serão usadas com prioridade nas funcionalidades de IA da plataforma.
        </p>
        <p className="text-xs text-muted-foreground mt-1 opacity-70">
          Se nenhuma chave estiver configurada, o sistema usará o modelo padrão da plataforma. Se a chamada com sua chave falhar, o sistema fará fallback automático.
        </p>
      </div>

      {PROVIDERS.map((provider) => {
        const keyData = getKeyData(provider.id);
        const isEditing = editingProvider === provider.id;

        return (
          <div
            key={provider.id}
            className={`rounded-lg border p-4 transition-colors ${
              keyData?.has_key
                ? "border-green-500/30 bg-green-500/5"
                : "border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{provider.name}</span>
                {keyData?.has_key && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Configurada
                  </Badge>
                )}
              </div>
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Adquira sua chave de API <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Input
                    type="text"
                    placeholder={provider.placeholder}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => saveKey(provider.id)}
                    disabled={saving || !editValue.trim()}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingProvider(null); setEditValue(""); }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    type={showKey[provider.id] ? "text" : "password"}
                    value={keyData?.api_key_masked || ""}
                    placeholder="Cole aqui sua API Key"
                    readOnly
                    className="flex-1 font-mono text-sm cursor-default"
                    onClick={() => { setEditingProvider(provider.id); setEditValue(""); }}
                  />
                  {keyData?.has_key && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowKey((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                        title={showKey[provider.id] ? "Ocultar" : "Mostrar"}
                      >
                        {showKey[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditingProvider(provider.id); setEditValue(""); }}
                  >
                    Editar
                  </Button>
                  {keyData?.has_key && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteKey(keyData.id)}
                      title="Remover chave"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
