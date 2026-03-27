import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Search, ExternalLink, Loader2, BookOpen, FileText,
  GraduationCap, RefreshCw,
} from "lucide-react";

interface SearchResult {
  title: string;
  authors: string;
  journal: string;
  year: string;
  url: string;
  source: "pubmed" | "scielo";
}

interface ScientificSearchPanelProps {
  scenarioContent?: string;
}

export default function ScientificSearchPanel({ scenarioContent }: ScientificSearchPanelProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const search = async (customQuery?: string) => {
    const q = customQuery || query.trim();
    if (!q) {
      toast({ title: "Digite um termo de busca", variant: "destructive" });
      return;
    }
    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke("search-articles", {
        body: { query: q, sources: ["pubmed", "scielo"], maxPerSource: 5 },
      });

      if (error) throw error;
      setResults(data?.results || []);
      if ((data?.results || []).length === 0) {
        toast({ title: "Nenhum artigo encontrado para esta busca" });
      }
    } catch (e: any) {
      console.error("Search error:", e);
      toast({ title: "Erro na busca", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const autoSearch = () => {
    if (!scenarioContent) {
      toast({ title: "Nenhum cenário ativo para busca automática", variant: "destructive" });
      return;
    }
    // Extract key terms from scenario (first 200 chars, remove common words)
    const text = scenarioContent.slice(0, 300)
      .replace(/[^\w\sÀ-ú]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 6)
      .join(" ");
    setQuery(text);
    search(text);
  };

  const sourceIcon = (source: string) => {
    if (source === "pubmed") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">PubMed</span>;
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">SciELO</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Repositórios Científicos</h3>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar artigos no PubMed e SciELO..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="text-sm"
        />
        <Button onClick={() => search()} disabled={loading} size="icon" className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {scenarioContent && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={autoSearch}
          disabled={loading}
        >
          <RefreshCw className="h-3 w-3" />
          Buscar automaticamente baseado no cenário
        </Button>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
          {results.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-border p-3 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {r.title}
                  </p>
                  {r.authors && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{r.authors}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    {sourceIcon(r.source)}
                    {r.journal && (
                      <span className="text-[10px] text-muted-foreground truncate">{r.journal}</span>
                    )}
                    {r.year && (
                      <span className="text-[10px] text-muted-foreground">{r.year}</span>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </div>
            </a>
          ))}
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Nenhum artigo encontrado.</p>
          <p className="text-xs mt-1">Tente termos mais específicos ou em inglês.</p>
        </div>
      )}
    </div>
  );
}
