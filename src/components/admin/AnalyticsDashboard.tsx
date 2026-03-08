import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, Globe, Bot, BarChart3, Activity,
  Users, Building2, BookOpen, FolderOpen, DoorOpen,
  MessageSquare, Award, Eye, MousePointerClick, Languages,
  Cpu, DollarSign, Zap, GraduationCap, FileText
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

type Period = "7d" | "30d" | "90d";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

function KPICard({ title, value, subtitle, icon: Icon, iconColor = "text-primary" }: {
  title: string; value: string | number; subtitle?: string; icon: any; iconColor?: string;
}) {
  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function RankingTable({ data, columns }: { data: { label: string; value: number }[]; columns: [string, string] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">{columns[0]}</th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">{columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, i) => (
            <tr key={i} className="border-b border-border/30">
              <td className="py-2 px-2 truncate max-w-[200px]">{row.label}</td>
              <td className="py-2 px-2 text-right font-medium">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function periodToDays(p: Period) {
  return p === "7d" ? 7 : p === "30d" ? 30 : 90;
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  // Visitor
  const [visitors, setVisitors] = useState<any[]>([]);
  // AI
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  // Platform
  const [platformCounts, setPlatformCounts] = useState({
    users: 0, professors: 0, students: 0, instAdmins: 0,
    institutions: 0, courses: 0, modules: 0, groups: 0, rooms: 0,
    sessions: 0, evaluations: 0, peerEvals: 0, messages: 0, recentUsers: 0,
  });
  // Engagement
  const [engagement, setEngagement] = useState({
    activeRooms: 0, inactiveRooms: 0, avgStudentsPerGroup: 0,
    avgScenariosPerCourse: 0, totalBadges: 0, badgesByCategory: [] as { label: string; value: number }[],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const since = getDaysAgo(periodToDays(period));

    try {
      // Parallel fetches
      const [
        visitorRes, aiRes, profilesRes, rolesRes,
        instRes, coursesRes, modulesRes, groupsRes, roomsRes,
        sessionsRes, evalsRes, peerRes, chatRes,
        badgesRes, badgeDefsRes, groupMembersRes, roomScenariosRes,
      ] = await Promise.all([
        supabase.from("visitor_analytics").select("*").gte("created_at", since),
        supabase.from("ai_usage_log").select("*").gte("created_at", since),
        supabase.from("profiles").select("user_id, created_at", { count: "exact" }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("institutions").select("id", { count: "exact" }),
        supabase.from("courses").select("id", { count: "exact" }),
        supabase.from("modules").select("id", { count: "exact" }),
        supabase.from("groups").select("id, course_id", { count: "exact" }),
        supabase.from("rooms").select("id, status", { count: "exact" }),
        supabase.from("tutorial_sessions").select("id", { count: "exact" }),
        supabase.from("evaluations").select("id", { count: "exact" }),
        supabase.from("peer_evaluations").select("id", { count: "exact" }),
        supabase.from("chat_messages").select("id", { count: "exact" }),
        supabase.from("user_badges").select("badge_id"),
        supabase.from("badge_definitions").select("id, category"),
        supabase.from("group_members").select("group_id"),
        supabase.from("room_scenarios").select("room_id"),
      ]);

      setVisitors(visitorRes.data || []);
      setAiLogs(aiRes.data || []);

      // Roles count
      const roles = rolesRes.data || [];
      const professors = new Set(roles.filter(r => r.role === "professor").map(r => r.user_id)).size;
      const students = new Set(roles.filter(r => r.role === "student").map(r => r.user_id)).size;
      const instAdmins = new Set(roles.filter(r => r.role === "institution_admin").map(r => r.user_id)).size;

      const recentCutoff = getDaysAgo(7);
      const recentUsers = (profilesRes.data || []).filter(p => p.created_at && p.created_at >= recentCutoff).length;

      setPlatformCounts({
        users: profilesRes.count || 0,
        professors, students, instAdmins,
        institutions: instRes.count || 0,
        courses: coursesRes.count || 0,
        modules: modulesRes.count || 0,
        groups: groupsRes.count || 0,
        rooms: roomsRes.count || 0,
        sessions: sessionsRes.count || 0,
        evaluations: evalsRes.count || 0,
        peerEvals: peerRes.count || 0,
        messages: chatRes.count || 0,
        recentUsers,
      });

      // Engagement
      const roomsData = roomsRes.data || [];
      const activeRooms = roomsData.filter(r => r.status === "active").length;
      const inactiveRooms = roomsData.length - activeRooms;

      const gm = groupMembersRes.data || [];
      const groupCounts: Record<string, number> = {};
      gm.forEach(m => { groupCounts[m.group_id] = (groupCounts[m.group_id] || 0) + 1; });
      const groupIds = Object.keys(groupCounts);
      const avgStudentsPerGroup = groupIds.length ? +(Object.values(groupCounts).reduce((a, b) => a + b, 0) / groupIds.length).toFixed(1) : 0;

      const rs = roomScenariosRes.data || [];
      const courseIds = [...new Set((groupsRes.data || []).map(g => g.course_id).filter(Boolean))];
      const avgScenariosPerCourse = courseIds.length ? +(rs.length / courseIds.length).toFixed(1) : 0;

      const badges = badgesRes.data || [];
      const badgeDefs = badgeDefsRes.data || [];
      const badgeCatMap: Record<string, string> = {};
      badgeDefs.forEach(d => { badgeCatMap[d.id] = d.category; });
      const catCounts: Record<string, number> = {};
      badges.forEach(b => {
        const cat = badgeCatMap[b.badge_id] || "outro";
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });

      setEngagement({
        activeRooms, inactiveRooms, avgStudentsPerGroup, avgScenariosPerCourse,
        totalBadges: badges.length,
        badgesByCategory: Object.entries(catCounts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      });
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Derived visitor data ───
  const uniqueVisitors = new Set(visitors.map(v => v.session_fingerprint)).size;

  const pageRanking = (() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => {
      const pages = v.pages_visited as string[] | null;
      if (Array.isArray(pages)) pages.forEach(p => { counts[p] = (counts[p] || 0) + 1; });
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  })();

  const ctaRanking = (() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => {
      const clicks = v.cta_clicks as string[] | null;
      if (Array.isArray(clicks)) clicks.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  })();

  const utmRanking = (() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => {
      const src = [v.utm_source, v.utm_medium, v.utm_campaign].filter(Boolean).join(" / ");
      if (src) counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  })();

  const planInterest = (() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => {
      if (v.plan_interest) counts[v.plan_interest] = (counts[v.plan_interest] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  })();

  const langRanking = (() => {
    const counts: Record<string, number> = {};
    visitors.forEach(v => {
      if (v.preferred_language) counts[v.preferred_language] = (counts[v.preferred_language] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  })();

  const visitorsByDay = (() => {
    const map: Record<string, Set<string>> = {};
    visitors.forEach(v => {
      const day = v.created_at?.slice(0, 10);
      if (day) {
        if (!map[day]) map[day] = new Set();
        map[day].add(v.session_fingerprint);
      }
    });
    return Object.entries(map).map(([date, s]) => ({ date, visitors: s.size })).sort((a, b) => a.date.localeCompare(b.date));
  })();

  // ─── Derived AI data ───
  const totalAiRequests = aiLogs.length;
  const totalTokensIn = aiLogs.reduce((s, l) => s + (l.tokens_input || 0), 0);
  const totalTokensOut = aiLogs.reduce((s, l) => s + (l.tokens_output || 0), 0);
  const totalCost = aiLogs.reduce((s, l) => s + (l.estimated_cost_usd || 0), 0);

  const aiByPromptType = (() => {
    const counts: Record<string, number> = {};
    aiLogs.forEach(l => {
      const t = l.prompt_type || "outro";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const aiByModel = (() => {
    const counts: Record<string, number> = {};
    aiLogs.forEach(l => {
      const m = l.model || l.provider || "desconhecido";
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const aiByDay = (() => {
    const map: Record<string, number> = {};
    aiLogs.forEach(l => {
      const day = l.created_at?.slice(0, 10);
      if (day) map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).map(([date, requests]) => ({ date, requests })).sort((a, b) => a.date.localeCompare(b.date));
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Dashboard de Analytics</h2>
          <p className="text-sm text-muted-foreground">Visão completa do sistema — apenas superadmin</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["7d", "30d", "90d"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === p ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="visitors" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="visitors"><Globe className="mr-2 h-4 w-4" /> Visitantes</TabsTrigger>
          <TabsTrigger value="ai"><Bot className="mr-2 h-4 w-4" /> Uso de IA</TabsTrigger>
          <TabsTrigger value="platform"><BarChart3 className="mr-2 h-4 w-4" /> Plataforma</TabsTrigger>
          <TabsTrigger value="engagement"><Activity className="mr-2 h-4 w-4" /> Engajamento</TabsTrigger>
        </TabsList>

        {/* ═══ VISITANTES ═══ */}
        <TabsContent value="visitors" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard title="Visitantes Únicos" value={uniqueVisitors} icon={Eye} iconColor="text-blue-500" />
            <KPICard title="Total Registros" value={visitors.length} icon={Globe} iconColor="text-emerald-500" />
            <KPICard title="CTAs Clicados" value={ctaRanking.reduce((s, r) => s + r.value, 0)} icon={MousePointerClick} iconColor="text-amber-500" />
            <KPICard title="Idiomas" value={langRanking.length} icon={Languages} iconColor="text-violet-500" />
          </div>

          {/* Chart */}
          <Card className="rounded-2xl border-border/50">
            <CardHeader><CardTitle className="text-base">Visitantes por Dia</CardTitle></CardHeader>
            <CardContent>
              {visitorsByDay.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={visitorsByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip />
                    <Line type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-2xl border-border/50">
              <CardHeader><CardTitle className="text-base">Páginas Mais Visitadas</CardTitle></CardHeader>
              <CardContent><RankingTable data={pageRanking} columns={["Página", "Visitas"]} /></CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50">
              <CardHeader><CardTitle className="text-base">CTAs Mais Clicados</CardTitle></CardHeader>
              <CardContent><RankingTable data={ctaRanking} columns={["CTA", "Cliques"]} /></CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50">
              <CardHeader><CardTitle className="text-base">Origem de Tráfego (UTM)</CardTitle></CardHeader>
              <CardContent><RankingTable data={utmRanking} columns={["Source / Medium / Campaign", "Visitas"]} /></CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50">
              <CardHeader><CardTitle className="text-base">Planos de Interesse</CardTitle></CardHeader>
              <CardContent><RankingTable data={planInterest} columns={["Plano", "Interesse"]} /></CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50">
              <CardHeader><CardTitle className="text-base">Idiomas Preferidos</CardTitle></CardHeader>
              <CardContent><RankingTable data={langRanking} columns={["Idioma", "Visitantes"]} /></CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ USO DE IA ═══ */}
        <TabsContent value="ai" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard title="Requisições" value={totalAiRequests} icon={Zap} iconColor="text-amber-500" />
            <KPICard title="Tokens (Input)" value={totalTokensIn.toLocaleString("pt-BR")} icon={Cpu} iconColor="text-blue-500" />
            <KPICard title="Tokens (Output)" value={totalTokensOut.toLocaleString("pt-BR")} icon={Cpu} iconColor="text-emerald-500" />
            <KPICard title="Custo Estimado" value={`$ ${totalCost.toFixed(2)}`} icon={DollarSign} iconColor="text-green-500" />
          </div>

          <Card className="rounded-2xl border-border/50">
            <CardHeader><CardTitle className="text-base">Uso Diário de IA</CardTitle></CardHeader>
            <CardContent>
              {aiByDay.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={aiByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip />
                    <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-2xl border-border/50">
              <CardHeader><CardTitle className="text-base">Por Tipo de Prompt</CardTitle></CardHeader>
              <CardContent>
                {aiByPromptType.length ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={aiByPromptType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {aiByPromptType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50">
              <CardHeader><CardTitle className="text-base">Por Provedor / Modelo</CardTitle></CardHeader>
              <CardContent>
                {aiByModel.length ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={aiByModel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {aiByModel.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ PLATAFORMA ═══ */}
        <TabsContent value="platform" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard title="Total de Usuários" value={platformCounts.users} subtitle={`+${platformCounts.recentUsers} nos últimos 7 dias`} icon={Users} iconColor="text-blue-500" />
            <KPICard title="Professores" value={platformCounts.professors} icon={GraduationCap} iconColor="text-emerald-500" />
            <KPICard title="Alunos" value={platformCounts.students} icon={Users} iconColor="text-violet-500" />
            <KPICard title="Admins Institucionais" value={platformCounts.instAdmins} icon={Building2} iconColor="text-amber-500" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard title="Instituições" value={platformCounts.institutions} icon={Building2} />
            <KPICard title="Cursos" value={platformCounts.courses} icon={BookOpen} />
            <KPICard title="Módulos" value={platformCounts.modules} icon={FolderOpen} />
            <KPICard title="Turmas" value={platformCounts.groups} icon={Users} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard title="Salas" value={platformCounts.rooms} icon={DoorOpen} />
            <KPICard title="Sessões Tutoriais" value={platformCounts.sessions} icon={FileText} />
            <KPICard title="Avaliações" value={platformCounts.evaluations + platformCounts.peerEvals} subtitle={`${platformCounts.evaluations} prof. + ${platformCounts.peerEvals} peer`} icon={BarChart3} />
            <KPICard title="Mensagens no Chat" value={platformCounts.messages} icon={MessageSquare} />
          </div>
        </TabsContent>

        {/* ═══ ENGAJAMENTO ═══ */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard title="Salas Ativas" value={engagement.activeRooms} subtitle={`${engagement.inactiveRooms} inativas`} icon={DoorOpen} iconColor="text-green-500" />
            <KPICard title="Média Alunos/Turma" value={engagement.avgStudentsPerGroup} icon={Users} iconColor="text-blue-500" />
            <KPICard title="Média Cenários/Curso" value={engagement.avgScenariosPerCourse} icon={FileText} iconColor="text-violet-500" />
            <KPICard title="Badges Concedidos" value={engagement.totalBadges} icon={Award} iconColor="text-amber-500" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-2xl border-border/50">
              <CardHeader><CardTitle className="text-base">Salas: Ativas vs Inativas</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Ativas", value: engagement.activeRooms },
                        { name: "Inativas", value: engagement.inactiveRooms },
                      ]}
                      dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/50">
              <CardHeader><CardTitle className="text-base">Badges por Categoria</CardTitle></CardHeader>
              <CardContent>
                {engagement.badgesByCategory.length ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={engagement.badgesByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={100} className="fill-muted-foreground" />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">Nenhum badge concedido</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
