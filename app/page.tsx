'use client';

import Link from 'next/link';
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
  source: 'google';
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
  { id: 'psicologia', label: 'Psicologia', icon: '◈', style: 'sereno, acolhedor, toms suaves e mídias editoriais', services: 'atendimento, especialidades, abordagem e agendamento' },
  { id: 'consultoria', label: 'Consultoria', icon: '▣', style: 'executivo, premium, arrojado e muito claro', services: 'serviços, diferenciais, autoridade e contato' },
  { id: 'lavanderia', label: 'Lavanderia', icon: '✧', style: 'limpo, funcional, organizado e visual moderno', services: 'serviços, prazos, agendamento e confiança' },
  { id: 'design', label: 'Design de interiores', icon: '▤', style: 'elegante, deslumbrante, sobriedade e materiais premium', services: 'projetos, estilo, portfólio e orçamento' },
  { id: 'seguradora', label: 'Seguros', icon: '▨', style: 'confiável, institucional, azul e branco com presença sólida', services: 'planos, proteção, atendimento e assessoria' },
  { id: 'hotel', label: 'Hotel', icon: '✺', style: 'hospitality premium, delicado, acolhedor e contemporâneo', services: 'acomodações, experiência, reservas e localização' },
  { id: 'auto', label: 'Auto Center', icon: '⟡', style: 'automotivo premium, grafite, metal e energia profissional', services: 'venda, manutenção, vistoria e atendimento' },
  { id: 'marketing', label: 'Agência de marketing', icon: '✹', style: 'moderno, estratégico, vibrante, claro e versátil', services: 'posicionamento, tráfego, branding e métricas' },
];

const aiRanking = [
  { rank: 1, name: 'Gemini', kind: 'Brief gerado no site', score: '9.8', color: '#4d8bff', reason: 'Cria o briefing detalhado para o perfil do cliente sem sair do painel.' },
  { rank: 2, name: 'Codex', kind: 'Implementação e refinamento', score: '9.4', color: '#5ecf8f', reason: 'Ótimo para transformar o prompt em código e arquitetura do site.' },
  { rank: 3, name: 'Cursor', kind: 'Fluxo de prototipagem', score: '9.2', color: '#b088ff', reason: 'Excelente para iterar no layout, conteúdo e ajustes finais do projeto.' },
  { rank: 4, name: 'Claude', kind: 'Refino e estratégia', score: '9.1', color: '#d39a72', reason: 'Bom para revisão textual, UX e refinamento do material gerado.' },
  { rank: 5, name: 'ChatGPT', kind: 'Copy e roteiro', score: '9.0', color: '#6fd1ff', reason: 'Excelente para ajustar headline, copy e estrutura textual da landing page.' },
  { rank: 6, name: 'OpenAI', kind: 'Versão premium', score: '8.9', color: '#7ee0a4', reason: 'Útil para refinar proposta, CTAs e posicionamento final da marca.' },
];

function getProfessionSpecificStrategy(profession: Profession) {
  const key = profession.id.toLowerCase();
  const strategies: Record<string, string> = {
    barbearia: 'Foque em distinção masculina, precisão de corte, barba, ambiente elegante, confiança e agendamento premium.',
    imobiliaria: 'Foque em imóveis de alto padrão, localização, valor, compra e locação com comunicação de confiança e status.',
    estetica: 'Foque em bem-estar, transformação, estética, acolhimento, tratamentos e sensação de cuidado premium.',
    odontologia: 'Foque em confiança clínica, conforto, saúde bucal, estética e atendimento de alto padrão.',
    advocacia: 'Foque em autoridade, sigilo, expertise jurídica, estratégia e atendimento sério e confiável.',
    restaurante: 'Foque em gastronomia, experiência sensorial, ambiente, reservas, serviço premium e marca memorável.',
    academia: 'Foque em performance, resultado, disciplina, energia, estrutura e transformação corporal.',
    petshop: 'Foque em cuidado animal, confiança, banho e tosa, bem-estar e atendimento amigável.',
    beleza: 'Foque em autoestima, imagem pessoal, beleza, cuidado premium e agenda de serviços.',
    contabilidade: 'Foque em organização, segurança financeira, clareza fiscal, confiança e gestão eficiente.',
    oficina: 'Foque em confiança técnica, manutenção, diagnóstico, qualidade de serviço e transparência.',
    fotografia: 'Foque em memória, estética, emoção, portfólio e valor de registrar momentos de alto nível.',
    psicologia: 'Foque em acolhimento, cuidado emocional, clareza e sentimento de segurança no processo terapêutico.',
    consultoria: 'Foque em estratégia, clareza, autoridade, soluções e projeção de crescimento.',
    lavanderia: 'Foque em praticidade, higiene, conveniência, rapidez e confiança no cuidado de roupas.',
    design: 'Foque em espaço, beleza, luxo discreto, funcionalidade e transformação emocional do ambiente.',
    seguradora: 'Foque em proteção, tranquilidade, clareza e confiança em decisões importantes.',
    hotel: 'Foque em hospitalidade, conforto, experiência memorável, categoria premium e acolhimento.',
    auto: 'Foque em confiança automotiva, manutenção, diagnóstico e qualidade de atendimento profissional.',
    marketing: 'Foque em crescimento, presença digital, autoridade, performance e posicionamento de marca.',
  };

  return strategies[key] || `Foque em diferenciais reais do setor, autoridade local, muito clareza e experiência premium para ${profession.label}.`;
}

function buildPrompt(lead: Lead | null, profession: Profession, city: string, uf: string) {
  const business = lead?.name ?? `uma ${profession.label.toLowerCase()} em ${city}`;
  const proof = lead ? `${lead.rating.toFixed(1)} estrelas e ${lead.reviewCount.toLocaleString('pt-BR')} avaliações públicas` : 'boa reputação local';
  const contact = lead?.phone ? `Telefone público para contato: ${lead.phone}.` : 'Telefone ainda não informado.';
  const professionStrategy = getProfessionSpecificStrategy(profession);

  return `Crie um site premium de nível Aether1 para ${business}, uma empresa de ${profession.label} em ${city}/${uf}. A referência visual é uma marca premium de alto padrão: sofisticada, moderna, editorial, discreta, tecnológica, cinematográfica e extremamente refinada. O objetivo é transmitir prestígio imediato, confiança, exclusividade e alta conversão local.

ESTRATÉGIA ESPECÍFICA DO NEGÓCIO
${professionStrategy}

OBJETIVO E POSICIONAMENTO
- Posicionar ${business} como a opção premium e mais confiável do mercado local.
- Fazer o visitante sentir que está diante de uma marca de alto nível, não de um prestador genérico.
- Transformar acesso em contato, agendamento ou orçamento com um storytelling premium e uma experiência sem ruído.
- Usar apenas informações reais: ${proof}. ${contact}
- Não inventar depoimentos, prêmios, números, certificações, especialistas ou benefícios que não tenham suporte factual.

DIREÇÃO VISUAL
Visual ${profession.style}. O site deve parecer um produto premium de marca, não um template comum. Use:
- paleta premium e refinada, com contraste elegante e muita clareza visual;
- muita whitespace, tipografia forte e editorial, microinterações discretas;
- pouca decoração, muito impacto, sensação de luxo sem exagero;
- composição visual que remeta a marcas de alta categoria e produto premium;
- estética minimalista, intensa, sofisticada e tecnológica, com acabamento impecável.

ESTRUTURA DA LANDING PAGE
1. Hero cinematográfico: frase principal forte, proposta de valor premium, localização clara e CTA refinado como “Falar com a equipe” ou “Solicitar atendimento”.
2. Seção de reputação e prova social local com avaliação real, comentários relevantes e contexto de confiança.
3. Seção de ${profession.services} em layout premium, editorial e fácil de consumir.
4. Diferenciais e benefícios em visão de marca: clareza, estratégia, experiência e valor percebido.
5. Processo em 3 passos simples, humanizados e pensados para reduzir objeções.
6. Seção de experiência/segurança/confiança com linguagem premium e muito objetiva.
7. FAQ elegante, direto às dúvidas mais comuns dos clientes locais.
8. CTA final sofisticado com mapa, endereço, contato e rodapé premium.

COPY E COMUNICAÇÃO
- Texto em português do Brasil, premium, direto, inteligente e memorável.
- Linguagem aspiracional, clara e sofisticada, sem clichês ou promessas vazias.
- Frases fortes, curtas e impactantes, com sensação de autoridade e exclusividade.
- Falar como marca premium, não como escritório genérico.
- Descrever valor, clareza, atendimento e conforto com refinamento.
- A mensagem deve refletir exatamente o segmento de ${profession.label.toLowerCase()} e não parecer genérica para qualquer negócio.

REQUISITOS TÉCNICOS
- Mobile first, responsivo, veloz e acessível.
- SEO local para “${profession.label} em ${city}”.
- HTML semântico, navegação por teclado, contraste adequado e boa performance.
- CTA com telefone público real, sem inventar WhatsApp ou canal inexistente.
- Componentes reutilizáveis, código limpo, pronto para produção.
- Incluir metadados, Open Graph, favicon e microinterações discretas.
- Visual premium, aspiracional, sofisticado e extremamente bem acabado.

ENTREGA FINAL
Retorne a landing page pronta em estrutura, copy, seções, CTAs e direção visual premium, com nível de acabamento e sofisticação comparável ao visual de uma marca de alto padrão como Aether1, sem inventar informações. A proposta precisa refletir a realidade de ${profession.label.toLowerCase()} e não repetir a mesma mensagem para todos os negócios.

Formato de saída recomendado:
- Nome da marca
- Posicionamento premium
- Público-alvo
- Visual e estética
- Hero headline
- Seções com copy principal
- CTAs premium
- SEO local
- Regras de qualidade
- Resultado final esperado`; 
}

export default function Home() {
  const [professionId, setProfessionId] = useState('barbearia');
  const [stateId, setStateId] = useState('35');
  const [cities, setCities] = useState<CityOption[]>([]);
  const [city, setCity] = useState('São Paulo');
  const [minReviews, setMinReviews] = useState('30');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState('Os resultados serão consultados diretamente no Google Places.');
  const [mode, setMode] = useState<'idle' | 'blocked' | 'google'>('idle');
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [activeAi, setActiveAi] = useState('Gemini');
  const [generatedBrief, setGeneratedBrief] = useState('');
  const [promptLabel, setPromptLabel] = useState('Gemini');

  const state = useMemo(() => states.find((item) => String(item.id) === stateId) ?? states[24], [stateId]);
  const profession = useMemo(() => professions.find((item) => item.id === professionId) ?? professions[0], [professionId]);
  const prompt = useMemo(() => buildPrompt(selectedLead, profession, city, state.sigla), [selectedLead, profession, city, state.sigla]);
  const activePrompt = generatedBrief || prompt;

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
    setGeneratedBrief('');
    setPromptLabel('Gemini');
  }, [professionId, city, stateId]);

  async function searchLeads() {
    if (!city) return;
    setSearching(true);
    setMode('idle');
    setNotice('Analisando negócios sem site e ordenando por avaliações...');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profession: profession.label, city, state: state.nome, minReviews: Number(minReviews) }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMode(data.code === 'GOOGLE_PLACES_NOT_CONFIGURED' ? 'blocked' : 'idle');
        throw new Error(data.error || 'Não foi possível pesquisar.');
      }
      setLeads(data.leads);
      setSelectedLead(data.leads[0] ?? null);
      setMode(data.mode);
      setNotice(data.notice);
    } catch (error) {
      setLeads([]);
      setSelectedLead(null);
      setNotice(error instanceof Error ? error.message : 'Não foi possível pesquisar.');
    } finally {
      setSearching(false);
    }
  }

  async function generateIntegratedPrompt(provider = 'gemini') {
    const providerLabel = provider === 'gemini' ? 'Gemini' : provider === 'codex' ? 'Codex' : 'Cursor';
    setGeneratingPrompt(true);
    setPromptLabel(providerLabel);
    setNotice(`Gerando um briefing exclusivo com ${providerLabel}...`);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: selectedLead?.name ?? profession.label,
          segment: profession.label,
          audience: 'clientes locais que buscam atendimento rápido e confiável',
          objective: 'aumentar conversas, agendamentos e fechamento',
          tone: 'elegante',
          city,
          state: state.nome,
          leadName: selectedLead?.name,
          engine: provider,
        }),
      });
      const data = await response.json();
      const nextPrompt = data.prompt || prompt;
      setGeneratedBrief(nextPrompt);
      setNotice(data.notice || `Brief personalizado gerado diretamente no site com ${providerLabel}.`);
      setMode('google');
      return nextPrompt;
    } catch (error) {
      setGeneratedBrief(prompt);
      setNotice(error instanceof Error ? error.message : 'Não foi possível gerar o brief.');
      return prompt;
    } finally {
      setGeneratingPrompt(false);
    }
  }

  async function copyPromptFor(target: 'gemini' | 'cursor' | 'codex' = 'gemini') {
    const label = target === 'gemini' ? 'Gemini' : target === 'cursor' ? 'Cursor' : 'Codex';
    await navigator.clipboard.writeText(activePrompt);
    setCopied(true);
    setPromptLabel(label);
    setNotice(`Prompt copiado para ${label}. Cole no agente escolhido.`);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function copyPrompt() {
    await copyPromptFor(promptLabel.toLowerCase() === 'cursor' ? 'cursor' : promptLabel.toLowerCase() === 'codex' ? 'codex' : 'gemini');
  }

  async function copyPhone() {
    if (!selectedLead?.phone) return;
    await navigator.clipboard.writeText(selectedLead.phone);
    setCopiedPhone(true);
    window.setTimeout(() => setCopiedPhone(false), 1800);
  }

  return (
    <main className="app-shell">
      <aside className="rail">
        <div className="brand-mark" aria-label="Lead Studio">L</div>
        <nav className="rail-nav" aria-label="Navegação principal">
          <Link href="/dashboard" className="rail-button active" aria-label="Dashboard">⌁</Link>
          <Link href="/oportunidades" className="rail-button" aria-label="Oportunidades">◎</Link>
          <Link href="/briefs" className="rail-button" aria-label="Briefs">✦</Link>
          <Link href="/insights" className="rail-button" aria-label="Insights">□</Link>
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
          <p>Selecione uma profissão e uma cidade. O radar consulta empresas reais no Google, filtra quem não informa site e prepara o prompt para a melhor IA.</p>
        </section>

        <div className="insight-bar" aria-label="Resumo do fluxo">
          <div className="insight-pill"><span className="dot-success" /> Lead ativo: {selectedLead ? selectedLead.name : 'Nenhum selecionado'}</div>
          <div className="insight-pill"><span className="dot-neutral" /> Mercado: {profession.label}</div>
          <div className="insight-pill"><span className="dot-warning" /> Local: {city} / {state.sigla}</div>
        </div>

        <div className="dashboard-grid">
          <section className="filters-panel">
            <div className="panel-heading"><span>01</span><div><b>Defina a oportunidade</b><small>Profissão, região e reputação mínima</small></div></div>

            <label className="field-label">TIPO DE NEGÓCIO</label>
            <div className="profession-grid">
              {professions.map((item) => (
                <button
                  key={item.id}
                  className={professionId === item.id ? 'profession active' : 'profession'}
                  onClick={() => {
                    setProfessionId(item.id);
                    setGeneratedBrief(buildPrompt(selectedLead, item, city, state.sigla));
                    setPromptLabel('Gemini');
                    setNotice(`Prompt personalizado para ${item.label} gerado.`);
                  }}
                >
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
                <option value="20">20+ avaliações</option><option value="30">30+ avaliações</option>
                <option value="50">50+ avaliações</option><option value="100">100+ avaliações</option>
                <option value="250">250+ avaliações</option><option value="500">500+ avaliações</option>
              </select>
            </label>

            <div className="locked-filter"><span>✓</span><div><b>Somente negócios reais sem site</b><small>Google Places · chaves protegidas no servidor</small></div><i>ATIVO</i></div>
            <button className="search-button" onClick={searchLeads} disabled={searching || loadingCities}>{searching ? 'Pesquisando...' : 'Encontrar oportunidades'} <span>↗</span></button>
            <p className={`data-note ${mode === 'blocked' ? 'blocked' : ''}`}>{mode === 'google' && <b>DADOS REAIS · </b>}{notice}</p>
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
                  <span className="lead-main"><b>{lead.name}</b><small>{lead.address}</small><small className="phone-line">☎ {lead.phone}</small><i>SEM SITE</i></span>
                  <span className="rating"><b>{lead.rating.toFixed(1)} ★</b><small>{lead.reviewCount.toLocaleString('pt-BR')} avaliações</small></span>
                  <span className="select-arrow">›</span>
                </button>
              ))}
            </div>
            {selectedLead && (
              <div className="contact-bar">
                <span><small>TELEFONE PÚBLICO</small><b>{selectedLead.phone}</b></span>
                <button onClick={copyPhone}>{copiedPhone ? 'Copiado ✓' : 'Copiar número'}</button>
                <a href={`tel:${selectedLead.phone.replace(/[^\d+]/g, '')}`}>Ligar</a>
              </div>
            )}
          </section>

          <section className="ai-panel">
            <div className="panel-heading"><span>03</span><div><b>Escolha a IA</b><small>Gerar o briefing dentro do site</small></div></div>
            <div className="ranking-note">Agentes integrados no painel — sem sair da plataforma.</div>
            <div className="ai-list">
              {aiRanking.map((ai) => (
                <button
                  key={ai.name}
                  type="button"
                  className={activeAi === ai.name ? 'ai-row selected' : 'ai-row'}
                  onClick={async () => {
                    setActiveAi(ai.name);
                    const provider = ai.name.toLowerCase();
                    await generateIntegratedPrompt(
                      provider === 'gemini' ? 'gemini'
                      : provider === 'codex' ? 'codex'
                      : provider === 'cursor' ? 'cursor'
                      : provider === 'claude' ? 'openai'
                      : provider === 'chatgpt' ? 'openai'
                      : provider === 'openai' ? 'openai'
                      : 'gemini'
                    );
                  }}
                >
                  <span className="ai-rank">#{ai.rank}</span><span className="ai-logo" style={{ background: ai.color }}>{ai.name.charAt(0)}</span>
                  <span className="ai-info"><b>{ai.name}</b><small>{ai.kind}</small><em>{ai.reason}</em></span>
                  <span className="ai-score">{ai.score}<small>/10</small></span>
                </button>
              ))}
            </div>
          </section>

          <section className="prompt-panel">
            <div className="prompt-header">
              <div className="panel-heading"><span>04</span><div><b>Prompt premium automático</b><small>{selectedLead ? `Personalizado para ${selectedLead.name}` : 'Será personalizado com o lead selecionado'}</small></div></div>
              <div className="prompt-actions">
                <button type="button" onClick={() => generateIntegratedPrompt('gemini')} disabled={generatingPrompt}>{generatingPrompt ? 'Gerando...' : 'Gerar com Gemini'}</button>
                <button type="button" onClick={() => copyPromptFor('cursor')} className="ghost-button">Copiar para Cursor</button>
                <button type="button" onClick={() => copyPromptFor('codex')} className="ghost-button">Copiar para Codex</button>
                <button type="button" onClick={copyPrompt}>{copied ? 'Copiado ✓' : 'Copiar prompt'}</button>
              </div>
            </div>
            <div className="prompt-code">
              <div className="prompt-top"><span>prompt-site.md</span><i>{activePrompt.length.toLocaleString('pt-BR')} caracteres</i></div>
              <textarea className="prompt-editor" value={activePrompt} onChange={(event) => setGeneratedBrief(event.target.value)} aria-label="Prompt do site" />
            </div>
            <div className="prompt-footer"><span>✦ Gerado automaticamente</span><span>Sem inventar informações</span><span>Pronto para qualquer IA</span></div>
          </section>
        </div>
      </section>
    </main>
  );
}
