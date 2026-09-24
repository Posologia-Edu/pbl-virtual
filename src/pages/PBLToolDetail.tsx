import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, GraduationCap, Lightbulb, ShieldCheck } from "lucide-react";
import { Mockup, type ScreenKey } from "./PBLGuide";
import { getPBLTool, type PBLToolSlug } from "./pblTools";
import "./pbl-guide.css";

function ToolScreen({ screen, caption }: { screen: ScreenKey; caption: string }) {
  return <figure className="pbl-screen-figure pbl-wide-figure"><div className="pbl-screen-wrap"><Mockup screen={screen} /></div><figcaption><b>Tela da ferramenta.</b> {caption}</figcaption></figure>;
}

function ToolSteps({ items }: { items: Array<{ title: string; text: string }> }) {
  return <div className="pbl-step-list">{items.map((item, index) => <div className="pbl-step-row" key={item.title}><span className="pbl-step-badge">{index + 1}</span><div><strong>{item.title}</strong><p>{item.text}</p></div></div>)}</div>;
}

export default function PBLToolDetail() {
  const navigate = useNavigate();
  const { toolSlug } = useParams<{ toolSlug: PBLToolSlug }>();
  const tool = getPBLTool(toolSlug);

  if (!tool) {
    return <div className="pbl-doc"><div className="pbl-page-shell"><div className="pbl-content-column pbl-content-section"><div className="pbl-eyebrow">Ferramenta não encontrada</div><h1>Não encontramos este recurso.</h1><button className="pbl-home-button" onClick={() => navigate("/como-funciona#ferramentas")}>Voltar para as ferramentas</button></div></div></div>;
  }

  const Icon = tool.icon;
  const relatedTools = tool.related.map((slug) => getPBLTool(slug)).filter(Boolean);

  return <div className="pbl-doc">
    <a className="pbl-skip-link" href="#pbl-tool-content">Pular para o conteúdo</a>
    <header className="pbl-topbar"><div className="pbl-topbar-inner"><button className="pbl-brand" onClick={() => navigate("/")} aria-label="PBL Virtual — início"><span className="pbl-brand-mark"><GraduationCap className="h-4 w-4" /></span><span>PBL Virtual</span></button><div className="pbl-topbar-actions"><span className="pbl-status-dot"><i aria-hidden="true" /> Detalhe da ferramenta</span><button className="pbl-home-button" onClick={() => navigate("/como-funciona#ferramentas")}>Voltar ao guia</button><button className="pbl-print-button" onClick={() => window.print()}>Imprimir página</button></div></div></header>

    <main id="pbl-tool-content">
      <section className="pbl-hero"><div className="pbl-hero-inner"><button className="pbl-detail-back" onClick={() => navigate("/como-funciona#ferramentas")}><ArrowLeft className="h-4 w-4" /> Ferramentas da sala</button><div className="pbl-tool-hero-grid"><div><div className="pbl-eyebrow">{tool.eyebrow}</div><h1>{tool.title}</h1><p className="pbl-hero-lead">{tool.description}</p></div><div className={`pbl-tool-hero-icon ${tool.tone}`}><Icon className="h-12 w-12" /></div></div><div className="pbl-hero-grid"><div className="pbl-hero-callout"><span className="pbl-callout-kicker">Em uma frase</span><strong>{tool.summary}</strong><span>{tool.access}</span></div><div className="pbl-hero-stats" aria-label="Resumo da ferramenta"><div><b>01</b><span>objetivo principal</span></div><div><b>02</b><span>perfis orientados</span></div><div><b>03</b><span>formas de usar</span></div></div></div></div></section>

      <div className="pbl-page-shell"><aside className="pbl-side-nav" aria-label="Navegação desta página"><div className="pbl-side-nav-title">Nesta página</div><nav><a href="#visao-geral">Visão geral</a><a href="#aluno">Como o aluno usa</a><a href="#professor">Como o professor usa</a><a href="#boas-praticas">Boas práticas</a><a href="#relacionadas">Ferramentas relacionadas</a></nav><div className="pbl-side-tip"><span aria-hidden="true">⌁</span><p>Volte ao guia principal a qualquer momento para trocar de ferramenta.</p></div></aside>

        <div className="pbl-content-column">
          <section className="pbl-content-section" id="visao-geral"><div className="pbl-section-heading"><span className={`pbl-section-number ${tool.tone}`}>01</span><div><div className="pbl-eyebrow">Visão geral</div><h2>Para que serve {tool.title.toLowerCase()}?</h2></div></div><p>{tool.description} Nesta página, você encontra o caminho completo para usar o recurso sem perder a lógica da sessão PBL.</p><div className="pbl-tool-meta-grid"><div><span className="pbl-tool-meta-icon"><Icon className="h-4 w-4" /></span><strong>Quando usar</strong><p>Use durante o passo em que a turma precisa tornar o pensamento, a evidência ou o ritmo do trabalho visível.</p></div><div><span className="pbl-tool-meta-icon"><ShieldCheck className="h-4 w-4" /></span><strong>Quem acessa</strong><p>{tool.access}</p></div><div><span className="pbl-tool-meta-icon"><CheckCircle2 className="h-4 w-4" /></span><strong>O que fica registrado</strong><p>As ações e contribuições da ferramenta permanecem ligadas à sala e ajudam a compor a ata ou o relatório.</p></div></div><ToolScreen screen={tool.screen} caption={`Esta é uma representação da área de ${tool.title.toLowerCase()} dentro da sala PBL.`} /></section>

          <section className="pbl-content-section" id="aluno"><div className="pbl-section-heading"><span className="pbl-section-number blue">02</span><div><div className="pbl-eyebrow">Trilha do aluno</div><h2>Como usar a ferramenta durante a sessão</h2></div></div><p>O aluno deve usar o recurso para contribuir com o grupo, não para trabalhar isoladamente. Siga a etapa liberada pelo professor e conecte cada registro ao caso discutido.</p><ToolSteps items={tool.studentSteps} /><div className="pbl-notice pbl-notice-blue"><span className="pbl-notice-icon">i</span><div><strong>O registro precisa ajudar o grupo</strong><p>Antes de enviar, pergunte: esta mensagem, nota, referência ou conexão ajuda alguém a compreender o problema ou tomar uma decisão?</p></div></div></section>

          <section className="pbl-content-section" id="professor"><div className="pbl-section-heading"><span className="pbl-section-number green">03</span><div><div className="pbl-eyebrow">Trilha do professor</div><h2>Como conduzir e acompanhar o recurso</h2></div></div><p>O professor configura as permissões e usa os registros da ferramenta para mediar. A tecnologia organiza a evidência; a intervenção pedagógica continua sendo sua.</p><ToolSteps items={tool.professorSteps} /><div className="pbl-notice pbl-notice-green"><span className="pbl-notice-icon">✓</span><div><strong>Use o recurso para devolver perguntas</strong><p>Quando a turma ficar presa, olhe para o registro e faça uma pergunta que ajude os alunos a revisar, comparar ou justificar o próprio raciocínio.</p></div></div></section>

          <section className="pbl-content-section" id="boas-praticas"><div className="pbl-section-heading"><span className="pbl-section-number orange">04</span><div><div className="pbl-eyebrow">Qualidade do uso</div><h2>Boas práticas para {tool.title.toLowerCase()}</h2></div></div><p>O recurso funciona melhor quando o grupo combina uma regra simples de uso. Estas práticas ajudam a manter a sala clara, objetiva e útil para o fechamento.</p><div className="pbl-principles">{tool.bestPractices.map((practice) => <div key={practice}><b><Check className="mr-1 inline h-3.5 w-3.5 text-emerald-600" /> {practice}</b><span>Retome esta prática durante o passo em que a ferramenta estiver ativa.</span></div>)}</div><div className="pbl-end-note"><span aria-hidden="true"><Lightbulb className="h-5 w-5" /></span><p>Uma ferramenta é boa quando deixa o raciocínio mais claro para a próxima pessoa — colega, Relator ou professor.</p></div></section>

          <section className="pbl-content-section" id="relacionadas"><div className="pbl-section-heading"><span className="pbl-section-number dark">05</span><div><div className="pbl-eyebrow">Continue explorando</div><h2>Ferramentas que trabalham junto</h2></div></div><p>Na prática, uma boa sessão combina recursos. Escolha uma ferramenta relacionada para entender o próximo passo.</p><div className="pbl-related-grid">{relatedTools.map((related) => { if (!related) return null; const RelatedIcon = related.icon; return <button key={related.slug} className="pbl-related-card" onClick={() => navigate(`/como-funciona/ferramentas/${related.slug}`)}><span className={`pbl-tool-icon ${related.tone}` }><RelatedIcon className="h-4 w-4" /></span><span><strong>{related.title}</strong><small>{related.summary}</small></span><ArrowRight className="h-4 w-4" /></button>; })}</div><button className="pbl-detail-back pbl-detail-back-bottom" onClick={() => navigate("/como-funciona#ferramentas")}><ArrowLeft className="h-4 w-4" /> Voltar para todas as ferramentas</button></section>
        </div>
      </div>
    </main>
    <footer className="pbl-footer"><div><b>PBL Virtual</b><span>{tool.title}</span></div><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Voltar ao início <ArrowUpIcon /></button></footer>
  </div>;
}

function ArrowUpIcon() {
  return <span aria-hidden="true">↑</span>;
}
