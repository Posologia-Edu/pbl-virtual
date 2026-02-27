import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface UpgradeOverlayProps {
  feature: string;
  description?: string;
}

export default function UpgradeOverlay({ feature, description }: UpgradeOverlayProps) {
  const navigate = useNavigate();

  return (
    <div className="relative rounded-2xl border border-border bg-card/50 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{feature}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {description || "Este recurso não está disponível no seu plano atual."}
        </p>
        <Button onClick={() => navigate("/pricing")} className="mt-2 gap-2 rounded-xl">
          Fazer Upgrade
        </Button>
      </div>
    </div>
  );
}
