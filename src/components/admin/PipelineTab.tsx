import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Sparkles, Clock, CheckCircle2, Trash2, Rocket, Loader2, Wand2 } from "lucide-react";

interface PipelineUpdate {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  is_auto_generated: boolean;
  batch_date: string | null;
  created_at: string;
  completed_at: string | null;
}

const ROADMAP_SUGGESTIONS: Array<{ title: string; description: string; priority: string }> = [
  { title: "App Mobile (PWA)", description: "Versão mobile progressiva para acesso offline e notificações push.", priority: "alta" },
  { title: "Análise de Desempenho por Competência", description: "Dashboard de competências cruzando resultados de múltiplas avaliações por aluno.", priority: "alta" },
  { title: "IA para Feedback Personalizado", description: "Feedback automático por IA adaptado ao perfil de erros de cada aluno.", priority: "alta" },
  { title: "Integração com LMS", description: "Conectores para Moodle, Canvas e Google Classroom para importação/exportação de dados.", priority: "media" },
  { title: "Banco de Casos Clínicos Compartilhado", description: "Marketplace específico para casos clínicos reutilizáveis entre professores e instituições.", priority: "media" },
  { title: "Relatórios Avançados em PDF", description: "Geração automatizada de relatórios detalhados com gráficos exportáveis em PDF.", priority: "alta" },
  { title: "Sistema de Notificações em Tempo Real", description: "Notificações push e in-app para sessões, avaliações e prazos importantes.", priority: "alta" },
  { title: "Gamificação Avançada", description: "Sistema de pontuação, rankings e recompensas para engajamento dos alunos.", priority: "media" },
  { title: "Modo Escuro Completo", description: "Tema escuro completo e consistente em toda a plataforma.", priority: "baixa" },
  { title: "Exportação de Dados em Massa", description: "Exportação de dados completos em CSV/Excel para análise externa.", priority: "media" },
  { title: "Dashboard do Aluno", description: "Painel personalizado para o aluno acompanhar progresso, badges e avaliações.", priority: "alta" },
  { title: "API Pública para Integrações", description: "API REST documentada para integração com sistemas externos de universidades.", priority: "media" },
  { title: "Suporte a Múltiplos Idiomas", description: "Expansão de traduções para francês, alemão e italiano.", priority: "baixa" },
  { title: "Gravação de Sessões Tutorial", description: "Registro em vídeo/áudio das sessões para revisão posterior.", priority: "media" },
  { title: "Planejamento de Semestre", description: "Calendário integrado para planejamento de sessões ao longo do semestre.", priority: "alta" },
  { title: "Chat com IA Contextual", description: "Chat inteligente que entende o contexto da sessão e do cenário em andamento.", priority: "alta" },
  { title: "Sistema de Mentoria", description: "Pareamento automático de alunos experientes com novatos para mentoria.", priority: "media" },
  { title: "Análise de Sentimento do Chat", description: "IA que analisa o tom das discussões para identificar engajamento e conflitos.", priority: "media" },
  { title: "Templates de Cenários", description: "Biblioteca de templates prontos para diferentes áreas da saúde.", priority: "alta" },
  { title: "Painel de Frequência", description: "Controle de presença automatizado com geolocalização ou QR Code.", priority: "media" },
  { title: "Integração com Calendário", description: "Sincronização com Google Calendar e Outlook para agendamento de sessões.", priority: "baixa" },
  { title: "Sistema de Rubricas Customizáveis", description: "Criação de rubricas de avaliação personalizadas por disciplina.", priority: "alta" },
  { title: "Portfólio Digital do Aluno", description: "Compilação automática de participações, avaliações e badges em portfólio.", priority: "media" },
  { title: "Análise Preditiva de Risco", description: "IA que identifica alunos em risco de reprovação baseado em padrões de participação.", priority: "alta" },
  { title: "Fórum de Discussão Assíncrono", description: "Espaço para discussões fora das sessões com moderação de professor.", priority: "baixa" },
  { title: "Backup e Auditoria Completa", description: "Log de auditoria detalhado e backup automatizado de todos os dados.", priority: "media" },
  { title: "Acessibilidade WCAG 2.1", description: "Conformidade completa com padrões de acessibilidade web.", priority: "alta" },
  { title: "Comparativo entre Turmas", description: "Dashboard comparando métricas de desempenho entre diferentes turmas.", priority: "media" },
  { title: "Avaliação 360° Automatizada", description: "Ciclo completo de auto-avaliação, avaliação de pares e professor com relatório consolidado.", priority: "alta" },
  { title: "Integração com Repositórios Científicos", description: "Busca automática de artigos do PubMed e Scielo relevantes ao cenário.", priority: "media" },
];

const priorityConfig: Record<string, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-red-500 text-white hover:bg-red-600 border-transparent" },
  media: { label: "Média", className: "bg-amber-500 text-white hover:bg-amber-600 border-transparent" },
  baixa: { label: "Baixa", className: "bg-emerald-500 text-white hover:bg-emerald-600 border-transparent" },
};

export default function PipelineTab() {
  const [updates, setUpdates] = useState<PipelineUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("roadmap");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("media");

  useEffect(() => {
    fetchUpdates();
  }, []);

  useEffect(() => {
    checkAndGenerateRoadmap();
  }, [updates]);

  const fetchUpdates = async () => {
    const { data, error } = await supabase
      .from("pipeline_updates")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setUpdates(data as unknown as PipelineUpdate[]);
    setLoading(false);
  };

  const checkAndGenerateRoadmap = async () => {
    if (loading || updates.length === 0 && !loading) {
      // Check if we need to generate - either no data at all, or last batch is > 30 days old
      const roadmapItems = updates.filter((u) => u.status === "roadmap");
      const lastBatch = updates.length > 0
        ? updates.reduce((latest, u) => {
            if (u.batch_date && (!latest || u.batch_date > latest)) return u.batch_date;
            return latest;
          }, null as string | null)
        : null;

      const daysSinceLastBatch = lastBatch
        ? Math.floor((Date.now() - new Date(lastBatch).getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      if (roadmapItems.length === 0 && (daysSinceLastBatch >= 30 || updates.length === 0)) {
        await generateRoadmapBatch();
      }
    }
  };

  const generateRoadmapBatch = async () => {
    // Get existing titles to avoid duplicates
    const existingTitles = new Set(updates.map((u) => u.title));
    const available = ROADMAP_SUGGESTIONS.filter((s) => !existingTitles.has(s.title));

    if (available.length === 0) return;

    // Pick 7-8 random items
    const count = Math.min(7 + Math.floor(Math.random() * 2), available.length);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    const batchDate = new Date().toISOString().split("T")[0];
    const inserts = selected.map((s) => ({
      title: s.title,
      description: s.description,
      priority: s.priority,
      status: "roadmap" as const,
      is_auto_generated: true,
      batch_date: batchDate,
    }));

    const { error } = await supabase.from("pipeline_updates").insert(inserts as any);
    if (!error) {
      toast.success(`${count} novas atualizações propostas para o Roadmap!`);
      fetchUpdates();
    }
  };

  const handleComplete = async (item: PipelineUpdate) => {
    const { error } = await supabase
      .from("pipeline_updates")
      .update({ status: "changelog", completed_at: new Date().toISOString() } as any)
      .eq("id", item.id);
    if (!error) {
      toast.success(`"${item.title}" movido para o Changelog!`);
      fetchUpdates();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("pipeline_updates").delete().eq("id", id);
    if (!error) {
      toast.success("Entrada removida.");
      fetchUpdates();
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("pipeline_updates").insert({
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      status: "roadmap",
      is_auto_generated: false,
    } as any);
    if (!error) {
      toast.success("Nova entrada adicionada ao Roadmap!");
      setNewTitle("");
      setNewDesc("");
      setNewPriority("media");
      setDialogOpen(false);
      fetchUpdates();
    }
  };

  const roadmapItems = updates.filter((u) => u.status === "roadmap");
  const changelogItems = updates.filter((u) => u.status === "changelog");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Rocket className="h-5 w-5 text-primary" />
            Pipeline de Atualizações
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Histórico de funcionalidades e planejamento futuro do sistema.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nova Entrada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Entrada no Roadmap</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input placeholder="Título da funcionalidade" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <Textarea placeholder="Descrição breve" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} />
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreate} className="w-full">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="changelog" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Changelog ({changelogItems.length})
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Roadmap ({roadmapItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="mt-4 space-y-3">
          {roadmapItems.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma atualização pendente no roadmap.
            </p>
          )}
          {roadmapItems.map((item) => (
            <Card key={item.id} className="flex items-center justify-between border-l-4 border-l-primary/60 p-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {item.is_auto_generated && <Sparkles className="h-4 w-4 text-amber-500" />}
                  <span className="font-semibold text-foreground">{item.title}</span>
                  <Badge className={priorityConfig[item.priority]?.className}>
                    {priorityConfig[item.priority]?.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <div className="ml-4 flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleComplete(item)}>
                  <CheckCircle2 className="h-4 w-4" /> Concluir
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="changelog" className="mt-4 space-y-3">
          {changelogItems.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma atualização concluída ainda.
            </p>
          )}
          {changelogItems.map((item) => (
            <Card key={item.id} className="flex items-center justify-between border-l-4 border-l-emerald-500/60 p-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-semibold text-foreground">{item.title}</span>
                  <Badge className={priorityConfig[item.priority]?.className}>
                    {priorityConfig[item.priority]?.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {item.completed_at && (
                  <p className="text-xs text-muted-foreground">
                    Concluído em {new Date(item.completed_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              <div className="ml-4 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
