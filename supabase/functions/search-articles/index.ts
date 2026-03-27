import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchResult {
  title: string;
  authors: string;
  journal: string;
  year: string;
  url: string;
  source: "pubmed" | "scielo";
  abstract?: string;
}

async function searchPubMed(query: string, maxResults = 5): Promise<SearchResult[]> {
  try {
    // Step 1: Search for IDs
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Step 2: Fetch details
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`;
    const fetchRes = await fetch(fetchUrl);
    if (!fetchRes.ok) return [];
    const fetchData = await fetchRes.json();

    const results: SearchResult[] = [];
    for (const id of ids) {
      const article = fetchData.result?.[id];
      if (!article) continue;
      results.push({
        title: article.title || "Sem título",
        authors: (article.authors || []).slice(0, 3).map((a: any) => a.name).join(", ") + (article.authors?.length > 3 ? " et al." : ""),
        journal: article.fulljournalname || article.source || "",
        year: article.pubdate?.split(" ")[0] || "",
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        source: "pubmed",
      });
    }
    return results;
  } catch (err) {
    console.error("[search-articles] PubMed error:", err);
    return [];
  }
}

async function searchScielo(query: string, maxResults = 5): Promise<SearchResult[]> {
  try {
    const searchUrl = `https://search.scielo.org/?q=${encodeURIComponent(query)}&lang=pt&count=${maxResults}&output=json&format=json`;
    const res = await fetch(searchUrl, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) {
      // Fallback: try SciELO API
      const apiUrl = `https://articlemeta.scielo.org/api/v1/article/?q=${encodeURIComponent(query)}&limit=${maxResults}`;
      const apiRes = await fetch(apiUrl);
      if (!apiRes.ok) return [];
      const apiData = await apiRes.json();
      if (!apiData.objects) return [];
      return apiData.objects.slice(0, maxResults).map((obj: any) => ({
        title: obj.original_title?.find((t: any) => t.language === "pt")?.text || obj.original_title?.[0]?.text || "Sem título",
        authors: (obj.authors || []).slice(0, 3).map((a: any) => `${a.surname}, ${a.given_names}`).join("; "),
        journal: obj.journal?.title || "",
        year: obj.publication_date?.slice(0, 4) || "",
        url: obj.fulltexts?.html?.pt || obj.fulltexts?.html?.en || `https://www.scielo.br/j/${obj.journal?.acronym}/a/${obj.code}/`,
        source: "scielo" as const,
      }));
    }
    const data = await res.json();
    // Parse SciELO search response
    const docs = data.response?.docs || data.docs || [];
    return docs.slice(0, maxResults).map((doc: any) => ({
      title: doc.ti_pt || doc.ti_en || doc.ti || doc.title || "Sem título",
      authors: (doc.au || []).slice(0, 3).join("; "),
      journal: doc.ta || "",
      year: doc.da?.slice(0, 4) || doc.year || "",
      url: doc.fulltext_html_pt || doc.fulltext_html_en || doc.id || "",
      source: "scielo" as const,
    }));
  } catch (err) {
    console.error("[search-articles] SciELO error:", err);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sources = ["pubmed", "scielo"], maxPerSource = 5 } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const promises: Promise<SearchResult[]>[] = [];
    if (sources.includes("pubmed")) promises.push(searchPubMed(query, maxPerSource));
    if (sources.includes("scielo")) promises.push(searchScielo(query, maxPerSource));

    const results = await Promise.all(promises);
    const allResults = results.flat();

    return new Response(JSON.stringify({ results: allResults, query }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[search-articles] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
