import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, FileEdit, User, MoreVertical } from "lucide-react";

interface Participant {
  student_id: string;
  full_name: string;
}

interface Props {
  participants: Participant[];
  coordinatorId: string | null;
  reporterId: string | null;
  isProfessor: boolean;
  onAssignRole: (studentId: string, role: "coordinator" | "reporter" | "none") => void;
}

const roleConfig = {
  coordinator: { label: "Coordenador", icon: Crown, color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  reporter: { label: "Relator", icon: FileEdit, color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  participant: { label: "Participante", icon: User, color: "bg-secondary text-muted-foreground border-border" },
};

export default function ParticipantsPanel({ participants, coordinatorId, reporterId, isProfessor, onAssignRole }: Props) {
  const getRole = (id: string) => {
    if (id === coordinatorId) return "coordinator";
    if (id === reporterId) return "reporter";
    return "participant";
  };

  return (
    <div className="space-y-1.5">
      {participants.map((p) => {
        const role = getRole(p.student_id);
        const cfg = roleConfig[role];
        const Icon = cfg.icon;

        return (
          <div key={p.student_id} className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-secondary/50 transition-colors group">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
            </div>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
              {cfg.label}
            </Badge>
            {isProfessor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onAssignRole(p.student_id, "coordinator")}>
                    <Crown className="mr-2 h-3.5 w-3.5 text-amber-600" /> Coordenador
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAssignRole(p.student_id, "reporter")}>
                    <FileEdit className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Relator
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAssignRole(p.student_id, "none")}>
                    <User className="mr-2 h-3.5 w-3.5" /> Participante
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}
