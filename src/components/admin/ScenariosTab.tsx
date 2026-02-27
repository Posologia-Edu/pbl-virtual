import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText, Sparkles, Send, Loader2, Copy } from "lucide-react";

interface Props {
  scenarios: any[];
  modules: any[];
  rooms: any[];
  courses: any[];
  institutions: any[];
  groups: any[];
  selectedCourseId: string;
  onRefresh: () => void;
  readOnly?: boolean;
}

export default function ScenariosTab({ scenarios, modules, rooms, courses, institutions, groups, selectedCourseId, onRefresh, readOnly }: Props) {
  const [scenarioTitle, setScenarioTitle] = useState("");
  const [scenarioText, setScenarioText] = useState("");
  const [scenarioModuleId, setScenarioModuleId] = useState("");
  const [scenarioMode, setScenarioMode] = useState<"manual" | "ai">("manual");
  const [aiObjectives, setAiObjectives] = useState("");
  const [generatingScenario, setGeneratingScenario] = useState(false);
  const [aiGlossary, setAiGlossary] = useState<any[]>([]);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);

  const [editingScenario, setEditingScenario] = useState<any | null>(null);
  const [editScenarioTitle, setEditScenarioTitle] = useState("");
  const [editScenarioContent, setEditScenarioContent] = useState("");
  const [editScenarioModuleId, setEditScenarioModuleId] = useState("");
  const [saving, setSaving] = useState(false);

  const [releaseScenarioId, setReleaseScenarioId] = useState<string | null>(null);
  const [releasingScenario, setReleasingScenario] = useState(false);
  const [releaseInstitutionId, setReleaseInstitutionId] = useState("");
  const [releaseCourseId, setReleaseCourseId] = useState("");
  const [releaseModuleId, setReleaseModuleId] = useState("");
  const [releaseGroupId, setReleaseGroupId] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  // Copy scenario dialog
  const [copyingScenario, setCopyingScenario] = useState<any | null>(null);
  const [copyTargetCourseId, setCopyTargetCourseId] = useState("");
  const [copyTargetModuleId, setCopyTargetModuleId] = useState("");

  const filteredScenarios = selectedCourseId
    ? scenarios.filter((s) => s.course_id === selectedCourseId)
    : scenarios;

  const filteredModules = selectedCourseId
    ? modules.filter((m) => m.course_id === selectedCourseId)
    : modules;

  const filteredRooms = selectedCourseId
    ? rooms.filter((r) => {
        // Find groups for this course
        return r.status === "active";
      })
    : rooms.filter((r) => r.status === "active");

  const saveScenario = async () => {
    if (!scenarioTitle.trim() || !scenarioText.trim()) return;
    const { error } = await supabase.from("scenarios").insert({
      title: scenarioTitle.trim(),
      content: scenarioText.trim(),
      module_id: scenarioModuleId || null,
      course_id: selectedCourseId || null,
      tutor_glossary: aiGlossary.length > 0 ? aiGlossary : null,
      tutor_questions: aiQuestions.length > 0 ? aiQuestions : null,
    });
    if (error) {
      toast({ title: "Erro", description: "Falha ao salvar cenário.", variant: "destructive" });
    } else {
      toast({ title: "Cenário salvo na biblioteca!" });
      setScenarioTitle(""); setScenarioText(""); setScenarioModuleId("");
      setAiGlossary([]); setAiQuestions([]); setAiObjectives("");
      onRefresh();
    }
  };

  const updateScenario = async () => {
    if (!editingScenario) return;
    setSaving(true);
    const { error } = await supabase.from("scenarios").update({
      title: editScenarioTitle.trim(),
      content: editScenarioContent.trim(),
      module_id: editScenarioModuleId || null,
    }).eq("id", editingScenario.id);
    if (error) {
      toast({ title: "Erro", description: "Falha ao atualizar cenário.", variant: "destructive" });
    } else {
      toast({ title: "Cenário atualizado!" });
      setEditingScenario(null);
      onRefresh();
    }
    setSaving(false);
  };

  const deleteScenario = async (id: string, title: string) => {
    if (!confirm(`Excluir cenário "${title}"?`)) return;
    const { error } = await supabase.from("scenarios").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Falha ao excluir cenário.", variant: "destructive" });
    } else {
      toast({ title: "Cenário excluído!" });
      onRefresh();
    }
  };

  // Computed lists for release dialog filters
  const releaseCoursesForInstitution = releaseInstitutionId
    ? courses.filter((c) => c.institution_id === releaseInstitutionId)
    : [];
  const releaseModulesForCourse = releaseCourseId
    ? modules.filter((m) => m.course_id === releaseCourseId)
    : [];
  const releaseGroupsForFilter = groups.filter((g) => {
    if (releaseCourseId && g.course_id !== releaseCourseId) return false;
    if (releaseModuleId && g.module_id !== releaseModuleId) return false;
    return true;
  });
  const releaseFilteredRooms = rooms.filter((r) => {
    if (r.status !== "active") return false;
    const group = groups.find((g) => g.id === r.group_id);
    if (!group) return false;
    if (releaseCourseId && group.course_id !== releaseCourseId) return false;
    if (releaseModuleId && group.module_id !== releaseModuleId) return false;
    if (releaseGroupId && r.group_id !== releaseGroupId) return false;
    return true;
  });

  const releaseScenarioToRooms = async (scenario: any) => {
    const targetRooms = releaseFilteredRooms.filter((r) => selectedRoomIds.includes(r.id));
    if (targetRooms.length === 0) {
      toast({ title: "Nenhuma sala selecionada", variant: "destructive" });
      return;
    }
    setReleasingScenario(true);
    try {
      const inserts = targetRooms.map((r) => ({
        room_id: r.id,
        scenario_id: scenario.id,
        scenario_content: scenario.content,
        tutor_glossary: scenario.tutor_glossary || null,
        tutor_questions: scenario.tutor_questions || null,
      }));
      const { error } = await (supabase as any).from("room_scenarios").insert(inserts);
      if (error) throw error;
      toast({ title: "Cenário enviado!", description: `Enviado para ${targetRooms.length} sala(s).` });
      setReleaseScenarioId(null);
      setSelectedRoomIds([]);
      onRefresh();
    } catch {
      toast({ title: "Erro", description: "Falha ao enviar cenário.", variant: "destructive" });
    }
    setReleasingScenario(false);
  };

  const copyScenarioToCourse = async () => {
    if (!copyingScenario || !copyTargetCourseId) return;
    setSaving(true);
    const { error } = await supabase.from("scenarios").insert({
      title: copyingScenario.title,
      content: copyingScenario.content,
      course_id: copyTargetCourseId,
      module_id: copyTargetModuleId || null,
      tutor_glossary: copyingScenario.tutor_glossary,
      tutor_questions: copyingScenario.tutor_questions,
    });
    if (error) {
      toast({ title: "Erro", description: "Falha ao copiar cenário.", variant: "destructive" });
    } else {
      const targetCourse = courses.find((c) => c.id === copyTargetCourseId);
      toast({ title: "Cenário copiado!", description: `Copiado para ${targetCourse?.name || "outro curso"}.` });
      setCopyingScenario(null);
      setCopyTargetCourseId("");
      setCopyTargetModuleId("");
      onRefresh();
    }
    setSaving(false);
  };

  if (!selectedCourseId) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
        <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Selecione uma instituição e curso acima para gerenciar os cenários.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Create scenario */}
      {!readOnly && (
      <div className="clinical-card p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">Criar Cenário Clínico</h3>
        <div className="flex gap-2 mb-4">
          <Button variant={scenarioMode === "manual" ? "default" : "outline"} size="sm" onClick={() => setScenarioMode("manual")}>
            <Pencil className="mr-2 h-4 w-4" /> Inserir Manualmente
          </Button>
          <Button variant={scenarioMode === "ai" ? "default" : "outline"} size="sm" onClick={() => setScenarioMode("ai")}>
            <Sparkles className="mr-2 h-4 w-4" /> Gerar com IA
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título do Cenário</Label>
              <Input placeholder="Ex: Caso Hipertensão Arterial" value={scenarioTitle} onChange={(e) => setScenarioTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select value={scenarioModuleId} onValueChange={setScenarioModuleId}>
                <SelectTrigger><SelectValue placeholder="Associar a um módulo (opcional)" /></SelectTrigger>
                <SelectContent>
                  {filteredModules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {scenarioMode === "manual" ? (
            <>
              <div className="space-y-2">
                <Label>Texto do Problema / Caso Clínico</Label>
                <Textarea
                  placeholder="Cole ou escreva o cenário clínico aqui..."
                  value={scenarioText}
                  onChange={(e) => setScenarioText(e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Termos Desconhecidos</Label>
                <Textarea
                  placeholder={"Insira um termo por linha no formato:\nTermo: Definição\n\nEx:\nHipertensão: Pressão arterial elevada\nDispneia: Dificuldade respiratória"}
                  value={aiGlossary.map((g: any) => `${g.term}: ${g.definition}`).join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value.split("\n").filter((l) => l.trim());
                    setAiGlossary(lines.map((line) => {
                      const [term, ...rest] = line.split(":");
                      return { term: term?.trim() || "", definition: rest.join(":").trim() };
                    }));
                  }}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Possíveis Intervenções</Label>
                <Textarea
                  placeholder={"Insira uma intervenção por linha.\n\nEx:\nQuais fatores de risco estão presentes?\nComo os sintomas se relacionam?"}
                  value={aiQuestions.join("\n")}
                  onChange={(e) => {
                    setAiQuestions(e.target.value.split("\n").filter((l) => l.trim()));
                  }}
                  className="min-h-[100px]"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Objetivos de Aprendizagem</Label>
                <Textarea
                  placeholder="Liste os objetivos de aprendizagem..."
                  value={aiObjectives}
                  onChange={(e) => setAiObjectives(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <Button
                onClick={async () => {
                  if (!aiObjectives.trim()) return;
                  setGeneratingScenario(true);
                  try {
                    // Determine institution_id from the selected course
                    const selectedCourse = courses.find((c) => c.id === selectedCourseId);
                    const instId = selectedCourse?.institution_id || institutions[0]?.id || null;

                    const { data, error } = await supabase.functions.invoke("generate-scenario", {
                      body: { objectives: aiObjectives, institution_id: instId },
                    });
                    if (error) {
                      // supabase.functions.invoke wraps non-2xx as error; try to parse the body
                      let msg = "Falha ao gerar cenário.";
                      if (data?.error) msg = data.error;
                      else if (error.message) msg = error.message;
                      toast({ title: "Erro", description: msg, variant: "destructive" });
                    } else if (data?.error) {
                      toast({ title: "Erro", description: data.error, variant: "destructive" });
                    } else {
                      setScenarioText(data.scenario || "");
                      setAiGlossary(data.glossary || []);
                      setAiQuestions(data.questions || []);
                      toast({ title: "Cenário gerado!", description: "Revise o texto antes de salvar." });
                    }
                  } catch {
                    toast({ title: "Erro", description: "Falha ao gerar cenário.", variant: "destructive" });
                  }
                  setGeneratingScenario(false);
                }}
                disabled={generatingScenario || !aiObjectives.trim()}
              >
                {generatingScenario ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Gerar Cenário</>
                )}
              </Button>
              {scenarioText && (
                <div className="space-y-2">
                  <Label>Cenário Gerado (editável)</Label>
                  <Textarea value={scenarioText} onChange={(e) => setScenarioText(e.target.value)} className="min-h-[200px]" />
                </div>
              )}
            </>
          )}

          {aiGlossary.length > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h4 className="mb-2 text-sm font-semibold text-primary">📖 Termos desconhecidos</h4>
              <div className="space-y-1">
                {aiGlossary.map((g: any, i: number) => (
                  <p key={i} className="text-xs text-foreground/70"><strong>{g.term}:</strong> {g.definition}</p>
                ))}
              </div>
            </div>
          )}
          {aiQuestions.length > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <h4 className="mb-2 text-sm font-semibold text-primary">❓ Possíveis intervenções</h4>
              <ol className="list-decimal list-inside space-y-1">
                {aiQuestions.map((q: string, i: number) => (
                  <li key={i} className="text-xs text-foreground/70">{q}</li>
                ))}
              </ol>
            </div>
          )}

          <Button onClick={saveScenario} disabled={!scenarioTitle.trim() || !scenarioText.trim()}>
            <Plus className="mr-2 h-4 w-4" /> Salvar Cenário na Biblioteca
          </Button>
        </div>
      </div>
      )}

      {/* Scenario library */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">
          Biblioteca de Cenários <span className="ml-2 text-xs font-normal text-muted-foreground">({filteredScenarios.length})</span>
        </h3>
        {filteredScenarios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhum cenário neste curso</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredScenarios.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(s.modules as any)?.name ? <span className="text-primary">{(s.modules as any).name}</span> : "Sem módulo"}
                      {" · "}{s.content.length} caracteres
                      {s.tutor_glossary && " · Com glossário"}
                      {s.tutor_questions && " · Com perguntas"}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2">{s.content}</p>
                  </div>
                  {!readOnly && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                      title="Copiar para outro curso"
                      onClick={() => { setCopyingScenario(s); setCopyTargetCourseId(""); setCopyTargetModuleId(""); }}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                      title="Liberar para turmas"
                      onClick={() => setReleaseScenarioId(s.id)}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => { setEditingScenario(s); setEditScenarioTitle(s.title); setEditScenarioContent(s.content); setEditScenarioModuleId(s.module_id || ""); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteScenario(s.id, s.title)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Scenario Dialog */}
      <Dialog open={!!editingScenario} onOpenChange={(open) => !open && setEditingScenario(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Cenário</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={editScenarioTitle} onChange={(e) => setEditScenarioTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Módulo</Label>
                <Select value={editScenarioModuleId} onValueChange={setEditScenarioModuleId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar módulo (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {filteredModules.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea value={editScenarioContent} onChange={(e) => setEditScenarioContent(e.target.value)} className="min-h-[200px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingScenario(null)}>Cancelar</Button>
            <Button onClick={updateScenario} disabled={saving || !editScenarioTitle.trim() || !editScenarioContent.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Scenario Dialog */}
      <Dialog open={!!releaseScenarioId} onOpenChange={(open) => {
        if (!open) {
          setReleaseScenarioId(null);
          setReleaseInstitutionId("");
          setReleaseCourseId("");
          setReleaseModuleId("");
          setReleaseGroupId("");
          setSelectedRoomIds([]);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Enviar Cenário para Salas</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Filtre por instituição, curso, módulo e turma para selecionar as salas. O cenário será adicionado à lista de cenários disponíveis em cada sala.
          </p>
          <div className="space-y-3 my-2">
            <div className="space-y-1">
              <Label className="text-xs">Instituição</Label>
              <Select value={releaseInstitutionId} onValueChange={(val) => {
                setReleaseInstitutionId(val);
                setReleaseCourseId("");
                setReleaseModuleId("");
                setReleaseGroupId("");
                setSelectedRoomIds([]);
              }}>
                <SelectTrigger><SelectValue placeholder="Todas as instituições" /></SelectTrigger>
                <SelectContent>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {releaseInstitutionId && (
              <div className="space-y-1">
                <Label className="text-xs">Curso</Label>
                <Select value={releaseCourseId} onValueChange={(val) => {
                  setReleaseCourseId(val);
                  setReleaseModuleId("");
                  setReleaseGroupId("");
                  setSelectedRoomIds([]);
                }}>
                  <SelectTrigger><SelectValue placeholder="Todos os cursos" /></SelectTrigger>
                  <SelectContent>
                    {releaseCoursesForInstitution.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {releaseCourseId && (
              <div className="space-y-1">
                <Label className="text-xs">Módulo</Label>
                <Select value={releaseModuleId} onValueChange={(val) => {
                  setReleaseModuleId(val);
                  setReleaseGroupId("");
                  setSelectedRoomIds([]);
                }}>
                  <SelectTrigger><SelectValue placeholder="Todos os módulos" /></SelectTrigger>
                  <SelectContent>
                    {releaseModulesForCourse.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum módulo neste curso</div>
                    ) : (
                      releaseModulesForCourse.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {releaseCourseId && (
              <div className="space-y-1">
                <Label className="text-xs">Turma</Label>
                <Select value={releaseGroupId} onValueChange={(val) => {
                  setReleaseGroupId(val);
                  setSelectedRoomIds([]);
                }}>
                  <SelectTrigger><SelectValue placeholder="Todas as turmas" /></SelectTrigger>
                  <SelectContent>
                    {releaseGroupsForFilter.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma turma encontrada</div>
                    ) : (
                      releaseGroupsForFilter.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {releaseFilteredRooms.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Salas ({releaseFilteredRooms.length})</Label>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
                  if (selectedRoomIds.length === releaseFilteredRooms.length) {
                    setSelectedRoomIds([]);
                  } else {
                    setSelectedRoomIds(releaseFilteredRooms.map((r) => r.id));
                  }
                }}>
                  {selectedRoomIds.length === releaseFilteredRooms.length ? "Desmarcar todas" : "Selecionar todas"}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {releaseFilteredRooms.map((r) => (
                  <label key={r.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2 cursor-pointer hover:bg-muted/50">
                    <Checkbox
                      checked={selectedRoomIds.includes(r.id)}
                      onCheckedChange={(checked) => {
                        setSelectedRoomIds((prev) =>
                          checked ? [...prev, r.id] : prev.filter((id) => id !== r.id)
                        );
                      }}
                    />
                    <span className="text-sm text-foreground flex-1">{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {releaseInstitutionId && releaseFilteredRooms.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma sala ativa encontrada com os filtros selecionados.</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseScenarioId(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                const sc = scenarios.find((s) => s.id === releaseScenarioId);
                if (sc) releaseScenarioToRooms(sc);
              }}
              disabled={releasingScenario || selectedRoomIds.length === 0}
            >
              {releasingScenario ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="mr-2 h-4 w-4" /> Enviar Cenário ({selectedRoomIds.length})</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Scenario Dialog */}
      <Dialog open={!!copyingScenario} onOpenChange={(open) => !open && setCopyingScenario(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Copiar Cenário para Outro Curso</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Uma cópia independente do cenário <strong>"{copyingScenario?.title}"</strong> será criada no curso de destino.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Curso de Destino</Label>
              <Select value={copyTargetCourseId} onValueChange={(val) => { setCopyTargetCourseId(val); setCopyTargetModuleId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar curso" /></SelectTrigger>
                <SelectContent>
                  {courses.filter((c) => c.id !== selectedCourseId).map((c) => {
                    const inst = institutions.find((i) => i.id === c.institution_id);
                    return (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {inst ? `(${inst.name})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {copyTargetCourseId && (
              <div className="space-y-2">
                <Label>Módulo de Destino</Label>
                <Select value={copyTargetModuleId} onValueChange={setCopyTargetModuleId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar módulo (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {modules.filter((m) => m.course_id === copyTargetCourseId).length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum módulo neste curso</div>
                    ) : (
                      modules.filter((m) => m.course_id === copyTargetCourseId).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyingScenario(null)}>Cancelar</Button>
            <Button onClick={copyScenarioToCourse} disabled={saving || !copyTargetCourseId}>
              {saving ? "Copiando..." : <><Copy className="mr-2 h-4 w-4" /> Copiar Cenário</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
