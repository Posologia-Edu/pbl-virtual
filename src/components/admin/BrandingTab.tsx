import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Palette, Save, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UpgradeOverlay from "@/components/UpgradeOverlay";

interface BrandingTabProps {
  institutions: any[];
  onRefresh: () => void;
  readOnly?: boolean;
}

export default function BrandingTab({ institutions, onRefresh, readOnly }: BrandingTabProps) {
  const { subscription, isAdmin } = useAuth();
  const whitelabelAllowed = subscription.whitelabelEnabled || isAdmin;
  const [selectedId, setSelectedId] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = institutions.find((i) => i.id === selectedId);

  useEffect(() => {
    if (selected) {
      setPrimaryColor(selected.brand_primary_color || "");
      setSecondaryColor(selected.brand_secondary_color || "");
      setAccentColor(selected.brand_accent_color || "");
    }
  }, [selectedId]);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    const { error } = await supabase
      .from("institutions")
      .update({
        brand_primary_color: primaryColor || null,
        brand_secondary_color: secondaryColor || null,
        brand_accent_color: accentColor || null,
      } as any)
      .eq("id", selectedId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Branding atualizado!" });
      onRefresh();
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!selectedId) return;
    setSaving(true);
    await supabase
      .from("institutions")
      .update({
        brand_primary_color: null,
        brand_secondary_color: null,
        brand_accent_color: null,
      } as any)
      .eq("id", selectedId);
    setPrimaryColor("");
    setSecondaryColor("");
    setAccentColor("");
    toast({ title: "Cores restauradas ao padrão" });
    onRefresh();
    setSaving(false);
  };

  const previewStyle = {
    "--preview-primary": primaryColor || "213 60% 42%",
    "--preview-secondary": secondaryColor || "214 20% 92%",
    "--preview-accent": accentColor || "210 76% 52%",
  } as React.CSSProperties;

  if (!whitelabelAllowed) {
    return (
      <UpgradeOverlay
        feature="White-label e Branding"
        description="Personalize as cores da plataforma com o plano Enterprise."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="clinical-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Cores por Instituição (White-label)</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Personalize as cores da plataforma para cada instituição. Os valores devem estar no formato HSL (ex: 213 60% 42%).
        </p>

        {/* Institution selector */}
        <div className="mb-6">
          <Label>Instituição</Label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecione uma instituição</option>
            {institutions.filter((i) => !i.is_hidden).map((inst) => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>

        {selectedId && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cor Primária (HSL)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="213 60% 42%"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    disabled={readOnly}
                  />
                  {primaryColor && (
                    <div
                      className="h-10 w-10 rounded-lg border border-border shrink-0"
                      style={{ backgroundColor: `hsl(${primaryColor})` }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor Secundária (HSL)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="214 20% 92%"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    disabled={readOnly}
                  />
                  {secondaryColor && (
                    <div
                      className="h-10 w-10 rounded-lg border border-border shrink-0"
                      style={{ backgroundColor: `hsl(${secondaryColor})` }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor de Destaque (HSL)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="210 76% 52%"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    disabled={readOnly}
                  />
                  {accentColor && (
                    <div
                      className="h-10 w-10 rounded-lg border border-border shrink-0"
                      style={{ backgroundColor: `hsl(${accentColor})` }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Preview */}
            {(primaryColor || secondaryColor || accentColor) && (
              <div className="rounded-2xl border border-border p-4" style={previewStyle}>
                <p className="text-xs text-muted-foreground mb-2">Prévia:</p>
                <div className="flex gap-3 items-center">
                  <div className="h-10 w-24 rounded-xl flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: `hsl(${primaryColor || "213 60% 42%"})` }}>
                    Primária
                  </div>
                  <div className="h-10 w-24 rounded-xl flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: `hsl(${secondaryColor || "214 20% 92%"})` }}>
                    Secundária
                  </div>
                  <div className="h-10 w-24 rounded-xl flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: `hsl(${accentColor || "210 76% 52%"})` }}>
                    Destaque
                  </div>
                </div>
              </div>
            )}

            {!readOnly && (
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl">
                <Save className="h-4 w-4" /> Salvar
              </Button>
              <Button onClick={handleReset} variant="outline" disabled={saving} className="gap-2 rounded-xl">
                <RotateCcw className="h-4 w-4" /> Restaurar Padrão
              </Button>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
