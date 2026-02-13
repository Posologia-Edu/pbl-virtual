import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, BookOpen } from "lucide-react";

interface Props {
  institutions: any[];
  courses: any[];
  selectedInstitutionId: string;
  selectedCourseId: string;
  onInstitutionChange: (id: string) => void;
  onCourseChange: (id: string) => void;
}

export default function CourseContextSelector({
  institutions,
  courses,
  selectedInstitutionId,
  selectedCourseId,
  onInstitutionChange,
  onCourseChange,
}: Props) {
  const filteredCourses = selectedInstitutionId
    ? courses.filter((c) => c.institution_id === selectedInstitutionId)
    : courses;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-6">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Building2 className="h-4 w-4" />
        <span>Contexto:</span>
      </div>
      <Select value={selectedInstitutionId} onValueChange={(v) => { onInstitutionChange(v); onCourseChange(""); }}>
        <SelectTrigger className="w-[220px] bg-card">
          <SelectValue placeholder="Selecionar instituição" />
        </SelectTrigger>
        <SelectContent>
          {institutions.map((i) => (
            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedInstitutionId && (
        <>
          <BookOpen className="h-4 w-4 text-primary" />
          <Select value={selectedCourseId} onValueChange={onCourseChange}>
            <SelectTrigger className="w-[220px] bg-card">
              <SelectValue placeholder="Selecionar curso" />
            </SelectTrigger>
            <SelectContent>
              {filteredCourses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
      {!selectedInstitutionId && (
        <p className="text-xs text-muted-foreground">Selecione uma instituição e curso para gerenciar os dados vinculados.</p>
      )}
    </div>
  );
}
