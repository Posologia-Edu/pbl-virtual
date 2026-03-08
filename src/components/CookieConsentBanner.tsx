import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCookieConsent, type CookiePreferences } from "@/hooks/useCookieConsent";

const categories: { key: keyof CookiePreferences; label: string; desc: string; disabled?: boolean }[] = [
  { key: "essential", label: "Essenciais", desc: "Necessários para autenticação e funcionamento básico da plataforma.", disabled: true },
  { key: "analytical", label: "Analíticos", desc: "Nos ajudam a entender como você usa o site para melhorar a experiência." },
  { key: "functional", label: "Funcionais", desc: "Lembram suas preferências como idioma e tema." },
  { key: "marketing", label: "Marketing", desc: "Permitem rastrear a origem do tráfego e medir eficácia de campanhas." },
];

export default function CookieConsentBanner() {
  const { showBanner, acceptAll, rejectNonEssential, updatePreferences, preferences } = useCookieConsent();
  const [showCustomize, setShowCustomize] = useState(false);
  const [tempPrefs, setTempPrefs] = useState<CookiePreferences>({
    essential: true,
    analytical: preferences?.analytical ?? false,
    functional: preferences?.functional ?? false,
    marketing: preferences?.marketing ?? false,
  });

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 inset-x-4 z-[9999] flex justify-center"
      >
        <div className="w-full max-w-2xl rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl shadow-black/10 p-6">
          {!showCustomize ? (
            <>
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Utilizamos cookies</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Usamos cookies para melhorar sua experiência, analisar o tráfego e personalizar conteúdo.
                    Ao clicar em "Aceitar todos", você concorda com o uso de todos os cookies.{" "}
                    <a href="/cookies" className="text-primary underline">Saiba mais</a>.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowCustomize(true)} className="rounded-full text-xs gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  Personalizar
                </Button>
                <Button size="sm" variant="ghost" onClick={rejectNonEssential} className="rounded-full text-xs">
                  Apenas essenciais
                </Button>
                <Button size="sm" onClick={acceptAll} className="rounded-full text-xs ml-auto">
                  Aceitar todos
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  Preferências de Cookies
                </h3>
                <button onClick={() => setShowCustomize(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 mb-5">
                {categories.map((cat) => (
                  <div key={cat.key} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.desc}</p>
                    </div>
                    <Switch
                      checked={tempPrefs[cat.key]}
                      disabled={cat.disabled}
                      onCheckedChange={(v) => setTempPrefs((p) => ({ ...p, [cat.key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={rejectNonEssential} className="rounded-full text-xs">
                  Rejeitar opcionais
                </Button>
                <Button
                  size="sm"
                  onClick={() => updatePreferences(tempPrefs)}
                  className="rounded-full text-xs"
                >
                  Salvar preferências
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
