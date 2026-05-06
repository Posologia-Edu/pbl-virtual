import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, ClipboardList, UserCheck, Stethoscope } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isProfessor: boolean;
  verdictReady: boolean;       // verdict has content + addresses all objectives + finalized
  evaluationReady: boolean;    // professor has graded everyone
  peerEvalReady: boolean;      // current user already submitted peer-eval (students)
  onOpenEvaluation: () => void;
  onOpenPeerEval: () => void;
  onOpenVerdict: () => void;
}

export default function FinalizeP7Dialog({
  open, onOpenChange, isProfessor,
  verdictReady, evaluationReady, peerEvalReady,
  onOpenEvaluation, onOpenPeerEval, onOpenVerdict,
}: Props) {
  const allReady = verdictReady && (isProfessor ? evaluationReady : peerEvalReady);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Finalizar P7
          </DialogTitle>
          <DialogDescription>
            Antes de encerrar a sessão, conclua os itens abaixo:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <ChecklistRow
            ok={verdictReady}
            icon={<Stethoscope className="h-4 w-4" />}
            title="Conduta Final consolidada"
            description="Bloco de Veredito Clínico preenchido e cobrindo todos os objetivos do P5."
            actionLabel="Abrir Conduta Final"
            onAction={() => { onOpenVerdict(); onOpenChange(false); }}
          />

          {isProfessor ? (
            <ChecklistRow
              ok={evaluationReady}
              icon={<ClipboardList className="h-4 w-4" />}
              title="Avaliação do tutor concluída"
              description="Atribua nota (O/I/PS/S/MS) a cada participante em todos os critérios."
              actionLabel="Abrir Avaliação"
              onAction={() => { onOpenEvaluation(); onOpenChange(false); }}
            />
          ) : (
            <ChecklistRow
              ok={peerEvalReady}
              icon={<UserCheck className="h-4 w-4" />}
              title="Avaliação por Pares enviada"
              description="Avalie cada colega e a si mesmo nos critérios de fechamento."
              actionLabel="Abrir Avaliação por Pares"
              onAction={() => { onOpenPeerEval(); onOpenChange(false); }}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar à sessão</Button>
          <Button disabled={!allReady} onClick={() => onOpenChange(false)}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistRow({ ok, icon, title, description, actionLabel, onAction }: {
  ok: boolean; icon: React.ReactNode; title: string; description: string;
  actionLabel: string; onAction: () => void;
}) {
  return (
    <div className={`rounded-xl border p-3 ${ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
      <div className="flex items-start gap-2">
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />}
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">{icon} {title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {!ok && (
        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs w-full" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
