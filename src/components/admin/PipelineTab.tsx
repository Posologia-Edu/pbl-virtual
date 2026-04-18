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
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    const { data, error } = await supabase
      .from("pipeline_updates")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setUpdates(data as unknown as PipelineUpdate[]);
    setLoading(false);
  };

  const generateWithAI = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-roadmap");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const inserted = data?.inserted ?? 0;
      if (inserted > 0) {
        toast.success(`${inserted} novas funcionalidades propostas pela IA!`);
        fetchUpdates();
      } else {
        toast.info(data?.message || "Nenhuma nova proposta foi gerada. Tente novamente.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar funcionalidades com IA");
    } finally {
      setGenerating(false);
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
