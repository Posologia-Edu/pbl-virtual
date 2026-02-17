import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, FileEdit, User, MoreVertical, StickyNote, ChevronLeft, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BadgesPanel from "@/components/BadgesPanel";
import { toast } from "@/hooks/use-toast";

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
  onlineUserIds?: Set<string>;
  sessionId?: string | null;
  professorId?: string | null;
}

const roleConfig = {
  coordinator: { label: "Coordenador", icon: Crown, color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  reporter: { label: "Relator", icon: FileEdit, color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  participant: { label: "Participante", icon: User, color: "bg-secondary text-muted-foreground border-border" },
};

export default function ParticipantsPanel({ participants, coordinatorId, reporterId, isProfessor, onAssignRole, onlineUserIds = new Set(), sessionId, professorId }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<Participant | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);

  const getRole = (id: string) => {
    if (id === coordinatorId) return "coordinator";
    if (id === reporterId) return "reporter";
    return "participant";
  };

  // Load note when selecting a student
  const loadNote = useCallback(async (studentId: string) => {
    if (!sessionId || !professorId) return;
    setLoadingNote(true);
    const { data } = await (supabase as any)
      .from("professor_notes")
      .select("content")
      .eq("session_id", sessionId)
      .eq("student_id", studentId)
      .eq("professor_id", professorId)
      .maybeSingle();
    setNoteContent(data?.content || "");
    setLoadingNote(false);
  }, [sessionId, professorId]);

  const handleSelectStudent = (p: Participant) => {
    if (!isProfessor || !sessionId) return;
    setSelectedStudent(p);
    loadNote(p.student_id);
  };

  const saveNote = async () => {
    if (!sessionId || !professorId || !selectedStudent) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("professor_notes")
      .upsert({
        session_id: sessionId,
        student_id: selectedStudent.student_id,
        professor_id: professorId,
        content: noteContent,
      }, { onConflict: "session_id,student_id,professor_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar anotação", variant: "destructive" });
    } else {
      toast({ title: "Anotação salva!" });
    }
  };

  // Sort: online first, then alphabetically
  const sorted = [...participants].sort((a, b) => {
    const aOnline = onlineUserIds.has(a.student_id) ? 0 : 1;
    const bOnline = onlineUserIds.has(b.student_id) ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    return a.full_name.localeCompare(b.full_name);
  });

  // Note view for selected student
  if (selectedStudent) {
    const role = getRole(selectedStudent.student_id);
    const cfg = roleConfig[role];
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedStudent(null)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{selectedStudent.full_name}</p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-0.5 ${cfg.color}`}>
              {cfg.label}
            </Badge>
          </div>
          <StickyNote className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-h-0">
          {loadingNote ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Escreva suas anotações sobre este aluno para o feedback..."
              className="min-h-[200px] h-full resize-none text-sm"
            />
          )}
        </div>

        <Button onClick={saveNote} disabled={saving || loadingNote} className="mt-3 w-full" size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar anotação
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {sorted.map((p) => {
        const role = getRole(p.student_id);
        const cfg = roleConfig[role];
        const Icon = cfg.icon;
        const isOnline = onlineUserIds.has(p.student_id);

        return (
          <div
            key={p.student_id}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-secondary/50 transition-colors group ${isProfessor && sessionId ? "cursor-pointer" : ""}`}
            onClick={() => handleSelectStudent(p)}
          >
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                  isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
              <BadgesPanel userId={p.student_id} compact />
            </div>
            {isProfessor && sessionId && (
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            )}
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
              {cfg.label}
            </Badge>
            {isProfessor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
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
