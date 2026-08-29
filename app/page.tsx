'use client';

import { useEffect, useMemo, useState } from 'react';

type StateOption = { id: number; sigla: string; nome: string };
type CityOption = { id: number; nome: string };
type Profession = { id: string; label: string; icon: string; style: string; services: string };
type Lead = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone: string;
  website: null;
  mapsUrl: string;
  source: 'google' | 'demo';
};

const states: StateOption[] = [
  { id: 12, sigla: 'AC', nome: 'Acre' }, { id: 27, sigla: 'AL', nome: 'Alagoas' },
  { id: 16, sigla: 'AP', nome: 'Amapá' }, { id: 13, sigla: 'AM', nome: 'Amazonas' },
  { id: 29, sigla: 'BA', nome: 'Bahia' }, { id: 23, sigla: 'CE', nome: 'Ceará' },
  { id: 53, sigla: 'DF', nome: 'Distrito Federal' }, { id: 32, sigla: 'ES', nome: 'Espírito Santo' },
  { id: 52, sigla: 'GO', nome: 'Goiás' }, { id: 21, sigla: 'MA', nome: 'Maranhão' },
  { id: 51, sigla: 'MT', nome: 'Mato Grosso' }, { id: 50, sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { id: 31, sigla: 'MG', nome: 'Minas Gerais' }, { id: 15, sigla: 'PA', nome: 'Pará' },
  { id: 25, sigla: 'PB', nome: 'Paraíba' }, { id: 41, sigla: 'PR', nome: 'Paraná' },
  { id: 26, sigla: 'PE', nome: 'Pernambuco' }, { id: 22, sigla: 'PI', nome: 'Piauí' },
  { id: 33, sigla: 'RJ', nome: 'Rio de Janeiro' }, { id: 24, sigla: 'RN', nome: 'Rio Grande do Norte' },
  { id: 43, sigla: 'RS', nome: 'Rio Grande do Sul' }, { id: 11, sigla: 'RO', nome: 'Rondônia' },
  { id: 14, sigla: 'RR', nome: 'Roraima' }, { id: 42, sigla: 'SC', nome: 'Santa Catarina' },
  { id: 35, sigla: 'SP', nome: 'São Paulo' }, { id: 28, sigla: 'SE', nome: 'Sergipe' },
  { id: 17, sigla: 'TO', nome: 'Tocantins' },
];

const professions: Profession[] = [
  { id: 'barbearia', label: 'Barbearia', icon: '✂', style: 'masculino sofisticado, editorial, grafite, creme e cobre', services: 'cortes, barba, tratamentos e agendamento' },
  { id: 'imobiliaria', label: 'Imobiliária', icon: '⌂', style: 'arquitetônico premium, muito espaço em branco, azul profundo e areia', services: 'imóveis em destaque, venda, locação e avaliação' },
  { id: 'estetica', label: 'Clínica de estética', icon: '✦', style: 'elegante, acolhedor, tons naturais e fotografia luminosa', services: 'procedimentos, benefícios, equipe e avaliação' },
  { id: 'odontologia', label: 'Odontologia', icon: '◌', style: 'clínico contemporâneo, branco, azul petróleo e formas suaves', services: 'especialidades, equipe, estrutura e consulta' },
  { id: 'advocacia', label: 'Advocacia', icon: '§', style: 'sóbrio, editorial, tipografia clássica e detalhes dourados discretos', services: 'áreas de atuação, equipe e atendimento confidencial' },
  { id: 'restaurante', label: 'Restaurante', icon: '◉', style: 'sensorial, fotografia grande, tipografia expressiva e cores quentes', services: 'cardápio, reservas, ambiente e localização' },
  { id: 'academia', label: 'Academia', icon: '↗', style: 'energético, contraste alto, preto, branco e verde vibrante', services: 'modalidades, planos, professores e aula experimental' },
  { id: 'petshop', label: 'Pet shop', icon: '♡', style: 'amigável, colorido sofisticado e ilustrações leves', services: 'banho e tosa, produtos, veterinária e agendamento' },
  { id: 'beleza', label: 'Salão de beleza', icon: '◇', style: 'fashion, delicado, editorial e sofisticado', services: 'cabelo, unhas, maquiagem e reservas' },
  { id: 'contabilidade', label: 'Contabilidade', icon: '▦', style: 'confiável, objetivo, azul marinho e verde discreto', services: 'abertura de empresa, fiscal, folha e consultoria' },
  { id: 'oficina', label: 'Oficina mecânica', icon: '⚙', style: 'industrial refinado, grafite, branco e laranja', services: 'revisão, manutenção, diagnóstico e orçamento' },
  { id: 'fotografia', label: 'Fotografia', icon: '□', style: 'portfólio minimalista, imagens imersivas e tipografia autoral', services: 'portfólio, ensaios, eventos e orçamento' },
];

const aiRanking = [
  { rank: 1, name: 'Lovable', kind: 'Site completo', score: '9.6', color: '#ff6b58', url: 'https://lovable.dev', reason: 'Mais direto para transformar um prompt em site visual e publicável.' },
  { rank: 2, name: 'Claude', kind: 'Código e refinamento', score: '9.3', color: '#d39a72', url: 'https://claude.ai', reason: 'Excelente para código, arquitetura e acabamento por etapas.' },
  { rank: 3, name: 'Kimi', kind: 'Agente de código', score: '8.8', color: '#6f7cff', url: 'https://www.kimi.com', reason: 'Bom contexto longo e execução de tarefas de desenvolvimento.' },
  { rank: 4, name: 'DeepSeek', kind: 'Custo e controle', score: '8.4', color: '#4b8cff', url: 'https://chat.deepseek.com', reason: 'Boa opção econômica para gerar e revisar código.' },
];

function buildPrompt(lead: Lead | null, profession: Profession, city: string, uf: string) {
  const business = lead?.name ?? `uma ${profession.label.toLowerCase()} em ${city}`;
  const proof = lead ? `${lead.rating.toFixed(1)} estrelas e ${lead.reviewCount.toLocaleString('pt-BR')} avaliações públicas` : 'boa reputação local';
  return `Crie um site completo, premium e altamente profissional para ${business}, uma empresa de ${profession.label} em ${city}/${uf}.

OBJETIVO
Transformar visitantes locais em contatos pelo WhatsApp e transmitir confiança imediatamente. A empresa ainda não possui site e já tem ${proof}. Use esse dado somente como prova social factual e não invente depoimentos, prêmios, preços, profissionais ou certificações.

DIREÇÃO VISUAL
Visual ${profession.style}. Evite aparência de template genérico, excesso de gradientes, cartões repetitivos e imagens artificiais. Use hierarquia tipográfica forte, espaçamento generoso, detalhes autorais, microinterações elegantes e fotografias coerentes com o negócio. O resultado deve parecer trabalho de uma agência de design premiada, mas continuar claro e fácil de usar.

ESTRUTURA
1. Hero impactante com promessa específica, localização e CTA “Falar no WhatsApp”.
2. Barra de confiança usando a avaliação pública informada.
3. Seção de ${profession.services}.
4. Diferenciais com textos concretos, sem promessas falsas.
5. Galeria visual e seção sobre a empresa com conteúdo editável.
6. Como funciona em três passos.
7. FAQ voltado às dúvidas reais de clientes locais.
8. CTA final, mapa/localização e rodapé completo.

REQUISITOS
- Mobile first, responsivo, rápido e acessível.
- SEO local para “${profession.label} em ${city}”.
- HTML semântico, contraste adequado e navegação por teclado.
- Botões de WhatsApp com número em placeholder fácil de trocar.
- Textos em português do Brasil, humanos, específicos e sem clichês.
- Componentes reutilizáveis e código limpo, pronto para produção.
- Inclua metadados, favicon, Open Graph e estados de hover/foco.

Entregue o site inteiro com todas as seções, textos e acabamento visual. Quando faltar informação real, use um placeholder claramente identificado em vez de inventar.`;
}

export default function Home() {
  const [professionId, setProfessionId] = useState('barbearia');
  const [stateId, setStateId] = useState('35');
  const [cities, setCities] = useState<CityOption[]>([]);
  const [city, setCity] = useState('São Paulo');
  const [minReviews, setMinReviews] = useState('100');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState('Faça uma busca para encontrar oportunidades.');
  const [mode, setMode] = useState<'idle' | 'demo' | 'google'>('idle');
  const [copied, setCopied] = useState(false);

  const state = useMemo(() => states.find((item) => String(item.id) === stateId) ?? states[24], [stateId]);
  const profession = useMemo(() => professions.find((item) => item.id === professionId) ?? professions[0], [professionId]);
  const prompt = useMemo(() => buildPrompt(selectedLead, profession, city, state.sigla), [selectedLead, profession, city, state.sigla]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingCities(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios?orderBy=nome`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: CityOption[]) => {
        setCities(data);
        setCity((current) => data.some((item) => item.nome === current) ? current : (data[0]?.nome ?? ''));
      })
      .catch((error) => { if (error.name !== 'AbortError') setCities([]); })
      .finally(() => setLoadingCities(false));
    return () => controller.abort();
  }, [stateId]);

  useEffect(() => {
    setCopied(false);
  }, [prompt]);

  async function searchLeads() {
    if (!city) return;
    setSearching(true);
    setNotice('Analisando negócios sem site e ordenando por avaliações...');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profession: profession.label, city, state: state.nome, minReviews: Number(minReviews) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível pesquisar.');
      setLeads(data.leads);
      setSelectedLead(data.leads[0] ?? null);
      setMode(data.mode);
      setNotice(data.notice);
    } catch (error) {
      setLeads([]);
      setSelectedLead(null);
      setMode('idle');
      setNotice(error instanceof Error ? error.message : 'Não foi possível pesquisar.');
    } finally {
      setSearching(false);
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="app-shell">
      <aside className="rail">
        <div className="brand-mark" aria-label="Lead Studio">L</div>
        <nav className="rail-nav" aria-label="Navegação principal">
          <button className="rail-button active" aria-label="Radar">⌁</button>
          <button className="rail-button" aria-label="Leads">◎</button>
          <button className="rail-button" aria-label="Prompts">✦</button>
          <button className="rail-button" aria-label="Projetos">□</button>
        </nav>
        <div className="rail-status" title="Sistema online"><i /></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <div className="eyebrow"><span className="live-dot" /> RADAR DE OPORTUNIDADES</div>
            <h1>Lead Studio <span>/ negócios sem site</span></h1>
          </div>
          <div className="header-metric"><b>{leads.length}</b><span>leads filtrados</span></div>
        </header>

        <section className="intro">
          <div>
            <span className="kicker">PROSPECÇÃO + CRIAÇÃO</span>
            <h2>Encontre o negócio certo.<br /><em>Crie o site perfeito.</em></h2>
          </div>
          <p>Selecione uma profissão e uma cidade. O radar prioriza empresas sem site com muitas avaliações e prepara o prompt para a melhor IA.</p>
        </section>

        <div className="dashboard-grid">
          <section className="filters-panel">
            <div className="panel-heading"><span>01</span><div><b>Defina a oportunidade</b><small>Profissão, região e reputação mínima</small></div></div>

            <label className="field-label">TIPO DE NEGÓCIO</label>
            <div className="profession-grid">
              {professions.map((item) => (
                <button key={item.id} className={professionId === item.id ? 'profession active' : 'profession'} onClick={() => setProfessionId(item.id)}>
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}
            </div>

            <div className="location-fields">
              <label>Estado
                <select value={stateId} onChange={(event) => setStateId(event.target.value)}>
                  {states.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
              </label>
              <label>Cidade
                <select value={city} onChange={(event) => setCity(event.target.value)} disabled={loadingCities}>
                  {loadingCities && <option>Carregando...</option>}
                  {!loadingCities && cities.map((item) => <option key={item.id} value={item.nome}>{item.nome}</option>)}
                </select>
              </label>
            </div>

            <label className="review-field">Mínimo de avaliações
              <select value={minReviews} onChange={(event) => setMinReviews(event.target.value)}>
                <option value="50">50+ avaliações</option><option value="100">100+ avaliações</option>
                <option value="250">250+ avaliações</option><option value="500">500+ avaliações</option>
              </select>
            </label>

            <div className="locked-filter"><span>✓</span><div><b>Somente negócios sem site</b><small>Filtro obrigatório para oportunidades reais</small></div><i>ATIVO</i></div>
            <button className="search-button" onClick={searchLeads} disabled={searching || loadingCities}>{searching ? 'Pesquisando...' : 'Encontrar oportunidades'} <span>↗</span></button>
            <p className="data-note">{mode === 'demo' && <b>MODO DEMONSTRAÇÃO · </b>}{notice}</p>
          </section>

          <section className="leads-panel">
            <div className="panel-heading leads-heading"><span>02</span><div><b>Melhores oportunidades</b><small>Da maior para a menor quantidade de avaliações</small></div><div className="sort-chip">↓ AVALIAÇÕES</div></div>
            <div className="lead-list">
              {!leads.length && !searching && (
                <div className="empty-state"><div>⌁</div><b>Seu radar está pronto</b><p>Escolha os filtros e inicie uma busca.</p></div>
              )}
              {searching && <div className="empty-state"><div className="spinner" /><b>Buscando oportunidades</b><p>Verificando reputação e presença digital.</p></div>}
              {!searching && leads.map((lead, index) => (
                <button key={lead.id} className={selectedLead?.id === lead.id ? 'lead-row selected' : 'lead-row'} onClick={() => setSelectedLead(lead)}>
                  <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="lead-main"><b>{lead.name}</b><small>{lead.address}</small><i>SEM SITE</i></span>
                  <span className="rating"><b>{lead.rating.toFixed(1)} ★</b><small>{lead.reviewCount.toLocaleString('pt-BR')} avaliações</small></span>
                  <span className="select-arrow">›</span>
                </button>
              ))}
            </div>
          </section>

          <section className="ai-panel">
            <div className="panel-heading"><span>03</span><div><b>Escolha a IA</b><small>Ranking para criar um site bonito</small></div></div>
            <div className="ranking-note">Ranking editorial para este fluxo — não é uma comparação universal.</div>
            <div className="ai-list">
              {aiRanking.map((ai) => (
                <a key={ai.name} href={ai.url} target="_blank" rel="noreferrer" className="ai-row">
                  <span className="ai-rank">#{ai.rank}</span><span className="ai-logo" style={{ background: ai.color }}>{ai.name.charAt(0)}</span>
                  <span className="ai-info"><b>{ai.name}</b><small>{ai.kind}</small><em>{ai.reason}</em></span>
                  <span className="ai-score">{ai.score}<small>/10</small></span>
                </a>
              ))}
            </div>
          </section>

          <section className="prompt-panel">
            <div className="prompt-header">
              <div className="panel-heading"><span>04</span><div><b>Prompt premium automático</b><small>{selectedLead ? `Personalizado para ${selectedLead.name}` : 'Será personalizado com o lead selecionado'}</small></div></div>
              <button onClick={copyPrompt}>{copied ? 'Copiado ✓' : 'Copiar prompt'}</button>
            </div>
            <div className="prompt-code">
              <div className="prompt-top"><span>prompt-site.md</span><i>{prompt.length.toLocaleString('pt-BR')} caracteres</i></div>
              <pre>{prompt}</pre>
            </div>
            <div className="prompt-footer"><span>✦ Gerado automaticamente</span><span>Sem inventar informações</span><span>Pronto para qualquer IA</span></div>
          </section>
        </div>
      </section>
    </main>
  );
}
